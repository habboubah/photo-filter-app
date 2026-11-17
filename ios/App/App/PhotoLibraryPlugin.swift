import Foundation
import UIKit
import Photos
// presentLimitedLibraryPicker (addMorePhotos) is declared in PhotosUI, not Photos.
import PhotosUI
import Vision
import AVFoundation
import AVKit
import WidgetKit
import CryptoKit
import ImageIO
import UniformTypeIdentifiers
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
/// - the on-device AI (docs/AI.md), a third phase of the scan: each analysed
///   photo through the shared image model (ImageEmbedder, ONNX Runtime) and,
///   on iOS 18+, Vision's aesthetics score — sixteen at a time, newest first,
///   paused while the phone runs hot. Nothing leaves the phone.
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
        CAPPluginMethod(name: "listAlbums", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "addToAlbums", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "preview", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "albumMembers", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "trash", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearCache", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isDebug", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getStorage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "convertLive", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "compressVideo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "compressPhotos", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setWidget", returnType: CAPPluginReturnPromise),
    ]

    /// The scan and every database access: one serial queue.
    private let queue = DispatchQueue(label: "com.habboubah.bildklar.scan", qos: .utility)
    /// Live Photos turned into stills and videos made smaller: one at a time, apart from the scan.
    private let work = DispatchQueue(label: "com.habboubah.bildklar.work", qos: .userInitiated)
    /// Thumbnails, apart from the scan so a running scan never holds the screens up.
    private let io = DispatchQueue(label: "com.habboubah.bildklar.io", qos: .userInitiated, attributes: .concurrent)
    private var store: ScanStore?
    private var running = false
    private var cancelled = false
    private var observing = false
    private var changeTimer: DispatchWorkItem?
    private var thumbWrites = 0

    private static let batch = 48
    /// Photos per AI batch (and per progress event): one picture at a time through the model, its threads do the rest.
    private static let aiBatch = 16
    /// Made on the scan queue the first time it is needed; nil when the model can't load (the AI's phase is then skipped).
    private var embedder: ImageEmbedder?
    private var embedderTried = false
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

    /// Free and total space, shown to the user (home card, quick clean,
    /// settings). "Important usage" is what Settings › General › iPhone
    /// Storage counts as free. Declared in PrivacyInfo.xcprivacy
    /// (NSPrivacyAccessedAPICategoryDiskSpace, reason 85F4.1: shown to the user).
    @objc func getStorage(_ call: CAPPluginCall) {
        let url = URL(fileURLWithPath: NSHomeDirectory())
        do {
            let values = try url.resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey, .volumeTotalCapacityKey])
            // JS numbers: a Double holds every byte count a phone has exactly.
            let free = Double(max(0, values.volumeAvailableCapacityForImportantUsage ?? 0))
            let total = Double(max(0, values.volumeTotalCapacity ?? 0))
            call.resolve(["free": free, "total": total])
        } catch {
            call.resolve(["free": 0.0, "total": 0.0])
        }
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
            "aiPending": store?.aiPendingCount() ?? 0,
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
        readFormats(store)
        analyse(store)
        analyseAI(store)
        if !cancelled { store.setMeta(Self.lastScanKey, String(Int64(Date().timeIntervalSince1970 * 1000))) }
    }

    /// An estimate of the file's size from its pixels — PhotoKit has no public file size. Shown with "≈".
    /// A Live Photo carries a short video as well (about 3 MB); a video about 0.4 bytes per pixel and second.
    private func estimatedBytes(_ asset: PHAsset, screenshot: Bool) -> Int64 {
        let pixels = Double(asset.pixelWidth * asset.pixelHeight)
        if asset.mediaType == .video { return max(100_000, Int64(pixels * 0.4 * asset.duration)) }
        let still = Int64(pixels * (screenshot ? 0.5 : 0.2))
        return asset.mediaSubtypes.contains(.photoLive) ? still + 3_000_000 : still
    }

    /// Every fetch sees each photo of a burst, not just the one Photos shows (the others still take space).
    private func fetchOptions() -> PHFetchOptions {
        let options = PHFetchOptions()
        options.includeAllBurstAssets = true
        return options
    }

    private func fetch(_ ids: [String]) -> PHFetchResult<PHAsset> {
        PHAsset.fetchAssets(withLocalIdentifiers: ids, options: fetchOptions())
    }

    /// A screen recording: iOS has no public subtype for it, but names its file RPReplay….
    private func isScreenRecording(_ asset: PHAsset) -> Bool {
        PHAssetResource.assetResources(for: asset).contains { $0.originalFilename.hasPrefix("RPReplay") }
    }

    /// Phase 1: every photo (every burst member too) and every video against the cache. New and changed ones are stored with fv = 0, gone ones dropped.
    private func listPhotos(_ store: ScanStore) {
        let known = store.stamps()
        let images = PHAsset.fetchAssets(with: .image, options: fetchOptions())
        let videos = PHAsset.fetchAssets(with: .video, options: nil)
        let total = images.count + videos.count
        var seen = Set<String>(minimumCapacity: total)
        var changed: [ScanStore.Meta] = []
        var n = 0
        let visit: (PHAsset, UnsafeMutablePointer<ObjCBool>) -> Void = { [weak self] asset, stop in
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
                let video = asset.mediaType == .video
                let shot = asset.mediaSubtypes.contains(.photoScreenshot)
                let picked = asset.burstSelectionTypes.contains(.userPick) || asset.burstSelectionTypes.contains(.autoPick)
                changed.append(ScanStore.Meta(
                    id: id, t: Int64(taken.timeIntervalSince1970 * 1000), stamp: stamp, lat: lat, lon: lon,
                    bytes: self.estimatedBytes(asset, screenshot: shot),
                    w: Int64(asset.pixelWidth), h: Int64(asset.pixelHeight), fav: asset.isFavorite, shot: shot,
                    video: video, dur: video ? Int64(asset.duration * 1000) : 0, rec: video && self.isScreenRecording(asset),
                    live: asset.mediaSubtypes.contains(.photoLive),
                    burst: asset.burstIdentifier, pick: asset.burstIdentifier != nil && picked
                ))
                if changed.count >= 1000 { store.upsert(changed); changed.removeAll(keepingCapacity: true) }
            }
            if n % 2000 == 0 { self.emit("scanProgress", ["phase": "list", "done": n, "total": total]) }
            n += 1
        }
        images.enumerateObjects { asset, _, stop in visit(asset, stop) }
        if !cancelled { videos.enumerateObjects { asset, _, stop in visit(asset, stop) } }
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
            let fetched = fetch(ids)
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

    /// Phase 3: the on-device AI over each analysed photo it has not seen (docs/AI.md). Stops for now when the phone gets
    /// hot (thermal state serious or worse) — the next scan goes on where this one stopped.
    /// Phase 1½ (scan schema 4): each photo's file format and whether it was edited, from its resources —
    /// metadata only, no picture is read, so photos cached before schema 4 are filled without analysing them again.
    private func readFormats(_ store: ScanStore) {
        while !cancelled {
            let ids = store.formatPending(limit: 500)
            if ids.isEmpty { break }
            var rows: [(id: String, fmt: String, edited: Bool)] = []
            var found = Set<String>()
            fetch(ids).enumerateObjects { asset, _, _ in
                let resources = PHAssetResource.assetResources(for: asset)
                // An edit leaves its instructions (adjustment data) and a rendered full-size picture next to the original.
                let edited = resources.contains { $0.type == .adjustmentData || $0.type == .fullSizePhoto }
                rows.append((asset.localIdentifier, Self.format(resources), edited))
                found.insert(asset.localIdentifier)
            }
            // Gone since the list was read: marked, so it isn't asked again (the next scan drops the row).
            for id in ids where !found.contains(id) { rows.append((id, "other", false)) }
            store.storeFormats(rows)
        }
    }

    /// The original's file format: raw (RAW, ProRAW, a RAW+JPEG pair), heic, jpeg, png or other.
    static func format(_ resources: [PHAssetResource]) -> String {
        let originals = resources.filter { $0.type == .photo || $0.type == .alternatePhoto }.map { $0.uniformTypeIdentifier.lowercased() }
        if originals.contains(where: { $0.contains("raw") || $0.contains("dng") }) { return "raw" }
        switch resources.first(where: { $0.type == .photo })?.uniformTypeIdentifier.lowercased() {
        case "public.jpeg": return "jpeg"
        case "public.heic", "public.heif": return "heic"
        case "public.png": return "png"
        default: return "other"
        }
    }

    private func analyseAI(_ store: ScanStore) {
        if !embedderTried {
            embedderTried = true
            embedder = try? ImageEmbedder()
        }
        guard let embedder else { return }
        let total = store.aiPendingCount()
        guard total > 0 else { return }
        var done = 0
        emit("scanProgress", ["phase": "ai", "done": 0, "total": total])
        while !cancelled {
            if ProcessInfo.processInfo.thermalState.rawValue >= ProcessInfo.ThermalState.serious.rawValue { break }
            let ids = store.aiPending(limit: Self.aiBatch)
            if ids.isEmpty { break }
            var byId: [String: PHAsset] = [:]
            fetch(ids).enumerateObjects { a, _, _ in byId[a.localIdentifier] = a }
            var results: [ScanStore.AIResult] = []
            for id in ids {
                if cancelled { break }
                autoreleasepool {
                    guard let asset = byId[id] else {
                        results.append(.init(id: id, scores: nil, aes: nil, util: nil))
                        return
                    }
                    let fit = FeatureMath.fitSize(asset.pixelWidth, asset.pixelHeight)
                    guard let image = requestImage(asset, size: CGSize(width: fit.w, height: fit.h)), let cg = image.cgImage else {
                        results.append(.init(id: id, scores: nil, aes: nil, util: nil))
                        return
                    }
                    // A video: only its poster frame's embedding (lookalike videos), no labels.
                    if asset.mediaType == .video {
                        results.append(.init(id: id, scores: nil, aes: nil, util: nil, emb: embedder.embed(cg).map(ImageEmbedder.packed)))
                        return
                    }
                    let vision = aesthetics(cg, orientation: CGImagePropertyOrientation(image.imageOrientation))
                    results.append(.init(id: id, scores: embedder.scores(cg), aes: vision?.aes, util: vision?.util))
                }
            }
            store.storeAI(results)
            done += results.count
            emit("scanProgress", ["phase": "ai", "done": min(done, total), "total": total])
        }
    }

    /// Vision's aesthetics score (−1 … 1) and "utility photo" flag — iOS 18+, not in the Simulator.
    private func aesthetics(_ cg: CGImage, orientation: CGImagePropertyOrientation) -> (aes: Double, util: Bool)? {
        guard #available(iOS 18.0, *) else { return nil }
        let request = VNCalculateImageAestheticsScoresRequest()
        let handler = VNImageRequestHandler(cgImage: cg, orientation: orientation, options: [:])
        guard (try? handler.perform([request])) != nil, let o = request.results?.first as? VNImageAestheticsScoresObservation else { return nil }
        return (Double(o.overallScore), o.isUtility)
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
                let fetched = self.fetch(missing)
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
        let dir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("bildklar/thumbs", isDirectory: true)
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
            guard let asset = self.fetch([id]).firstObject else { call.reject("Photo not found"); return }
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
        let title = String((call.getString("title") ?? "Bildklar").prefix(80))
        let list = ids(call)
        let dryRun = call.getBool("dryRun") ?? false
        if dryRun || list.isEmpty {
            call.resolve(["done": list.count, "cancelled": false, "dryRun": dryRun])
            return
        }
        let assets = fetch(list)
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

    /// A video played over the app (the review's play button), from the phone only — never downloaded from iCloud.
    @objc func preview(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), let asset = fetch([id]).firstObject, asset.mediaType == .video else {
            call.reject("No video")
            return
        }
        let options = PHVideoRequestOptions()
        options.isNetworkAccessAllowed = false
        options.deliveryMode = .automatic
        PHImageManager.default().requestAVAsset(forVideo: asset, options: options) { [weak self] avAsset, _, _ in
            DispatchQueue.main.async {
                guard let avAsset, let presenter = self?.bridge?.viewController else {
                    call.reject("The video is not on this iPhone")
                    return
                }
                let player = AVPlayerViewController()
                player.player = AVPlayer(playerItem: AVPlayerItem(asset: avAsset))
                presenter.present(player, animated: true) { player.player?.play() }
                call.resolve()
            }
        }
    }

    /// Photos filed into albums while swiping, in one change: added to an album the user has (`albumId`) or a
    /// new one (`title`). Adding only links a photo to the album — nothing is copied or moved.
    @objc func addToAlbums(_ call: CAPPluginCall) {
        let groups = (call.getArray("groups") as? [[String: Any]] ?? []).compactMap { g -> (albumId: String?, title: String?, ids: [String])? in
            let ids = (g["ids"] as? [String] ?? []).filter { !$0.isEmpty }
            let albumId = g["albumId"] as? String
            let title = (g["title"] as? String).map { String($0.prefix(80)) }
            return ids.isEmpty || (albumId == nil && (title ?? "").isEmpty) ? nil : (albumId, title, ids)
        }
        let dryRun = call.getBool("dryRun") ?? false
        let total = groups.reduce(0) { $0 + $1.ids.count }
        if dryRun || groups.isEmpty {
            call.resolve(["done": total, "cancelled": false, "dryRun": dryRun])
            return
        }
        var done = 0
        PHPhotoLibrary.shared().performChanges({ [weak self] in
            guard let self else { return }
            for g in groups {
                let assets = self.fetch(g.ids)
                if let albumId = g.albumId {
                    guard let album = PHAssetCollection.fetchAssetCollections(withLocalIdentifiers: [albumId], options: nil).firstObject,
                          album.canPerform(.addContent), let change = PHAssetCollectionChangeRequest(for: album) else { continue }
                    change.addAssets(assets)
                } else if let title = g.title {
                    PHAssetCollectionChangeRequest.creationRequestForAssetCollection(withTitle: title).addAssets(assets)
                }
                done += assets.count
            }
        }) { ok, error in
            if ok {
                call.resolve(["done": done, "cancelled": false, "dryRun": false])
            } else if Self.isCancel(error) {
                call.resolve(["done": 0, "cancelled": true, "dryRun": false])
            } else {
                call.reject(error?.localizedDescription ?? "Could not add to the albums")
            }
        }
    }

    /// The user's own albums (Settings › Geschützt): regular albums only — no smart albums, no shared ones.
    @objc func listAlbums(_ call: CAPPluginCall) {
        io.async { [weak self] in
            guard let self else { return }
            var out: [[String: Any]] = []
            let albums = PHAssetCollection.fetchAssetCollections(with: .album, subtype: .albumRegular, options: nil)
            albums.enumerateObjects { album, _, _ in
                let count = PHAsset.fetchAssets(in: album, options: self.fetchOptions()).count
                out.append(["id": album.localIdentifier, "title": album.localizedTitle ?? "", "count": count])
            }
            call.resolve(["albums": out])
        }
    }

    /// The photos in these albums, each once (asked once per load, for the protected albums only).
    @objc func albumMembers(_ call: CAPPluginCall) {
        let list = ids(call)
        io.async { [weak self] in
            guard let self else { return }
            var seen = Set<String>()
            var out: [String] = []
            let albums = PHAssetCollection.fetchAssetCollections(withLocalIdentifiers: list, options: nil)
            albums.enumerateObjects { album, _, _ in
                PHAsset.fetchAssets(in: album, options: self.fetchOptions()).enumerateObjects { asset, _, _ in
                    if seen.insert(asset.localIdentifier).inserted { out.append(asset.localIdentifier) }
                }
            }
            call.resolve(["ids": out])
        }
    }

    @objc func trash(_ call: CAPPluginCall) {
        let list = ids(call)
        let dryRun = call.getBool("dryRun") ?? false
        if dryRun || list.isEmpty {
            call.resolve(["trashed": list, "cancelled": false, "dryRun": dryRun])
            return
        }
        let assets = fetch(list)
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

    /* -------------------------------------- Live Photos and smaller videos */

    /// The picture of a photo as Photos shows it (edits included), from the phone only: nil for an iCloud-only original.
    private func imageData(_ asset: PHAsset) -> Data? {
        let opts = PHImageRequestOptions()
        opts.isSynchronous = true
        opts.isNetworkAccessAllowed = false
        opts.version = .current
        opts.deliveryMode = .highQualityFormat
        var out: Data?
        PHImageManager.default().requestImageDataAndOrientation(for: asset, options: opts) { data, _, _, _ in out = data }
        return out
    }

    /// Each Live Photo becomes a plain photo: a new asset with its picture, date, place and favourite flag,
    /// in the same albums. The Live Photos stay — the web layer asks to trash them (the system's dialog).
    @objc func convertLive(_ call: CAPPluginCall) {
        let list = ids(call)
        let dryRun = call.getBool("dryRun") ?? false
        work.async { [weak self] in
            guard let self else { return }
            var lives: [PHAsset] = []
            self.fetch(list).enumerateObjects { a, _, _ in if a.mediaSubtypes.contains(.photoLive) { lives.append(a) } }
            if dryRun {
                let would = lives.map { ["from": $0.localIdentifier, "to": ""] }
                call.resolve(["converted": would, "skipped": list.count - lives.count, "dryRun": true])
                return
            }
            var converted: [[String: String]] = []
            for asset in lives {
                guard let data = self.imageData(asset) else { continue }
                let albums = PHAssetCollection.fetchAssetCollectionsContaining(asset, with: .album, options: nil)
                var created: String?
                do {
                    try PHPhotoLibrary.shared().performChangesAndWait {
                        let request = PHAssetCreationRequest.forAsset()
                        request.addResource(with: .photo, data: data, options: nil)
                        request.creationDate = asset.creationDate
                        request.location = asset.location
                        request.isFavorite = asset.isFavorite
                        guard let placeholder = request.placeholderForCreatedAsset else { return }
                        created = placeholder.localIdentifier
                        albums.enumerateObjects { album, _, _ in
                            if album.canPerform(.addContent), let change = PHAssetCollectionChangeRequest(for: album) {
                                change.addAssets([placeholder] as NSArray)
                            }
                        }
                    }
                } catch {
                    continue
                }
                if let created { converted.append(["from": asset.localIdentifier, "to": created]) }
            }
            call.resolve(["converted": converted, "skipped": list.count - converted.count, "dryRun": false])
        }
    }

    /// A copy is kept only when it is at least this much smaller (src/logic/compress.ts KEEP_MIN_SAVING, provisional).
    private static let keepMinSaving = 0.3
    /// HEIC quality for "Fotos verkleinern" (provisional, like the plan's other numbers).
    private static let heicQuality = 0.8

    /// "Fotos verkleinern": each JPEG or PNG re-saved as HEIC (quality 0.8) with all its metadata (EXIF, GPS,
    /// orientation, date), kept only when at least 30 % smaller, as a new asset with the same creation date,
    /// place and favourite flag in the same albums. The originals stay — the web layer asks to trash them
    /// (the system's dialog). A dry run encodes but writes nothing. One batch (≤ 20) per call; progress as
    /// `compressProgress` events with id "photos". Skipped: Live Photos, edited photos, iCloud-only originals.
    @objc func compressPhotos(_ call: CAPPluginCall) {
        let list = ids(call)
        let dryRun = call.getBool("dryRun") ?? false
        work.async { [weak self] in
            guard let self else { return }
            var assets: [PHAsset] = []
            self.fetch(list).enumerateObjects { a, _, _ in assets.append(a) }
            var results: [[String: Any]] = []
            for (i, asset) in assets.enumerated() {
                autoreleasepool {
                    defer { self.emit("compressProgress", ["id": "photos", "progress": Double(i + 1) / Double(max(1, assets.count))]) }
                    guard asset.mediaType == .image, !asset.mediaSubtypes.contains(.photoLive),
                          let data = self.imageData(asset), let heic = Self.heic(data) else { return }
                    let before = Int64(data.count)
                    let after = Int64(heic.count)
                    guard Double(after) <= Double(before) * (1 - Self.keepMinSaving) else { return }
                    if dryRun {
                        results.append(["from": asset.localIdentifier, "to": "", "before": before, "after": after])
                        return
                    }
                    let albums = PHAssetCollection.fetchAssetCollectionsContaining(asset, with: .album, options: nil)
                    let original = PHAssetResource.assetResources(for: asset).first(where: { $0.type == .photo })?.originalFilename
                    let name = (original as NSString?)?.deletingPathExtension ?? "Bildklar"
                    var created: String?
                    do {
                        try PHPhotoLibrary.shared().performChangesAndWait {
                            let request = PHAssetCreationRequest.forAsset()
                            let options = PHAssetResourceCreationOptions()
                            options.originalFilename = "\(name).heic"
                            request.addResource(with: .photo, data: heic, options: options)
                            request.creationDate = asset.creationDate
                            request.location = asset.location
                            request.isFavorite = asset.isFavorite
                            guard let placeholder = request.placeholderForCreatedAsset else { return }
                            created = placeholder.localIdentifier
                            albums.enumerateObjects { album, _, _ in
                                if album.canPerform(.addContent), let change = PHAssetCollectionChangeRequest(for: album) {
                                    change.addAssets([placeholder] as NSArray)
                                }
                            }
                        }
                    } catch {
                        return
                    }
                    if let created { results.append(["from": asset.localIdentifier, "to": created, "before": before, "after": after]) }
                }
            }
            call.resolve(["results": results, "dryRun": dryRun])
        }
    }

    /// The picture re-encoded as HEIC, with every property of the original copied over (EXIF, GPS, orientation, dates).
    private static func heic(_ data: Data) -> Data? {
        guard let source = CGImageSourceCreateWithData(data as CFData, nil), CGImageSourceGetCount(source) > 0 else { return nil }
        let out = NSMutableData()
        guard let dest = CGImageDestinationCreateWithData(out, UTType.heic.identifier as CFString, 1, nil) else { return nil }
        let options = [kCGImageDestinationLossyCompressionQuality: heicQuality] as CFDictionary
        CGImageDestinationAddImageFromSource(dest, source, 0, options)
        guard CGImageDestinationFinalize(dest) else { return nil }
        return out as Data
    }

    /// The video as Photos plays it (trims included), from the phone only.
    private func avAsset(_ asset: PHAsset) -> AVAsset? {
        let opts = PHVideoRequestOptions()
        opts.isNetworkAccessAllowed = false
        opts.version = .current
        opts.deliveryMode = .highQualityFormat
        let done = DispatchSemaphore(value: 0)
        var out: AVAsset?
        PHImageManager.default().requestAVAsset(forVideo: asset, options: opts) { av, _, _ in
            out = av
            done.signal()
        }
        done.wait()
        return out
    }

    /// A smaller copy of a video (HEVC, at most 1080p) saved as a new asset with the same date, place and
    /// favourite flag. Nothing is saved when the copy is not at least 20 % smaller, or in a dry run.
    @objc func compressVideo(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else { call.reject("No id"); return }
        let dryRun = call.getBool("dryRun") ?? false
        work.async { [weak self] in
            guard let self else { return }
            guard let asset = self.fetch([id]).firstObject, asset.mediaType == .video else { call.reject("Video not found"); return }
            guard let source = self.avAsset(asset) else { call.reject("No local copy of the video"); return }
            var before = self.estimatedBytes(asset, screenshot: false)
            if let url = (source as? AVURLAsset)?.url, let size = try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize {
                before = Int64(size)
            }
            let presets = AVAssetExportSession.exportPresets(compatibleWith: source)
            let preset = presets.contains(AVAssetExportPresetHEVC1920x1080) ? AVAssetExportPresetHEVC1920x1080 : AVAssetExportPreset1920x1080
            guard let exporter = AVAssetExportSession(asset: source, presetName: preset) else { call.reject("Cannot make this video smaller"); return }
            let out = FileManager.default.temporaryDirectory.appendingPathComponent("bildklar-\(UUID().uuidString).mov")
            exporter.outputURL = out
            exporter.outputFileType = .mov
            exporter.shouldOptimizeForNetworkUse = true
            exporter.metadata = source.metadata
            let finished = DispatchSemaphore(value: 0)
            exporter.exportAsynchronously { finished.signal() }
            while finished.wait(timeout: .now() + 0.3) == .timedOut {
                self.emit("compressProgress", ["id": id, "progress": Double(exporter.progress)])
            }
            defer { try? FileManager.default.removeItem(at: out) }
            guard exporter.status == .completed else { call.reject("Could not make the video smaller"); return }
            self.emit("compressProgress", ["id": id, "progress": 1.0])
            let after = Int64((try? out.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0)
            if dryRun || after <= 0 || Double(after) > Double(before) * 0.8 {
                call.resolve(["created": NSNull(), "before": Double(before), "after": Double(after), "dryRun": dryRun])
                return
            }
            var created: String?
            do {
                try PHPhotoLibrary.shared().performChangesAndWait {
                    let request = PHAssetCreationRequest.forAsset()
                    let options = PHAssetResourceCreationOptions()
                    options.shouldMoveFile = false
                    request.addResource(with: .video, fileURL: out, options: options)
                    request.creationDate = asset.creationDate
                    request.location = asset.location
                    request.isFavorite = asset.isFavorite
                    created = request.placeholderForCreatedAsset?.localIdentifier
                }
            } catch {
                call.reject("Could not save the smaller video")
                return
            }
            if let created {
                call.resolve(["created": created, "before": Double(before), "after": Double(after), "dryRun": false])
            } else {
                call.reject("Could not save the smaller video")
            }
        }
    }

    /* ------------------------------------------------------------ widget */

    /// The folder the app shares with its widget (both carry this App Group in their entitlements).
    private static let appGroup = "group.com.habboubah.bildklar"

    /// What the home-screen widget shows: a title and a line (already in the app's language) and,
    /// for "On this day", one photo — written to the shared folder; then the widget is asked to redraw.
    @objc func setWidget(_ call: CAPPluginCall) {
        let title = call.getString("title") ?? "Bildklar"
        let line = call.getString("line") ?? ""
        let photoId = call.getString("photoId")
        // For the Lock Screen widget: the bytes that could be freed and the share gone through (0–100).
        let freeable = call.getDouble("freeable").map { Int64($0) }
        let pct = call.getInt("pct")
        io.async { [weak self] in
            guard let self, let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: Self.appGroup) else {
                call.resolve()
                return
            }
            var stored: [String: Any] = ["title": title, "line": line]
            if let freeable { stored["freeable"] = freeable }
            if let pct { stored["pct"] = pct }
            if let json = try? JSONSerialization.data(withJSONObject: stored) {
                try? json.write(to: dir.appendingPathComponent("widget.json"), options: .atomic)
            }
            let imageURL = dir.appendingPathComponent("widget.jpg")
            let size = CGSize(width: 700, height: 700)
            if let photoId, let asset = self.fetch([photoId]).firstObject,
               let image = self.requestImage(asset, size: size) ?? self.requestImage(asset, size: size, fast: true),
               let data = image.jpegData(compressionQuality: 0.8) {
                try? data.write(to: imageURL, options: .atomic)
            } else {
                try? FileManager.default.removeItem(at: imageURL)
            }
            WidgetCenter.shared.reloadAllTimelines()
            call.resolve()
        }
    }

    /// "Don't Allow" in the system's dialog.
    private static func isCancel(_ error: Error?) -> Bool {
        guard let e = error as NSError? else { return false }
        return e.code == PHPhotosError.userCancelled.rawValue || e.code == NSUserCancelledError
    }

    /* ------------------------------------------------------------- state */

    private lazy var stateURL: URL = {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("bildklar", isDirectory: true)
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
