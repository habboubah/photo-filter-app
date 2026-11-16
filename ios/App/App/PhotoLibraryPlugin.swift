import Foundation
import UIKit
import Photos
// presentLimitedLibraryPicker (addMorePhotos) is declared in PhotosUI, not Photos.
import PhotosUI
import Vision
import CryptoKit
import Capacitor

/// The app's own bridge view controller, so it can register our own plugins.
/// SceneDelegate makes it the window's root; the UIScene setup is otherwise
/// the shopping list's, unchanged (CLAUDE.md, "Native iOS").
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(PhotoLibraryPlugin())
        bridge?.registerPluginInstance(PurchasesPlugin())
    }
}

/// The iPhone's side of src/native/photoLibrary.ts — the counterpart of
/// PhotoLibraryPlugin.kt:
///
/// - access: PhotoKit, full or limited ("selected photos"), with the system's
///   picker to add more (presentLimitedLibraryPicker).
/// - the scan: every image asset diffed against the SQLite cache (ScanStore) by
///   its modification date; new and changed photos analysed off the main
///   thread, a batch at a time, newest first, with progress events. Only local
///   pictures are looked at: an iCloud-only original is never downloaded.
/// - faces (on demand, for a similar group): Vision's face capture quality and
///   how open the eyes are, from the face landmarks.
/// - thumbnails: PHImageManager, written to the cache folder under a size cap.
/// - albums: a real album in Photos (PHAssetCollectionChangeRequest). The
///   photos stay where they are; an album only points at them.
/// - deleting: PHAssetChangeRequest.deleteAssets — the system's own dialog,
///   then Recently Deleted.
/// - the user's decisions: a JSON file in Application Support (not the web
///   view's localStorage, which iOS may clear when the phone runs short of space).
///
/// Every write to the photo library honours `dryRun`: nothing is written, the
/// answer says what would have happened.
@objc(PhotoLibraryPlugin)
public class PhotoLibraryPlugin: CAPPlugin, CAPBridgedPlugin, PHPhotoLibraryChangeObserver {
    public let identifier = "PhotoLibraryPlugin"
    public let jsName = "PhotoLibrary"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getAccess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAccess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "addMorePhotos", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openSettings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startScan", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelScan", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getScanState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getFacts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scoreFaces", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "thumbnail", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "createAlbum", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "trash", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearCache", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isDebug", returnType: CAPPluginReturnPromise),
    ]

    /// The scan and every database access: one serial queue.
    private let queue = DispatchQueue(label: "com.habboubah.fotonest.scan", qos: .utility)
    /// Thumbnails, apart from the scan so a running scan never holds the screens up.
    private let io = DispatchQueue(label: "com.habboubah.fotonest.io", qos: .userInitiated, attributes: .concurrent)
    private var store: ScanStore?
    private var running = false
    private var cancelled = false
    private var observing = false
    private var changeTimer: DispatchWorkItem?
    private var thumbWrites = 0

    private static let batch = 48
    private static let thumbCap: Int64 = 200 * 1024 * 1024
    private static let lastScanKey = "lastScanAt"

    override public func load() {
        store = try? ScanStore()
        startObserving()
    }

    deinit {
        if observing { PHPhotoLibrary.shared().unregisterChangeObserver(self) }
    }

    /* ------------------------------------------------------------- access */

    private func accessName(_ status: PHAuthorizationStatus) -> String {
        switch status {
        case .authorized: return "full"
        case .limited: return "limited"
        case .denied: return "denied"
        case .restricted: return "restricted"
        case .notDetermined: return "notDetermined"
        @unknown default: return "denied"
        }
    }

    private var status: PHAuthorizationStatus { PHPhotoLibrary.authorizationStatus(for: .readWrite) }
    private var hasAccess: Bool { status == .authorized || status == .limited }

    /// The change observer is registered only once the app may see photos (registering earlier would ask).
    private func startObserving() {
        guard hasAccess, !observing else { return }
        observing = true
        PHPhotoLibrary.shared().register(self)
    }

    @objc func getAccess(_ call: CAPPluginCall) {
        call.resolve(["access": accessName(status)])
    }

    @objc func requestAccess(_ call: CAPPluginCall) {
        PHPhotoLibrary.requestAuthorization(for: .readWrite) { [weak self] s in
            guard let self else { return }
            self.startObserving()
            call.resolve(["access": self.accessName(s)])
        }
    }

    @objc func addMorePhotos(_ call: CAPPluginCall) {
        guard status == .limited else { call.resolve(["access": accessName(status)]); return }
        DispatchQueue.main.async { [weak self] in
            guard let self, let vc = self.bridge?.viewController else { call.resolve(["access": "limited"]); return }
            PHPhotoLibrary.shared().presentLimitedLibraryPicker(from: vc) { _ in
                call.resolve(["access": self.accessName(self.status)])
            }
        }
    }

    @objc func openSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
            call.resolve()
        }
    }

    @objc func isDebug(_ call: CAPPluginCall) {
        #if DEBUG
        call.resolve(["debug": true])
        #else
        call.resolve(["debug": false])
        #endif
    }

    public func photoLibraryDidChange(_ changeInstance: PHChange) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.changeTimer?.cancel()
            let work = DispatchWorkItem { [weak self] in self?.notifyListeners("libraryChanged", data: [:]) }
            self.changeTimer = work
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5, execute: work)
        }
    }

    /* --------------------------------------------------------------- scan */

    private func scanState() -> [String: Any] {
        [
            "running": running,
            "count": store?.count() ?? 0,
            "pending": store?.pendingCount() ?? 0,
            "lastScanAt": Int64(store?.meta(Self.lastScanKey) ?? "0") ?? 0,
        ]
    }

    private func emit(_ event: String, _ data: [String: Any]) {
        DispatchQueue.main.async { [weak self] in self?.notifyListeners(event, data: data) }
    }

    @objc func getScanState(_ call: CAPPluginCall) {
        queue.async { [weak self] in call.resolve(self?.scanState() ?? [:]) }
    }

    @objc func startScan(_ call: CAPPluginCall) {
        call.resolve()
        guard hasAccess else { return }
        startObserving()
        queue.async { [weak self] in self?.scan() }
    }

    @objc func cancelScan(_ call: CAPPluginCall) {
        cancelled = true
        call.resolve()
    }

    private func scan() {
        guard let store, !running else { return }
        running = true
        cancelled = false
        defer {
            running = false
            emit("scanDone", scanState())
        }
        listPhotos(store)
        analyse(store)
        if !cancelled { store.setMeta(Self.lastScanKey, String(Int64(Date().timeIntervalSince1970 * 1000))) }
    }

    /// An estimate of the file's size from its pixels — PhotoKit has no public file size. Shown with "≈".
    private func estimatedBytes(_ w: Int, _ h: Int, screenshot: Bool) -> Int64 {
        Int64(Double(w * h) * (screenshot ? 0.5 : 0.2))
    }

    /// Phase 1: every image asset against the cache. New and changed ones are stored with fv = 0, gone ones dropped.
    private func listPhotos(_ store: ScanStore) {
        let known = store.stamps()
        let assets = PHAsset.fetchAssets(with: .image, options: nil)
        let total = assets.count
        var seen = Set<String>(minimumCapacity: total)
        var changed: [ScanStore.Meta] = []
        assets.enumerateObjects { [weak self] asset, i, stop in
            guard let self else { stop.pointee = true; return }
            if self.cancelled { stop.pointee = true; return }
            let id = asset.localIdentifier
            seen.insert(id)
            let stampDate = asset.modificationDate ?? asset.creationDate ?? Date(timeIntervalSince1970: 0)
            let stamp = Int64(stampDate.timeIntervalSince1970 * 1000)
            if known[id] != stamp {
                let taken = asset.creationDate ?? stampDate
                var lat: Double?
                var lon: Double?
                if let c = asset.location?.coordinate, CLLocationCoordinate2DIsValid(c), c.latitude != 0 || c.longitude != 0 {
                    lat = c.latitude
                    lon = c.longitude
                }
                let shot = asset.mediaSubtypes.contains(.photoScreenshot)
                changed.append(ScanStore.Meta(
                    id: id, t: Int64(taken.timeIntervalSince1970 * 1000), stamp: stamp, lat: lat, lon: lon,
                    bytes: self.estimatedBytes(asset.pixelWidth, asset.pixelHeight, screenshot: shot),
                    w: Int64(asset.pixelWidth), h: Int64(asset.pixelHeight), fav: asset.isFavorite, shot: shot
                ))
                if changed.count >= 1000 { store.upsert(changed); changed.removeAll(keepingCapacity: true) }
            }
            if i % 2000 == 0 { self.emit("scanProgress", ["phase": "list", "done": i, "total": total]) }
        }
        if cancelled { return }
        store.upsert(changed)
        store.delete(known.keys.filter { !seen.contains($0) })
        emit("scanProgress", ["phase": "list", "done": total, "total": total])
    }

    /// Phase 2: each photo still to analyse — the features of its 512-px grey copy, three at a time.
    private func analyse(_ store: ScanStore) {
        let total = store.pendingCount()
        guard total > 0 else { return }
        var done = 0
        emit("scanProgress", ["phase": "analyse", "done": 0, "total": total])
        while !cancelled {
            let ids = store.pending(limit: Self.batch)
            if ids.isEmpty { break }
            let fetched = PHAsset.fetchAssets(withLocalIdentifiers: ids, options: nil)
            var byId: [String: PHAsset] = [:]
            fetched.enumerateObjects { a, _, _ in byId[a.localIdentifier] = a }
            let lock = NSLock()
            var results: [(id: String, features: FeatureMath.Features?)] = []
            DispatchQueue.concurrentPerform(iterations: ids.count) { i in
                let id = ids[i]
                var features: FeatureMath.Features?
                autoreleasepool {
                    if let asset = byId[id], let g = self.greyImage(asset) { features = FeatureMath.features(g.grey, g.w, g.h) }
                }
                lock.lock(); results.append((id, features)); lock.unlock()
            }
            store.store(results)
            done += ids.count
            emit("scanProgress", ["phase": "analyse", "done": min(done, total), "total": total])
        }
    }

    private func requestImage(_ asset: PHAsset, size: CGSize, fast: Bool = false) -> UIImage? {
        let opts = PHImageRequestOptions()
        opts.isSynchronous = true
        opts.isNetworkAccessAllowed = false
        opts.deliveryMode = fast ? .fastFormat : .highQualityFormat
        opts.resizeMode = .fast
        var image: UIImage?
        PHImageManager.default().requestImage(for: asset, targetSize: size, contentMode: .aspectFit, options: opts) { img, _ in image = img }
        return image
    }

    /// The photo scaled to fit 512 × 512 and turned grey with the spec's integer weights; nil without a local copy.
    private func greyImage(_ asset: PHAsset) -> (w: Int, h: Int, grey: [UInt8])? {
        let fit = FeatureMath.fitSize(asset.pixelWidth, asset.pixelHeight)
        guard let cg = requestImage(asset, size: CGSize(width: fit.w, height: fit.h))?.cgImage else { return nil }
        let (w, h) = FeatureMath.fitSize(cg.width, cg.height)
        var rgba = [UInt8](repeating: 0, count: w * h * 4)
        let drawn: Bool = rgba.withUnsafeMutableBytes { buf in
            guard let ctx = CGContext(
                data: buf.baseAddress, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
                space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
            ) else { return false }
            ctx.interpolationQuality = .medium
            ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
            return true
        }
        guard drawn else { return nil }
        var grey = [UInt8](repeating: 0, count: w * h)
        for i in 0..<(w * h) {
            grey[i] = FeatureMath.grey(Int(rgba[i * 4]), Int(rgba[i * 4 + 1]), Int(rgba[i * 4 + 2]))
        }
        return (w, h, grey)
    }

    @objc func getFacts(_ call: CAPPluginCall) {
        let offset = max(0, call.getInt("offset") ?? 0)
        let limit = min(5000, max(1, call.getInt("limit") ?? 2000))
        io.async { [weak self] in
            guard let store = self?.store else { call.reject("No scan cache"); return }
            call.resolve(["rows": store.facts(offset: offset, limit: limit), "total": store.count()])
        }
    }

    /* -------------------------------------------------------------- faces */

    /// Faces and open eyes for a few photos (a similar group): Vision, on the device, cached.
    @objc func scoreFaces(_ call: CAPPluginCall) {
        let ids = (call.getArray("ids") as? [String] ?? []).prefix(60).map { $0 }
        queue.async { [weak self] in
            guard let self, let store = self.store else { call.resolve(["rows": []]); return }
            var rows = store.faces(ids)
            let missing = ids.filter { rows[$0] == nil }
            if !missing.isEmpty {
                let fetched = PHAsset.fetchAssets(withLocalIdentifiers: missing, options: nil)
                var scored: [(id: String, faces: Int, faceQ: Double?, eyes: Double?)] = []
                fetched.enumerateObjects { asset, _, _ in
                    autoreleasepool {
                        guard let image = self.requestImage(asset, size: CGSize(width: 1024, height: 1024)), let cg = image.cgImage else { return }
                        let s = self.faceScores(cg, orientation: CGImagePropertyOrientation(image.imageOrientation))
                        scored.append((asset.localIdentifier, s.faces, s.faceQ, s.eyes))
                    }
                }
                store.storeFaces(scored)
                for s in scored {
                    var row: [String: Any] = ["id": s.id, "faces": s.faces]
                    if let q = s.faceQ { row["faceQ"] = q }
                    if let e = s.eyes { row["eyes"] = e }
                    rows[s.id] = row
                }
            }
            call.resolve(["rows": Array(rows.values)])
        }
    }

    private func faceScores(_ cg: CGImage, orientation: CGImagePropertyOrientation) -> (faces: Int, faceQ: Double?, eyes: Double?) {
        let quality = VNDetectFaceCaptureQualityRequest()
        let landmarks = VNDetectFaceLandmarksRequest()
        let handler = VNImageRequestHandler(cgImage: cg, orientation: orientation, options: [:])
        do { try handler.perform([quality, landmarks]) } catch { return (0, nil, nil) }
        let faces = quality.results ?? []
        if faces.isEmpty { return (0, nil, nil) }
        let faceQ = faces.compactMap { $0.faceCaptureQuality.map(Double.init) }.max()
        // Eyes: the least open eye of all faces — one person blinking makes the shot worse.
        let w = Double(cg.width)
        let h = Double(cg.height)
        var eyes: Double?
        for face in landmarks.results ?? [] {
            for region in [face.landmarks?.leftEye, face.landmarks?.rightEye].compactMap({ $0 }) {
                let pts = region.normalizedPoints
                guard pts.count >= 4 else { continue }
                let xs = pts.map { Double($0.x) * face.boundingBox.width * w }
                let ys = pts.map { Double($0.y) * face.boundingBox.height * h }
                guard let minX = xs.min(), let maxX = xs.max(), let minY = ys.min(), let maxY = ys.max(), maxX > minX else { continue }
                // Height over width: about 0.3 for an open eye, under 0.15 for a closed one.
                let openness = min(1, max(0, ((maxY - minY) / (maxX - minX) - 0.12) / 0.18))
                eyes = min(eyes ?? 1, openness)
            }
        }
        return (faces.count, faceQ, eyes)
    }

    /* --------------------------------------------------------- thumbnails */

    private lazy var thumbDir: URL = {
        let dir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("fotonest/thumbs", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }()

    @objc func thumbnail(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else { call.reject("No id"); return }
        let size = min(2048, max(64, call.getInt("size") ?? 256))
        let digest = Insecure.SHA1.hash(data: Data(id.utf8)).map { String(format: "%02x", $0) }.joined()
        let file = thumbDir.appendingPathComponent("\(size)-\(digest).jpg")
        io.async { [weak self] in
            guard let self else { return }
            if FileManager.default.fileExists(atPath: file.path) {
                try? FileManager.default.setAttributes([.modificationDate: Date()], ofItemAtPath: file.path)
                call.resolve(["path": file.path])
                return
            }
            guard let asset = PHAsset.fetchAssets(withLocalIdentifiers: [id], options: nil).firstObject else { call.reject("Photo not found"); return }
            let target = CGSize(width: size, height: size)
            // A local copy only; without one (iCloud-only), the small preview Photos keeps on the phone.
            guard let image = self.requestImage(asset, size: target) ?? self.requestImage(asset, size: target, fast: true) else {
                call.reject("No local picture")
                return
            }
            // Drawn once more so the orientation is baked in (the web view must not have to turn it).
            let format = UIGraphicsImageRendererFormat.default()
            format.scale = 1
            let upright = UIGraphicsImageRenderer(size: image.size, format: format).image { _ in image.draw(in: CGRect(origin: .zero, size: image.size)) }
            guard let data = upright.jpegData(compressionQuality: 0.82) else { call.reject("Could not encode"); return }
            do {
                try data.write(to: file, options: .atomic)
                call.resolve(["path": file.path])
            } catch {
                call.reject("Could not write the thumbnail")
            }
            self.queue.async {
                self.thumbWrites += 1
                if self.thumbWrites % 50 == 0 { self.pruneThumbs() }
            }
        }
    }

    /// Keeps the thumbnails under the cap: the least recently used go first.
    private func pruneThumbs() {
        let keys: [URLResourceKey] = [.contentModificationDateKey, .fileSizeKey]
        guard let files = try? FileManager.default.contentsOfDirectory(at: thumbDir, includingPropertiesForKeys: keys) else { return }
        let items = files.compactMap { url -> (URL, Date, Int64)? in
            guard let v = try? url.resourceValues(forKeys: Set(keys)) else { return nil }
            return (url, v.contentModificationDate ?? .distantPast, Int64(v.fileSize ?? 0))
        }.sorted { $0.1 < $1.1 }
        var total = items.reduce(Int64(0)) { $0 + $1.2 }
        for (url, _, size) in items where total > Self.thumbCap * 8 / 10 {
            try? FileManager.default.removeItem(at: url)
            total -= size
        }
    }

    /* --------------------------------------------------- albums and trash */

    private func ids(_ call: CAPPluginCall) -> [String] {
        (call.getArray("ids") as? [String] ?? []).filter { !$0.isEmpty }
    }

    @objc func createAlbum(_ call: CAPPluginCall) {
        let title = String((call.getString("title") ?? "Fotonest").prefix(80))
        let list = ids(call)
        let dryRun = call.getBool("dryRun") ?? false
        if dryRun || list.isEmpty {
            call.resolve(["done": list.count, "cancelled": false, "dryRun": dryRun])
            return
        }
        let assets = PHAsset.fetchAssets(withLocalIdentifiers: list, options: nil)
        let count = assets.count
        PHPhotoLibrary.shared().performChanges({
            // A new album that points at the photos: nothing is copied or changed.
            let request = PHAssetCollectionChangeRequest.creationRequestForAssetCollection(withTitle: title)
            request.addAssets(assets)
        }) { ok, error in
            if ok {
                call.resolve(["done": count, "cancelled": false, "dryRun": false])
            } else if Self.isCancel(error) {
                call.resolve(["done": 0, "cancelled": true, "dryRun": false])
            } else {
                call.reject(error?.localizedDescription ?? "Could not create the album")
            }
        }
    }

    @objc func trash(_ call: CAPPluginCall) {
        let list = ids(call)
        let dryRun = call.getBool("dryRun") ?? false
        if dryRun || list.isEmpty {
            call.resolve(["trashed": list, "cancelled": false, "dryRun": dryRun])
            return
        }
        let assets = PHAsset.fetchAssets(withLocalIdentifiers: list, options: nil)
        var found: [String] = []
        assets.enumerateObjects { a, _, _ in found.append(a.localIdentifier) }
        // iOS asks in its own dialog; the photos go to Recently Deleted, from where the user can still get them back.
        PHPhotoLibrary.shared().performChanges({
            PHAssetChangeRequest.deleteAssets(assets)
        }) { [weak self] ok, error in
            if ok {
                self?.queue.async { self?.store?.delete(found) }
                call.resolve(["trashed": found, "cancelled": false, "dryRun": false])
            } else if Self.isCancel(error) {
                call.resolve(["trashed": [], "cancelled": true, "dryRun": false])
            } else {
                call.reject(error?.localizedDescription ?? "Could not delete")
            }
        }
    }

    /// "Don't Allow" in the system's dialog.
    private static func isCancel(_ error: Error?) -> Bool {
        guard let e = error as NSError? else { return false }
        return e.code == PHPhotosError.userCancelled.rawValue || e.code == NSUserCancelledError
    }

    /* ------------------------------------------------------------- state */

    private lazy var stateURL: URL = {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("fotonest", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("state.json")
    }()

    @objc func getState(_ call: CAPPluginCall) {
        if let data = try? Data(contentsOf: stateURL), let json = String(data: data, encoding: .utf8) {
            call.resolve(["json": json])
        } else {
            call.resolve(["json": NSNull()])
        }
    }

    @objc func setState(_ call: CAPPluginCall) {
        guard let json = call.getString("json"), json.utf8.count <= 4_000_000 else { call.reject("No state"); return }
        do {
            try Data(json.utf8).write(to: stateURL, options: .atomic)
            call.resolve()
        } catch {
            call.reject("Could not save")
        }
    }

    @objc func clearCache(_ call: CAPPluginCall) {
        cancelled = true
        queue.async { [weak self] in
            guard let self else { return }
            self.store?.clear()
            try? FileManager.default.removeItem(at: self.thumbDir)
            try? FileManager.default.createDirectory(at: self.thumbDir, withIntermediateDirectories: true)
            call.resolve()
        }
    }
}

private extension CGImagePropertyOrientation {
    init(_ o: UIImage.Orientation) {
        switch o {
        case .up: self = .up
        case .down: self = .down
        case .left: self = .left
        case .right: self = .right
        case .upMirrored: self = .upMirrored
        case .downMirrored: self = .downMirrored
        case .leftMirrored: self = .leftMirrored
        case .rightMirrored: self = .rightMirrored
        @unknown default: self = .up
        }
    }
}
