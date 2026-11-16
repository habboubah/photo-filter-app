package com.habboubah.bildklar

import android.Manifest
import android.app.Activity
import android.content.ContentUris
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.database.ContentObserver
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.provider.Settings
import android.util.Size
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.exifinterface.media.ExifInterface
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.concurrent.Callable
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Android's side of src/native/photoLibrary.ts — the counterpart of
 * PhotoLibraryPlugin.swift:
 *
 * - access: READ_MEDIA_IMAGES (Android 13+), READ_MEDIA_VISUAL_USER_SELECTED for
 *   "selected photos" (14+), the older storage permission below 13, and
 *   ACCESS_MEDIA_LOCATION — without it Android strips the GPS position.
 * - the scan: MediaStore's rows diffed against the SQLite cache (ScanStore) by
 *   their generation; new and changed photos analysed on a small thread pool,
 *   a batch at a time, newest first, with progress events. Never on the main thread.
 * - thumbnails: ContentResolver.loadThumbnail, written to the cache folder under a size cap.
 * - "albums": a folder Pictures/Bildklar/<title>/. The photos are moved there
 *   (RELATIVE_PATH updated) only after MediaStore.createWriteRequest's system
 *   dialog; their contents never change and nothing is copied.
 * - deleting: MediaStore.createTrashRequest — the system's dialog, then the Trash.
 *   Never the permanent delete request.
 * - the user's decisions: a JSON file in the app's files (not localStorage).
 *
 * Every write to the photo library honours `dryRun`: nothing is written, the
 * answer says what would have happened.
 */
@CapacitorPlugin(name = "PhotoLibrary")
class PhotoLibraryPlugin : Plugin() {

    private lateinit var store: ScanStore
    private val scanThread = Executors.newSingleThreadExecutor()
    /** The analysis: three photos at a time. */
    private val workers = Executors.newFixedThreadPool(3)
    /** Thumbnails and reads for the screens, apart from the analysis so a running scan never holds them up. */
    private val io = Executors.newFixedThreadPool(4)
    private val running = AtomicBoolean(false)
    private val cancelled = AtomicBoolean(false)
    private val main = Handler(Looper.getMainLooper())

    private lateinit var permissionLauncher: ActivityResultLauncher<Array<String>>
    private lateinit var senderLauncher: ActivityResultLauncher<IntentSenderRequest>
    private var permissionCall: PluginCall? = null
    private var senderDone: ((Boolean) -> Unit)? = null
    private var observer: ContentObserver? = null

