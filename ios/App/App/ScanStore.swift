import Foundation
import SQLite3

/// The scan cache: one row per photo or video with what the app knows about it
/// (time, place, an estimated size, what kind it is, features, face scores). A rescan only analyses
/// photos that are new or changed (their modification date moved on) and drops
/// the ones that are gone. An interrupted scan simply continues: unanalysed
/// rows keep `fv = 0`, rows the on-device AI has not seen yet `av = 0`
/// (docs/AI.md) — a new model bumps the AI's version, not the features'.
///
/// One connection, used from the plugin's serial queue only. The database lives
/// in Library/Caches/bildklar (a cache: iOS may clear it, the next scan rebuilds
/// it) — the user's decisions are a file of their own (PhotoLibraryPlugin).
final class ScanStore {
    private var db: OpaquePointer?
    private static let transient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

    init() throws {
        let dir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("bildklar", isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let path = dir.appendingPathComponent("scan.sqlite").path
        guard sqlite3_open_v2(path, &db, SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX, nil) == SQLITE_OK else {
            throw NSError(domain: "ScanStore", code: 1, userInfo: [NSLocalizedDescriptionKey: "Cannot open the scan cache"])
        }
        exec("PRAGMA journal_mode = WAL")
        // A cache: when its shape changes it is simply built again (the next scan fills it) —
        // except from 3 and 4, whose new columns are filled without analysing a photo again
        // (the AI's new version gives every photo its AI pass once more, the features stay).
        let from = userVersion()
        if from == 3 || from == 4 {
            if from == 3 {
                exec("ALTER TABLE asset ADD COLUMN fmt TEXT")
                exec("ALTER TABLE asset ADD COLUMN edited INTEGER")
                exec("ALTER TABLE asset ADD COLUMN emb TEXT")
            }
            exec("ALTER TABLE asset ADD COLUMN vec TEXT")
            exec("PRAGMA user_version = \(Self.schema)")
        } else if from < Self.schema {
            exec("DROP TABLE IF EXISTS asset")
            exec("DROP TABLE IF EXISTS meta")
            exec("PRAGMA user_version = \(Self.schema)")
        }
        exec("""
            CREATE TABLE IF NOT EXISTS asset (
              id TEXT PRIMARY KEY,
              t INTEGER NOT NULL,
              stamp INTEGER NOT NULL,
              lat REAL, lon REAL,
              bytes INTEGER NOT NULL DEFAULT 0,
              w INTEGER NOT NULL DEFAULT 0, h INTEGER NOT NULL DEFAULT 0,
              fav INTEGER NOT NULL DEFAULT 0, shot INTEGER NOT NULL DEFAULT 0,
              video INTEGER NOT NULL DEFAULT 0, dur INTEGER NOT NULL DEFAULT 0, rec INTEGER NOT NULL DEFAULT 0,
              live INTEGER NOT NULL DEFAULT 0, burst TEXT, pick INTEGER NOT NULL DEFAULT 0,
              fv INTEGER NOT NULL DEFAULT 0,
              hash TEXT, sharp REAL, contrast REAL, expo REAL, clip REAL,
              faces INTEGER, faceq REAL, eyes REAL,
              av INTEGER NOT NULL DEFAULT 0, ai TEXT, aes REAL, util INTEGER,
              fmt TEXT, edited INTEGER, emb TEXT, vec TEXT
            )
            """)
        exec("CREATE INDEX IF NOT EXISTS asset_t ON asset(t, id)")
        exec("CREATE INDEX IF NOT EXISTS asset_fv ON asset(fv)")
        exec("CREATE INDEX IF NOT EXISTS asset_av ON asset(av)")
        exec("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)")
    }

    deinit { sqlite3_close(db) }

    /// 2: videos, screen recordings, Live Photos and bursts; 3: the on-device AI's columns (November 2026);
    /// 4: the file format, whether a photo was edited, and a video's picture (the AI's embedding of its poster frame);
    /// 5: every photo's compact vector (the AI's version 2: labels, look-alikes and search come from it, docs/AI.md).
    private static let schema: Int64 = 5

    private func userVersion() -> Int64 {
        guard let stmt = prepare("PRAGMA user_version") else { return 0 }
        defer { sqlite3_finalize(stmt) }
        return sqlite3_step(stmt) == SQLITE_ROW ? sqlite3_column_int64(stmt, 0) : 0
    }

    @discardableResult
    private func exec(_ sql: String) -> Bool { sqlite3_exec(db, sql, nil, nil, nil) == SQLITE_OK }

    private func prepare(_ sql: String) -> OpaquePointer? {
        var stmt: OpaquePointer?
        return sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK ? stmt : nil
    }

    private func transaction(_ body: () -> Void) {
        exec("BEGIN")
        body()
        exec("COMMIT")
    }

    private func bind(_ stmt: OpaquePointer?, _ i: Int32, _ s: String) { sqlite3_bind_text(stmt, i, s, -1, Self.transient) }
    private func bind(_ stmt: OpaquePointer?, _ i: Int32, _ v: Double?) {
        if let v { sqlite3_bind_double(stmt, i, v) } else { sqlite3_bind_null(stmt, i) }
    }
    private func bind(_ stmt: OpaquePointer?, _ i: Int32, _ v: Int64) { sqlite3_bind_int64(stmt, i, v) }

    /// id → its modification stamp, for the diff.
    func stamps() -> [String: Int64] {
        var out: [String: Int64] = [:]
        guard let stmt = prepare("SELECT id, stamp FROM asset") else { return out }
        defer { sqlite3_finalize(stmt) }
        while sqlite3_step(stmt) == SQLITE_ROW {
            out[String(cString: sqlite3_column_text(stmt, 0))] = sqlite3_column_int64(stmt, 1)
        }
        return out
    }

    struct Meta {
        let id: String
        let t: Int64
        let stamp: Int64
        let lat: Double?
        let lon: Double?
        let bytes: Int64
        let w: Int64
        let h: Int64
        let fav: Bool
        let shot: Bool
        /// A video, its length in ms, and whether it is a screen recording.
        let video: Bool
        let dur: Int64
        let rec: Bool
        /// A Live Photo (a still with a short video); a member of a burst, and whether it is the burst's pick.
        let live: Bool
        let burst: String?
        let pick: Bool
    }

    /// New or changed photos: their metadata, and `fv = 0` so they are analysed (again).
    func upsert(_ rows: [Meta]) {
        guard !rows.isEmpty, let stmt = prepare(
            "INSERT OR REPLACE INTO asset (id, t, stamp, lat, lon, bytes, w, h, fav, shot, video, dur, rec, live, burst, pick, fv) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)"
        ) else { return }
        defer { sqlite3_finalize(stmt) }
        transaction {
            for r in rows {
                sqlite3_reset(stmt)
                bind(stmt, 1, r.id); bind(stmt, 2, r.t); bind(stmt, 3, r.stamp)
                bind(stmt, 4, r.lat); bind(stmt, 5, r.lon)
                bind(stmt, 6, r.bytes); bind(stmt, 7, r.w); bind(stmt, 8, r.h)
                bind(stmt, 9, Int64(r.fav ? 1 : 0)); bind(stmt, 10, Int64(r.shot ? 1 : 0))
                bind(stmt, 11, Int64(r.video ? 1 : 0)); bind(stmt, 12, r.dur); bind(stmt, 13, Int64(r.rec ? 1 : 0))
                bind(stmt, 14, Int64(r.live ? 1 : 0))
                if let b = r.burst { bind(stmt, 15, b) } else { sqlite3_bind_null(stmt, 15) }
                bind(stmt, 16, Int64(r.pick ? 1 : 0))
                sqlite3_step(stmt)
            }
        }
    }

    func delete(_ ids: [String]) {
        guard !ids.isEmpty, let stmt = prepare("DELETE FROM asset WHERE id = ?") else { return }
        defer { sqlite3_finalize(stmt) }
        transaction {
            for id in ids {
                sqlite3_reset(stmt)
                bind(stmt, 1, id)
                sqlite3_step(stmt)
            }
        }
    }

    /// The photos still to analyse, newest first (what the user took last matters most).
    func pending(limit: Int) -> [String] {
        guard let stmt = prepare("SELECT id FROM asset WHERE fv < ? ORDER BY t DESC LIMIT ?") else { return [] }
        defer { sqlite3_finalize(stmt) }
        bind(stmt, 1, Int64(FeatureMath.featureVersion)); bind(stmt, 2, Int64(limit))
        var out: [String] = []
        while sqlite3_step(stmt) == SQLITE_ROW { out.append(String(cString: sqlite3_column_text(stmt, 0))) }
        return out
    }

    private func count(_ sql: String) -> Int {
        guard let stmt = prepare(sql) else { return 0 }
        defer { sqlite3_finalize(stmt) }
        return sqlite3_step(stmt) == SQLITE_ROW ? Int(sqlite3_column_int64(stmt, 0)) : 0
    }
    func count() -> Int { count("SELECT COUNT(*) FROM asset") }
    func pendingCount() -> Int { count("SELECT COUNT(*) FROM asset WHERE fv < \(FeatureMath.featureVersion)") }
    func pendingVideoCount() -> Int { count("SELECT COUNT(*) FROM asset WHERE fv < \(FeatureMath.featureVersion) AND video = 1") }

    /// What the AI still has to look at, newest first: analysed photos with a local copy (a hash), no screenshots;
    /// videos too (their poster frame: lookalike videos and search), not screen recordings.
    private static let aiWanted = "av < ? AND fv > 0 AND hash IS NOT NULL AND shot = 0 AND rec = 0"

    /// Photos whose file format is not known yet: new or changed ones, and every photo cached before schema 4.
    func formatPending(limit: Int) -> [String] {
        guard let stmt = prepare("SELECT id FROM asset WHERE fmt IS NULL AND video = 0 LIMIT ?") else { return [] }
        defer { sqlite3_finalize(stmt) }
        bind(stmt, 1, Int64(limit))
        var out: [String] = []
        while sqlite3_step(stmt) == SQLITE_ROW { out.append(String(cString: sqlite3_column_text(stmt, 0))) }
        return out
    }

    /// The file format (jpeg, heic, png, raw, other) and whether the photo was edited in Photos.
    func storeFormats(_ rows: [(id: String, fmt: String, edited: Bool)]) {
        guard let stmt = prepare("UPDATE asset SET fmt = ?, edited = ? WHERE id = ?") else { return }
        defer { sqlite3_finalize(stmt) }
        transaction {
            for r in rows {
                sqlite3_reset(stmt)
                bind(stmt, 1, r.fmt); bind(stmt, 2, Int64(r.edited ? 1 : 0)); bind(stmt, 3, r.id)
                sqlite3_step(stmt)
            }
        }
    }

    func aiPending(limit: Int) -> [String] {
        guard let stmt = prepare("SELECT id FROM asset WHERE \(Self.aiWanted) ORDER BY t DESC LIMIT ?") else { return [] }
        defer { sqlite3_finalize(stmt) }
        bind(stmt, 1, Int64(ImageEmbedder.aiVersion)); bind(stmt, 2, Int64(limit))
        var out: [String] = []
        while sqlite3_step(stmt) == SQLITE_ROW { out.append(String(cString: sqlite3_column_text(stmt, 0))) }
        return out
    }

    func aiPendingCount() -> Int {
        guard let stmt = prepare("SELECT COUNT(*) FROM asset WHERE \(Self.aiWanted)") else { return 0 }
        defer { sqlite3_finalize(stmt) }
        bind(stmt, 1, Int64(ImageEmbedder.aiVersion))
        return sqlite3_step(stmt) == SQLITE_ROW ? Int(sqlite3_column_int64(stmt, 0)) : 0
    }

    func aiPendingVideoCount() -> Int {
        guard let stmt = prepare("SELECT COUNT(*) FROM asset WHERE \(Self.aiWanted) AND video = 1") else { return 0 }
        defer { sqlite3_finalize(stmt) }
        bind(stmt, 1, Int64(ImageEmbedder.aiVersion))
        return sqlite3_step(stmt) == SQLITE_ROW ? Int(sqlite3_column_int64(stmt, 0)) : 0
    }

    struct AIResult {
        let id: String
        /// The compact vector, packed (ImageEmbedder.packed); nil: the picture could not be read.
        let vec: String?
        /// Vision's aesthetics score and utility flag (iOS 18+).
        let aes: Double?
        let util: Bool?
        /// A video's picture: its poster frame's full embedding, packed (lookalike videos).
        var emb: String? = nil
    }

    /// The AI's pass over some photos; `av` moves on either way, so an unreadable photo isn't tried again and again.
    /// The labels' scores of AI version 1 (`ai`) are cleared: the app scores the labels from the vector now.
    func storeAI(_ results: [AIResult]) {
        guard let stmt = prepare("UPDATE asset SET av = ?, ai = NULL, vec = ?, aes = ?, util = ?, emb = ? WHERE id = ?") else { return }
        defer { sqlite3_finalize(stmt) }
        transaction {
            for r in results {
                sqlite3_reset(stmt)
                bind(stmt, 1, Int64(ImageEmbedder.aiVersion))
                if let v = r.vec { bind(stmt, 2, v) } else { sqlite3_bind_null(stmt, 2) }
                bind(stmt, 3, r.aes)
                if let u = r.util { bind(stmt, 4, Int64(u ? 1 : 0)) } else { sqlite3_bind_null(stmt, 4) }
                if let e = r.emb { bind(stmt, 5, e) } else { sqlite3_bind_null(stmt, 5) }
                bind(stmt, 6, r.id)
                sqlite3_step(stmt)
            }
        }
    }

    /// The compact vectors of these photos (PhotoLibrary.getVectors): only rows of the current AI version.
    func vectors(_ ids: [String]) -> [[String: String]] {
        guard let stmt = prepare("SELECT vec FROM asset WHERE id = ? AND av = ? AND vec IS NOT NULL") else { return [] }
        defer { sqlite3_finalize(stmt) }
        var out: [[String: String]] = []
        out.reserveCapacity(ids.count)
        for id in ids {
            sqlite3_reset(stmt)
            bind(stmt, 1, id); bind(stmt, 2, Int64(ImageEmbedder.aiVersion))
            if sqlite3_step(stmt) == SQLITE_ROW { out.append(["id": id, "v": String(cString: sqlite3_column_text(stmt, 0))]) }
        }
        return out
    }

    /// An analysis: the features, or none when no local copy of the picture exists (an iCloud-only original is never downloaded).
    func store(_ results: [(id: String, features: FeatureMath.Features?)]) {
        guard let stmt = prepare("UPDATE asset SET fv = ?, hash = ?, sharp = ?, contrast = ?, expo = ?, clip = ? WHERE id = ?") else { return }
        defer { sqlite3_finalize(stmt) }
        transaction {
            for r in results {
                sqlite3_reset(stmt)
                bind(stmt, 1, Int64(FeatureMath.featureVersion))
                if let f = r.features {
                    bind(stmt, 2, f.hash); bind(stmt, 3, f.sharp); bind(stmt, 4, f.contrast); bind(stmt, 5, f.expo); bind(stmt, 6, f.clip)
                } else {
                    for i in 2...6 { sqlite3_bind_null(stmt, Int32(i)) }
                }
                bind(stmt, 7, r.id)
                sqlite3_step(stmt)
            }
        }
    }

    func storeFaces(_ rows: [(id: String, faces: Int, faceQ: Double?, eyes: Double?)]) {
        guard let stmt = prepare("UPDATE asset SET faces = ?, faceq = ?, eyes = ? WHERE id = ?") else { return }
        defer { sqlite3_finalize(stmt) }
        transaction {
            for r in rows {
                sqlite3_reset(stmt)
                bind(stmt, 1, Int64(r.faces)); bind(stmt, 2, r.faceQ); bind(stmt, 3, r.eyes); bind(stmt, 4, r.id)
                sqlite3_step(stmt)
            }
        }
    }

    /// Face scores already worked out for some of these photos.
    func faces(_ ids: [String]) -> [String: [String: Any]] {
        guard let stmt = prepare("SELECT faces, faceq, eyes FROM asset WHERE id = ? AND faces IS NOT NULL") else { return [:] }
        defer { sqlite3_finalize(stmt) }
        var out: [String: [String: Any]] = [:]
        for id in ids {
            sqlite3_reset(stmt)
            bind(stmt, 1, id)
            if sqlite3_step(stmt) == SQLITE_ROW {
                var row: [String: Any] = ["id": id, "faces": Int(sqlite3_column_int64(stmt, 0))]
                if sqlite3_column_type(stmt, 1) != SQLITE_NULL { row["faceQ"] = sqlite3_column_double(stmt, 1) }
                if sqlite3_column_type(stmt, 2) != SQLITE_NULL { row["eyes"] = sqlite3_column_double(stmt, 2) }
                out[id] = row
            }
        }
        return out
    }

    /// A page of facts for the web layer (src/types.ts Photo), oldest first.
    func facts(offset: Int, limit: Int) -> [[String: Any]] {
        guard let stmt = prepare("""
            SELECT id, t, lat, lon, bytes, w, h, fav, shot, fv, hash, sharp, contrast, expo, clip, faces, faceq, eyes,
                   video, dur, rec, live, burst, pick, av, vec IS NOT NULL, aes, util, fmt, edited, emb
            FROM asset ORDER BY t, id LIMIT ? OFFSET ?
            """) else { return [] }
        defer { sqlite3_finalize(stmt) }
        bind(stmt, 1, Int64(limit)); bind(stmt, 2, Int64(offset))
        var rows: [[String: Any]] = []
        rows.reserveCapacity(limit)
        while sqlite3_step(stmt) == SQLITE_ROW {
            var o: [String: Any] = [
                "id": String(cString: sqlite3_column_text(stmt, 0)),
                "t": sqlite3_column_int64(stmt, 1),
                "bytes": sqlite3_column_int64(stmt, 4),
                "w": sqlite3_column_int64(stmt, 5),
                "h": sqlite3_column_int64(stmt, 6),
            ]
            if sqlite3_column_type(stmt, 2) != SQLITE_NULL && sqlite3_column_type(stmt, 3) != SQLITE_NULL {
                o["lat"] = sqlite3_column_double(stmt, 2)
                o["lon"] = sqlite3_column_double(stmt, 3)
            }
            if sqlite3_column_int64(stmt, 7) == 1 { o["fav"] = true }
            if sqlite3_column_int64(stmt, 8) == 1 { o["shot"] = true }
            if sqlite3_column_int64(stmt, 9) > 0 && sqlite3_column_type(stmt, 10) != SQLITE_NULL {
                o["hash"] = String(cString: sqlite3_column_text(stmt, 10))
                o["sharp"] = sqlite3_column_double(stmt, 11)
                o["contrast"] = sqlite3_column_double(stmt, 12)
                o["expo"] = sqlite3_column_double(stmt, 13)
                o["clip"] = sqlite3_column_double(stmt, 14)
            }
            if sqlite3_column_type(stmt, 15) != SQLITE_NULL {
                o["faces"] = sqlite3_column_int64(stmt, 15)
                if sqlite3_column_type(stmt, 16) != SQLITE_NULL { o["faceQ"] = sqlite3_column_double(stmt, 16) }
                if sqlite3_column_type(stmt, 17) != SQLITE_NULL { o["eyes"] = sqlite3_column_double(stmt, 17) }
            }
            if sqlite3_column_int64(stmt, 18) == 1 {
                o["video"] = true
                o["dur"] = sqlite3_column_int64(stmt, 19)
            }
            if sqlite3_column_int64(stmt, 20) == 1 { o["rec"] = true }
            if sqlite3_column_int64(stmt, 21) == 1 { o["live"] = true }
            if sqlite3_column_type(stmt, 22) != SQLITE_NULL { o["burst"] = String(cString: sqlite3_column_text(stmt, 22)) }
            if sqlite3_column_int64(stmt, 23) == 1 { o["pick"] = true }
            if sqlite3_column_int64(stmt, 24) == Int64(ImageEmbedder.aiVersion) {
                // The vector itself comes apart (getVectors): only its version rides with the facts.
                if sqlite3_column_int64(stmt, 25) == 1 { o["vv"] = ImageEmbedder.aiVersion }
                if sqlite3_column_type(stmt, 26) != SQLITE_NULL { o["aes"] = sqlite3_column_double(stmt, 26) }
                if sqlite3_column_type(stmt, 27) != SQLITE_NULL { o["util"] = sqlite3_column_int64(stmt, 27) == 1 }
                if sqlite3_column_type(stmt, 30) != SQLITE_NULL { o["emb"] = String(cString: sqlite3_column_text(stmt, 30)) }
            }
            if sqlite3_column_type(stmt, 28) != SQLITE_NULL { o["fmt"] = String(cString: sqlite3_column_text(stmt, 28)) }
            if sqlite3_column_int64(stmt, 29) == 1 { o["edited"] = true }
            rows.append(o)
        }
        return rows
    }

    func meta(_ key: String) -> String? {
        guard let stmt = prepare("SELECT value FROM meta WHERE key = ?") else { return nil }
        defer { sqlite3_finalize(stmt) }
        bind(stmt, 1, key)
        return sqlite3_step(stmt) == SQLITE_ROW ? String(cString: sqlite3_column_text(stmt, 0)) : nil
    }

    func setMeta(_ key: String, _ value: String) {
        guard let stmt = prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)") else { return }
        defer { sqlite3_finalize(stmt) }
        bind(stmt, 1, key); bind(stmt, 2, value)
        sqlite3_step(stmt)
    }

    func clear() {
        exec("DELETE FROM asset")
        exec("DELETE FROM meta")
    }
}
