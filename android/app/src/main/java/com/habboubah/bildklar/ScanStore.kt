package com.habboubah.bildklar

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject

/**
 * The scan cache: one row per photo or video with what the app knows about it
 * (time, place, size, what kind it is, features). A rescan only analyses photos that are new or changed
 * (their MediaStore generation moved on) and drops the ones that are gone. An
 * interrupted scan simply continues: unanalysed rows keep `fv = 0`, rows the
 * on-device AI has not seen yet `av = 0` (docs/AI.md) — a new model bumps the
 * AI's version, not the features'.
 *
 * Only ever used from the plugin's one scan thread (and the bridge thread for
 * reads, which SQLite serialises).
 */
class ScanStore(context: Context) : SQLiteOpenHelper(context, "bildklar-scan.db", null, SCHEMA) {

    companion object {
        /**
         * 2: videos and screen recordings; 3: the on-device AI's columns (November 2026); 4: the file
         * format (MIME_TYPE), the folder (RELATIVE_PATH) and a video's picture (its poster frame's embedding).
         */
        const val SCHEMA = 4
        /**
         * What the AI still has to look at: analysed, readable (a hash), no screenshots; videos too (their
         * poster frame, for lookalike videos — only the embedding is kept), not screen recordings.
         */
        private const val AI_WANTED = "av < ? AND fv > 0 AND hash IS NOT NULL AND shot = 0 AND rec = 0"
    }

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """CREATE TABLE asset (
                id TEXT PRIMARY KEY,
                t INTEGER NOT NULL,
                stamp INTEGER NOT NULL,
                lat REAL, lon REAL,
                bytes INTEGER NOT NULL DEFAULT 0,
                w INTEGER NOT NULL DEFAULT 0, h INTEGER NOT NULL DEFAULT 0,
                fav INTEGER NOT NULL DEFAULT 0, shot INTEGER NOT NULL DEFAULT 0,
                video INTEGER NOT NULL DEFAULT 0, dur INTEGER NOT NULL DEFAULT 0, rec INTEGER NOT NULL DEFAULT 0,
                fv INTEGER NOT NULL DEFAULT 0,
                hash TEXT, sharp REAL, contrast REAL, expo REAL, clip REAL,
                av INTEGER NOT NULL DEFAULT 0, ai TEXT,
                fmt TEXT, dir TEXT, emb TEXT
            )"""
        )
        db.execSQL("CREATE INDEX asset_t ON asset(t, id)")
        db.execSQL("CREATE INDEX asset_fv ON asset(fv)")
        db.execSQL("CREATE INDEX asset_av ON asset(av)")
        db.execSQL("CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT)")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // From 3 to 4 the rows stay: the new columns are filled by the next listing, nothing is analysed again.
        if (oldVersion == 3 && newVersion == 4) {
            db.execSQL("ALTER TABLE asset ADD COLUMN fmt TEXT")
            db.execSQL("ALTER TABLE asset ADD COLUMN dir TEXT")
            db.execSQL("ALTER TABLE asset ADD COLUMN emb TEXT")
            return
        }
        // A cache: when its shape changes it is simply built again.
        db.execSQL("DROP TABLE IF EXISTS asset")
        db.execSQL("DROP TABLE IF EXISTS meta")
        onCreate(db)
    }

    override fun onConfigure(db: SQLiteDatabase) {
        db.enableWriteAheadLogging()
    }

    /** id → its generation stamp, for the diff. */
    fun stamps(): HashMap<String, Long> {
        val out = HashMap<String, Long>()
        readableDatabase.rawQuery("SELECT id, stamp FROM asset", null).use { c ->
            while (c.moveToNext()) out[c.getString(0)] = c.getLong(1)
        }
        return out
    }

    data class Meta(
        val id: String, val t: Long, val stamp: Long, val bytes: Long, val w: Int, val h: Int, val fav: Boolean, val shot: Boolean,
        /** A video, its length in ms, and whether it is a screen recording. */
        val video: Boolean = false, val dur: Long = 0, val rec: Boolean = false,
        /** The file format (jpeg, heic, png, raw, other; photos only) and the folder it lies in (RELATIVE_PATH, "" when unknown). */
        val fmt: String? = null, val dir: String = "",
    )

    /** Rows listed before schema 4 (no folder yet): filled by the next listing without being analysed again. */
    fun withoutDir(): HashSet<String> {
        val out = HashSet<String>()
        readableDatabase.rawQuery("SELECT id FROM asset WHERE dir IS NULL", null).use { c -> while (c.moveToNext()) out.add(c.getString(0)) }
        return out
    }

    /** The format and the folder of unchanged rows (the step from schema 3 to 4). */
    fun fillMeta(rows: List<Meta>) {
        if (rows.isEmpty()) return
        val db = writableDatabase
        db.beginTransaction()
        try {
            val v = ContentValues()
            for (r in rows) {
                v.clear()
                if (r.fmt != null) v.put("fmt", r.fmt) else v.putNull("fmt")
                v.put("dir", r.dir)
                db.update("asset", v, "id = ?", arrayOf(r.id))
            }
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    /** New or changed photos: their metadata, and `fv = 0` so they are analysed (again). */
    fun upsert(rows: List<Meta>) {
        val db = writableDatabase
        db.beginTransaction()
        try {
            val v = ContentValues()
            for (r in rows) {
                v.clear()
                v.put("id", r.id); v.put("t", r.t); v.put("stamp", r.stamp); v.put("bytes", r.bytes)
                v.put("w", r.w); v.put("h", r.h); v.put("fav", if (r.fav) 1 else 0); v.put("shot", if (r.shot) 1 else 0)
                v.put("video", if (r.video) 1 else 0); v.put("dur", r.dur); v.put("rec", if (r.rec) 1 else 0)
                if (r.fmt != null) v.put("fmt", r.fmt) else v.putNull("fmt")
                v.put("dir", r.dir)
                v.put("fv", 0)
                db.insertWithOnConflict("asset", null, v, SQLiteDatabase.CONFLICT_REPLACE)
            }
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    fun delete(ids: Collection<String>) {
        if (ids.isEmpty()) return
        val db = writableDatabase
        db.beginTransaction()
        try {
            for (id in ids) db.delete("asset", "id = ?", arrayOf(id))
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    /** The photos still to analyse, newest first (what the user took last matters most). */
    fun pending(limit: Int): List<Pair<String, Long>> {
        val out = ArrayList<Pair<String, Long>>()
        readableDatabase.rawQuery(
            "SELECT id, t FROM asset WHERE fv < ? ORDER BY t DESC LIMIT ?",
            arrayOf(FeatureMath.FEATURE_VERSION.toString(), limit.toString())
        ).use { c -> while (c.moveToNext()) out.add(Pair(c.getString(0), c.getLong(1))) }
        return out
    }

    fun pendingCount(): Int = count("SELECT COUNT(*) FROM asset WHERE fv < ${FeatureMath.FEATURE_VERSION}")
    fun count(): Int = count("SELECT COUNT(*) FROM asset")

    private fun count(sql: String): Int = readableDatabase.rawQuery(sql, null).use { c -> if (c.moveToFirst()) c.getInt(0) else 0 }

    /** The photos the AI still has to look at, newest first. */
    fun aiPending(limit: Int): List<String> {
        val out = ArrayList<String>()
        readableDatabase.rawQuery(
            "SELECT id FROM asset WHERE $AI_WANTED ORDER BY t DESC LIMIT ?",
            arrayOf(ImageEmbedder.AI_VERSION.toString(), limit.toString())
        ).use { c -> while (c.moveToNext()) out.add(c.getString(0)) }
        return out
    }

    fun aiPendingCount(): Int =
        readableDatabase.rawQuery("SELECT COUNT(*) FROM asset WHERE $AI_WANTED", arrayOf(ImageEmbedder.AI_VERSION.toString()))
            .use { c -> if (c.moveToFirst()) c.getInt(0) else 0 }

    /** One photo's (or video's) AI pass: the labels' logits × 10 for a photo, the packed embedding for a video; null: unreadable. */
    data class AIResult(val id: String, val scores: IntArray?, val emb: String? = null)

    /** The AI's pass over some photos and videos. `av` moves on either way. */
    fun storeAI(results: List<AIResult>) {
        val db = writableDatabase
        db.beginTransaction()
        try {
            val v = ContentValues()
            for (r in results) {
                val id = r.id
                v.clear()
                v.put("av", ImageEmbedder.AI_VERSION)
                if (r.scores != null) v.put("ai", r.scores.joinToString(",")) else v.putNull("ai")
                if (r.emb != null) v.put("emb", r.emb) else v.putNull("emb")
                db.update("asset", v, "id = ?", arrayOf(id))
            }
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    data class Result(
        val id: String, val t: Long?, val lat: Double?, val lon: Double?,
        val features: FeatureMath.Features?,
    )

    /** An analysis: the features (or none, when the picture could not be read), and the place and time from EXIF. */
    fun store(results: List<Result>) {
        val db = writableDatabase
        db.beginTransaction()
        try {
            val v = ContentValues()
            for (r in results) {
                v.clear()
                v.put("fv", FeatureMath.FEATURE_VERSION)
                if (r.t != null) v.put("t", r.t)
                if (r.lat != null && r.lon != null) { v.put("lat", r.lat); v.put("lon", r.lon) } else { v.putNull("lat"); v.putNull("lon") }
                val f = r.features
                if (f != null) {
                    v.put("hash", f.hash); v.put("sharp", f.sharp); v.put("contrast", f.contrast); v.put("expo", f.expo); v.put("clip", f.clip)
                }
                db.update("asset", v, "id = ?", arrayOf(r.id))
            }
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    /** A page of facts for the web layer (src/types.ts Photo), oldest first. */
    fun facts(offset: Int, limit: Int): JSArray {
        val rows = JSArray()
        readableDatabase.rawQuery(
            "SELECT id, t, lat, lon, bytes, w, h, fav, shot, fv, hash, sharp, contrast, expo, clip, video, dur, rec, av, ai, fmt, dir, emb FROM asset ORDER BY t, id LIMIT ? OFFSET ?",
            arrayOf(limit.toString(), offset.toString())
        ).use { c ->
            while (c.moveToNext()) {
                val o = JSObject()
                o.put("id", c.getString(0))
                o.put("t", c.getLong(1))
                if (!c.isNull(2) && !c.isNull(3)) { o.put("lat", c.getDouble(2)); o.put("lon", c.getDouble(3)) }
                o.put("bytes", c.getLong(4))
                o.put("exact", true)
                o.put("w", c.getInt(5)); o.put("h", c.getInt(6))
                if (c.getInt(7) == 1) o.put("fav", true)
                if (c.getInt(8) == 1) o.put("shot", true)
                if (c.getInt(9) > 0 && !c.isNull(10)) {
                    o.put("hash", c.getString(10)); o.put("sharp", c.getDouble(11)); o.put("contrast", c.getDouble(12))
                    o.put("expo", c.getDouble(13)); o.put("clip", c.getDouble(14))
                }
                if (c.getInt(15) == 1) { o.put("video", true); o.put("dur", c.getLong(16)) }
                if (c.getInt(17) == 1) o.put("rec", true)
                if (c.getInt(18) == ImageEmbedder.AI_VERSION && !c.isNull(19)) {
                    val ai = JSArray()
                    for (part in c.getString(19).split(',')) part.toIntOrNull()?.let { ai.put(it) }
                    o.put("ai", ai)
                }
                if (c.getInt(18) == ImageEmbedder.AI_VERSION && !c.isNull(22)) o.put("emb", c.getString(22))
                if (!c.isNull(20)) o.put("fmt", c.getString(20))
                if (!c.isNull(21) && c.getString(21).isNotEmpty()) o.put("dir", c.getString(21))
                rows.put(o)
            }
        }
        return rows
    }

    fun meta(key: String): String? =
        readableDatabase.rawQuery("SELECT value FROM meta WHERE key = ?", arrayOf(key)).use { c -> if (c.moveToFirst()) c.getString(0) else null }

    fun setMeta(key: String, value: String) {
        val v = ContentValues()
        v.put("key", key); v.put("value", value)
        writableDatabase.insertWithOnConflict("meta", null, v, SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun clear() {
        writableDatabase.execSQL("DELETE FROM asset")
        writableDatabase.execSQL("DELETE FROM meta")
    }
}