    override fun load() {
        store = ScanStore(context)
        // Registered while the activity is being created, as the Activity Result API requires.
        permissionLauncher = bridge.registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
            prefs().edit().putBoolean(ASKED, true).apply()
            val call = permissionCall
            permissionCall = null
            call?.resolve(JSObject().put("access", access()))
        }
        senderLauncher = bridge.registerForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) { result ->
            val done = senderDone
            senderDone = null
            done?.invoke(result.resultCode == Activity.RESULT_OK)
        }
        val changes = object : ContentObserver(main) {
            private val fire = Runnable { notifyListeners("libraryChanged", JSObject()) }
            override fun onChange(selfChange: Boolean) {
                main.removeCallbacks(fire)
                main.postDelayed(fire, 1500)
            }
        }
        observer = changes
        context.contentResolver.registerContentObserver(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, true, changes)
    }

    override fun handleOnDestroy() {
        observer?.let { context.contentResolver.unregisterContentObserver(it) }
        cancelled.set(true)
        super.handleOnDestroy()
    }

    /* ------------------------------------------------------------- access */

    private fun prefs() = context.getSharedPreferences("bildklar", Context.MODE_PRIVATE)

    private fun granted(permission: String) =
        ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED

    private fun photoPermissions(): Array<String> = when {
        Build.VERSION.SDK_INT >= 34 -> arrayOf(Manifest.permission.READ_MEDIA_IMAGES, Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED, Manifest.permission.ACCESS_MEDIA_LOCATION)
        Build.VERSION.SDK_INT >= 33 -> arrayOf(Manifest.permission.READ_MEDIA_IMAGES, Manifest.permission.ACCESS_MEDIA_LOCATION)
        else -> arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE, Manifest.permission.ACCESS_MEDIA_LOCATION)
    }

    private fun access(): String = when {
        Build.VERSION.SDK_INT >= 33 && granted(Manifest.permission.READ_MEDIA_IMAGES) -> "full"
        Build.VERSION.SDK_INT < 33 && granted(Manifest.permission.READ_EXTERNAL_STORAGE) -> "full"
        Build.VERSION.SDK_INT >= 34 && granted(Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED) -> "limited"
        prefs().getBoolean(ASKED, false) -> "denied"
        else -> "notDetermined"
    }

    private val hasLocation get() = granted(Manifest.permission.ACCESS_MEDIA_LOCATION)

    @PluginMethod
    fun getAccess(call: PluginCall) {
        call.resolve(JSObject().put("access", access()))
    }

    @PluginMethod
    fun requestAccess(call: PluginCall) {
        val a = access()
        if (a == "full") { call.resolve(JSObject().put("access", a)); return }
        permissionCall = call
        permissionLauncher.launch(photoPermissions())
    }

    /** Android 14+: asking again with "selected photos" granted shows the system's picker to change the selection. */
    @PluginMethod
    fun addMorePhotos(call: PluginCall) {
        if (access() == "full") { call.resolve(JSObject().put("access", "full")); return }
        permissionCall = call
        permissionLauncher.launch(photoPermissions())
    }

    @PluginMethod
    fun openSettings(call: PluginCall) {
        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", context.packageName, null))
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        call.resolve()
    }

    @PluginMethod
    fun isDebug(call: PluginCall) {
        call.resolve(JSObject().put("debug", (context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0))
    }

    /* --------------------------------------------------------------- scan */

    private fun scanState(): JSObject = JSObject()
        .put("running", running.get())
        .put("count", store.count())
        .put("pending", store.pendingCount())
        .put("lastScanAt", store.meta(LAST_SCAN)?.toLongOrNull() ?: 0L)

    @PluginMethod
    fun getScanState(call: PluginCall) {
        scanThread.execute { call.resolve(scanState()) }
    }

    @PluginMethod
    fun startScan(call: PluginCall) {
        call.resolve()
        if (access() == "denied" || access() == "notDetermined") return
        if (!running.compareAndSet(false, true)) return
        cancelled.set(false)
        scanThread.execute {
            try {
                listPhotos()
                analyse()
                if (!cancelled.get()) store.setMeta(LAST_SCAN, System.currentTimeMillis().toString())
            } catch (_: Exception) {
                // A photo vanished mid-scan, the volume went away: what was stored stays; the next scan goes on.
            } finally {
                running.set(false)
                val state = scanState()
                main.post { notifyListeners("scanDone", state) }
            }
        }
    }

    @PluginMethod
    fun cancelScan(call: PluginCall) {
        cancelled.set(true)
        call.resolve()
    }

    private fun progress(phase: String, done: Int, total: Int) {
        val data = JSObject().put("phase", phase).put("done", done).put("total", total)
        main.post { notifyListeners("scanProgress", data) }
    }

    /** Phase 1: what MediaStore holds, against the cache. New and changed rows are stored with fv = 0, gone ones dropped. */
    private fun listPhotos() {
        val known = store.stamps()
        val seen = HashSet<String>(known.size + 1024)
        val changed = ArrayList<ScanStore.Meta>()
        val projection = arrayOf(
            MediaStore.Images.Media._ID, MediaStore.MediaColumns.VOLUME_NAME,
            MediaStore.Images.Media.DATE_TAKEN, MediaStore.MediaColumns.DATE_MODIFIED, MediaStore.MediaColumns.GENERATION_MODIFIED,
            MediaStore.MediaColumns.SIZE, MediaStore.MediaColumns.WIDTH, MediaStore.MediaColumns.HEIGHT, MediaStore.MediaColumns.ORIENTATION,
            MediaStore.MediaColumns.IS_FAVORITE, MediaStore.MediaColumns.RELATIVE_PATH,
        )
        val uri = MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
        context.contentResolver.query(uri, projection, null, null, "${MediaStore.Images.Media._ID} ASC")?.use { c ->
            val total = c.count
            var n = 0
            while (c.moveToNext()) {
                if (cancelled.get()) return
                val volume = c.getString(1) ?: MediaStore.VOLUME_EXTERNAL_PRIMARY
                val id = "$volume:${c.getLong(0)}"
                seen.add(id)
                val stamp = c.getLong(4)
                if (known[id] != stamp) {
                    val taken = c.getLong(2).takeIf { it > 0 } ?: (c.getLong(3) * 1000)
                    val rotated = c.getInt(8) % 180 != 0
                    val w = c.getInt(6)
                    val h = c.getInt(7)
                    val path = c.getString(10) ?: ""
                    changed.add(ScanStore.Meta(id, taken, stamp, c.getLong(5), if (rotated) h else w, if (rotated) w else h,
                        c.getInt(9) == 1, path.contains("Screenshots", ignoreCase = true)))
                    if (changed.size >= 1000) { store.upsert(changed); changed.clear() }
                }
                if (++n % 2000 == 0) progress("list", n, total)
            }
            progress("list", total, total)
        }
        store.upsert(changed)
        store.delete(known.keys.filter { it !in seen })
    }

    private fun contentUri(id: String): Uri {
        val colon = id.lastIndexOf(':')
        return MediaStore.Images.Media.getContentUri(id.substring(0, colon), id.substring(colon + 1).toLong())
    }

    /** Phase 2: each photo still to analyse — EXIF place and time, then the features of its 512-px grey copy. */
    private fun analyse() {
        val total = store.pendingCount()
        if (total == 0) return
        var done = 0
        progress("analyse", 0, total)
        while (!cancelled.get()) {
            val batch = store.pending(BATCH)
            if (batch.isEmpty()) break
            val results = workers.invokeAll(batch.map { (id, _) -> Callable { analyseOne(id) } }).map { it.get() }
            store.store(results)
            done += batch.size
            progress("analyse", minOf(done, total), total)
        }
    }

    private fun analyseOne(id: String): ScanStore.Result {
        val uri = contentUri(id)
        var lat: Double? = null
        var lon: Double? = null
        var taken: Long? = null
        try {
            val source = if (hasLocation) MediaStore.setRequireOriginal(uri) else uri
            context.contentResolver.openInputStream(source)?.use { input ->
                val exif = ExifInterface(input)
                exif.latLong?.let { if (it[0] != 0.0 || it[1] != 0.0) { lat = it[0]; lon = it[1] } }
                exif.getAttribute(ExifInterface.TAG_DATETIME_ORIGINAL)?.let { taken = parseExifTime(it) }
            }
        } catch (_: Exception) { /* no EXIF, or the file is not readable: features only */ }

        val features = try {
            val bmp = context.contentResolver.loadThumbnail(uri, Size(FeatureMath.LONG_SIDE, FeatureMath.LONG_SIDE), null)
            val fitted = fit(bmp)
            val w = fitted.width
            val h = fitted.height
            val px = IntArray(w * h)
            fitted.getPixels(px, 0, w, 0, 0, w, h)
            if (fitted !== bmp) fitted.recycle()
            bmp.recycle()
            FeatureMath.features(FeatureMath.greyOf(px), w, h)
        } catch (_: Exception) { null }
        return ScanStore.Result(id, taken, lat, lon, features)
    }

    /** Scales a bitmap down to fit LONG_SIDE (the spec's grey image size), never up. */
    private fun fit(bmp: Bitmap): Bitmap {
        val (w, h) = FeatureMath.fitSize(bmp.width, bmp.height)
        return if (w == bmp.width && h == bmp.height) bmp else Bitmap.createScaledBitmap(bmp, w, h, true)
    }

    private fun parseExifTime(s: String): Long? = try {
        SimpleDateFormat("yyyy:MM:dd HH:mm:ss", Locale.US).parse(s)?.time
    } catch (_: Exception) { null }

    @PluginMethod
    fun getFacts(call: PluginCall) {
        val offset = call.getInt("offset", 0) ?: 0
        val limit = (call.getInt("limit", 2000) ?: 2000).coerceIn(1, 5000)
        io.execute {
            try {
                call.resolve(JSObject().put("rows", store.facts(offset, limit)).put("total", store.count()))
            } catch (e: Exception) {
                call.reject("Could not read the cache", e)
            }
        }
    }

    /** Faces and eyes are the iPhone's (Vision); Android ranks by sharpness and exposure only (no ML Kit: it reports to Google). */
    @PluginMethod
    fun scoreFaces(call: PluginCall) {
        call.resolve(JSObject().put("rows", JSArray()))
    }

    /* --------------------------------------------------------- thumbnails */

    private val thumbDir by lazy { File(context.cacheDir, "thumbs").apply { mkdirs() } }
    private var thumbWrites = 0

    @PluginMethod
    fun thumbnail(call: PluginCall) {
        val id = call.getString("id") ?: return call.reject("No id")
        val size = (call.getInt("size", 256) ?: 256).coerceIn(64, 2048)
        io.execute {
            try {
                val file = File(thumbDir, "${size}-${sha1(id)}.jpg")
                if (!file.exists()) {
                    val bmp = context.contentResolver.loadThumbnail(contentUri(id), Size(size, size), null)
                    val tmp = File(thumbDir, file.name + ".tmp")
                    tmp.outputStream().use { bmp.compress(Bitmap.CompressFormat.JPEG, 82, it) }
                    bmp.recycle()
                    tmp.renameTo(file)
                    if (++thumbWrites % 50 == 0) pruneThumbs()
                } else {
                    file.setLastModified(System.currentTimeMillis())
                }
                call.resolve(JSObject().put("path", file.absolutePath))
            } catch (e: Exception) {
                call.reject("No thumbnail", e)
            }
        }
    }

    /** Keeps the thumbnails under THUMB_CAP bytes: the least recently used go first. */
    private fun pruneThumbs() {
        val files = thumbDir.listFiles()?.sortedBy { it.lastModified() } ?: return
        var total = files.sumOf { it.length() }
        for (f in files) {
            if (total <= THUMB_CAP * 8 / 10) break
            total -= f.length()
            f.delete()
        }
    }

    private fun sha1(s: String): String =
        MessageDigest.getInstance("SHA-1").digest(s.toByteArray()).joinToString("") { "%02x".format(it) }

    /* ------------------------------------------------- folders and trash */

    private fun ids(call: PluginCall): List<String> =
        call.getArray("ids")?.toList<String>()?.filter { it.contains(':') } ?: emptyList()

    /** Runs a MediaStore request (write or trash) through the system's dialog, in chunks a binder transaction can carry. */
    private fun withConsent(uris: List<Uri>, request: (List<Uri>) -> android.app.PendingIntent, then: (List<Uri>, Boolean) -> Unit) {
        val chunks = uris.chunked(REQUEST_CHUNK)
        val approved = ArrayList<Uri>()
        fun next(i: Int) {
            if (i >= chunks.size) { then(approved, false); return }
            val pending = request(chunks[i])
            senderDone = { ok ->
                if (!ok) then(approved, approved.isEmpty())
                else { approved.addAll(chunks[i]); next(i + 1) }
            }
            senderLauncher.launch(IntentSenderRequest.Builder(pending.intentSender).build())
        }
        activity.runOnUiThread { next(0) }
    }

    @PluginMethod
    fun createAlbum(call: PluginCall) {
        val title = (call.getString("title") ?: "").replace(Regex("[\\\\/:*?\"<>|\\p{Cntrl}]"), " ").trim().ifEmpty { "Bildklar" }.take(80)
        val list = ids(call)
        val dryRun = call.getBoolean("dryRun", false) == true
        if (dryRun || list.isEmpty()) {
            call.resolve(JSObject().put("done", list.size).put("cancelled", false).put("dryRun", dryRun))
            return
        }
        val target = "${android.os.Environment.DIRECTORY_PICTURES}/Bildklar/$title/"
        withConsent(list.map(::contentUri), { MediaStore.createWriteRequest(context.contentResolver, it) }) { approved, cancelled ->
            if (cancelled) {
                call.resolve(JSObject().put("done", 0).put("cancelled", true).put("dryRun", false))
                return@withConsent
            }
            io.execute {
                var done = 0
                val values = ContentValues().apply { put(MediaStore.MediaColumns.RELATIVE_PATH, target) }
                for (uri in approved) {
                    // Only the folder changes (the file is moved on disk); the picture itself is never touched.
                    try { if (context.contentResolver.update(uri, values, null, null) > 0) done++ } catch (_: Exception) { }
                }
                call.resolve(JSObject().put("done", done).put("cancelled", false).put("dryRun", false))
            }
        }
    }

    @PluginMethod
    fun trash(call: PluginCall) {
        val list = ids(call)
        val dryRun = call.getBoolean("dryRun", false) == true
        if (dryRun || list.isEmpty()) {
            call.resolve(JSObject().put("trashed", JSArray(list)).put("cancelled", false).put("dryRun", dryRun))
            return
        }
        val byUri = list.associateBy { contentUri(it) }
        // createTrashRequest: the photos go to the Trash, from where the user can still get them back. Never createDeleteRequest.
        withConsent(byUri.keys.toList(), { MediaStore.createTrashRequest(context.contentResolver, it, true) }) { approved, cancelled ->
            val trashed = approved.mapNotNull { byUri[it] }
            if (trashed.isNotEmpty()) scanThread.execute { store.delete(trashed) }
            call.resolve(JSObject().put("trashed", JSArray(trashed)).put("cancelled", cancelled).put("dryRun", false))
        }
    }

    /* ------------------------------------------------------------- state */

    private val stateFile by lazy { File(context.filesDir, "state.json") }

    @PluginMethod
    fun getState(call: PluginCall) {
        val json = if (stateFile.exists()) stateFile.readText() else null
        call.resolve(JSObject().put("json", json))
    }

    @PluginMethod
    fun setState(call: PluginCall) {
        val json = call.getString("json") ?: return call.reject("No state")
        if (json.length > 4_000_000) return call.reject("State too large")
        try {
            // Written next to the old file, then moved over it: a crash mid-write never leaves half a file.
            val tmp = File(context.filesDir, "state.json.tmp")
            tmp.writeText(json)
            if (!tmp.renameTo(stateFile)) { stateFile.delete(); tmp.renameTo(stateFile) }
            call.resolve()
        } catch (e: Exception) {
            call.reject("Could not save", e)
        }
    }

    @PluginMethod
    fun clearCache(call: PluginCall) {
        cancelled.set(true)
        scanThread.execute {
            store.clear()
            thumbDir.listFiles()?.forEach { it.delete() }
            call.resolve()
        }
    }

    companion object {
        private const val ASKED = "photos-asked"
        private const val LAST_SCAN = "lastScanAt"
        /** Photos analysed per batch (and per progress event). */
        private const val BATCH = 48
        /** The thumbnails' size cap in the cache folder. */
        private const val THUMB_CAP = 200L * 1024 * 1024
        /** URIs per MediaStore request: well inside a binder transaction's limit. */
        private const val REQUEST_CHUNK = 1500
    }
}
