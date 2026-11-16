package com.habboubah.fotonest

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject

/**
 * The scan cache: one row per photo with what the app knows about it (time,
 * place, size, features). A rescan only analyses photos that are new or changed
 * (their MediaStore generation moved on) and drops the ones that are gone. An
 * interrupted scan simply continues: unanalysed rows keep `fv = 0`.
 *
 * Only ever used from the plugin's one scan thread (and the bridge thread for
 * reads, which SQLite serialises).
 */
class ScanStore(context: Context) : SQLiteOpenHelper(context, "fotonest-scan.db", null, 1) {

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
                fv INTEGER NOT NULL DEFAULT 0,
                hash TEXT, sharp REAL, contrast REAL, expo REAL, clip REAL
            )"""
        )
        db.execSQL("CREATE INDEX asset_t ON asset(t, id)")
        db.execSQL("CREATE INDEX asset_fv ON asset(fv)")
        db.execSQL("CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT)")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
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

    data class Meta(val id: String, val t: Long, val stamp: Long, val bytes: Long, val w: Int, val h: Int, val fav: Boolean, val shot: Boolean)

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
            "SELECT id, t, lat, lon, bytes, w, h, fav, shot, fv, hash, sharp, contrast, expo, clip FROM asset ORDER BY t, id LIMIT ? OFFSET ?",
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
