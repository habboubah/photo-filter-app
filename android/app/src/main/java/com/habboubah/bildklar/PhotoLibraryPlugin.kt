package com.habboubah.bildklar

import android.Manifest
import android.app.Activity
import android.app.usage.StorageStatsManager
import android.content.ContentUris
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.database.ContentObserver
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.heifwriter.HeifWriter
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.os.StatFs
import android.os.storage.StorageManager
import android.provider.MediaStore
import android.provider.Settings
import android.util.Size
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.exifinterface.media.ExifInterface
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.util.UnstableApi
import androidx.media3.transformer.Composition
import androidx.media3.transformer.DefaultEncoderFactory
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.ProgressHolder
import androidx.media3.transformer.Transformer
import androidx.media3.transformer.VideoEncoderSettings
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
 * - access: READ_MEDIA_IMAGES and READ_MEDIA_VIDEO (Android 13+, one "Photos and
 *   videos" permission for the user), READ_MEDIA_VISUAL_USER_SELECTED for
 *   "selected photos" (14+), the older storage permission below 13, and
 *   ACCESS_MEDIA_LOCATION — without it Android strips the GPS position.
 * - the scan: MediaStore's rows diffed against the SQLite cache (ScanStore) by
 *   their generation; new and changed photos analysed on a small thread pool,
 *   a batch at a time, newest first, with progress events. Never on the main thread.
 * - the on-device AI (docs/AI.md), a third phase of the scan: each analysed
 *   photo through the shared image model (ImageEmbedder, ONNX Runtime),
 *   sixteen at a time, newest first, paused while the phone runs hot.
 *   Nothing leaves the phone.
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
    /** Photos made smaller: one batch at a time, apart from the scan and the screens. */
    private val work = Executors.newSingleThreadExecutor()
    private val running = AtomicBoolean(false)
    private val cancelled = AtomicBoolean(false)
    /** Made on the scan thread the first time it is needed; null when the model can't load (the AI's phase is then skipped). */
    private var embedder: ImageEmbedder? = null
    private var embedderTried = false
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
        context.contentResolver.registerContentObserver(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, true, changes)
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
        Build.VERSION.SDK_INT >= 34 -> arrayOf(Manifest.permission.READ_MEDIA_IMAGES, Manifest.permission.READ_MEDIA_VIDEO, Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED, Manifest.permission.ACCESS_MEDIA_LOCATION)
        Build.VERSION.SDK_INT >= 33 -> arrayOf(Manifest.permission.READ_MEDIA_IMAGES, Manifest.permission.READ_MEDIA_VIDEO, Manifest.permission.ACCESS_MEDIA_LOCATION)
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

    /**
     * Free and total space on the internal storage, shown to the user.
     * StorageStatsManager gives the sizes Android's own settings show (no
     * permission needed); StatFs on the data partition is the fallback.
     */
    @PluginMethod
    fun getStorage(call: PluginCall) {
        // Not on scanThread: a long scan must not hold this answer back.
        Thread {
            val (free, total) = try {
                val stats = context.getSystemService(StorageStatsManager::class.java)
                Pair(stats.getFreeBytes(StorageManager.UUID_DEFAULT), stats.getTotalBytes(StorageManager.UUID_DEFAULT))
            } catch (e: Exception) {
                try {
                    val fs = StatFs(Environment.getDataDirectory().path)
                    Pair(fs.availableBytes, fs.totalBytes)
                } catch (e2: Exception) {
                    Pair(0L, 0L)
                }
            }
            call.resolve(JSObject().put("free", maxOf(0L, free)).put("total", maxOf(0L, total)))
        }.start()
    }

    /* --------------------------------------------------------------- scan */

    private fun scanState(): JSObject = JSObject()
        .put("running", running.get())
        .put("count", store.count())
        .put("pending", store.pendingCount())
        .put("aiPending", store.aiPendingCount())
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
                analyseAI()
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
        // Rows cached before schema 4: their format and folder are filled now, without analysing them again.
        val noDir = store.withoutDir()
        val filled = ArrayList<ScanStore.Meta>()
        val projection = arrayOf(
            MediaStore.Images.Media._ID, MediaStore.MediaColumns.VOLUME_NAME,
            MediaStore.Images.Media.DATE_TAKEN, MediaStore.MediaColumns.DATE_MODIFIED, MediaStore.MediaColumns.GENERATION_MODIFIED,
            MediaStore.MediaColumns.SIZE, MediaStore.MediaColumns.WIDTH, MediaStore.MediaColumns.HEIGHT, MediaStore.MediaColumns.ORIENTATION,
            MediaStore.MediaColumns.IS_FAVORITE, MediaStore.MediaColumns.RELATIVE_PATH, MediaStore.MediaColumns.MIME_TYPE,
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
                        c.getInt(9) == 1, path.contains("Screenshots", ignoreCase = true), fmt = format(c.getString(11)), dir = path))
                    if (changed.size >= 1000) { store.upsert(changed); changed.clear() }
                } else if (id in noDir) {
                    filled.add(ScanStore.Meta(id, 0, stamp, 0, 0, 0, false, false, fmt = format(c.getString(11)), dir = c.getString(10) ?: ""))
                    if (filled.size >= 1000) { store.fillMeta(filled); filled.clear() }
                }
                if (++n % 2000 == 0) progress("list", n, total)
            }
            progress("list", total, total)
        }
        if (cancelled.get()) return
        store.fillMeta(filled)
        listVideos(known, seen, changed, noDir)
        if (cancelled.get()) return
        store.upsert(changed)
        store.delete(known.keys.filter { it !in seen })
    }

    /**
     * The videos, the same way. Their ids are "<volume>:v<_ID>" so the right
     * collection is asked again later. Without READ_MEDIA_VIDEO MediaStore
     * simply answers with no rows.
     */
    private fun listVideos(known: Map<String, Long>, seen: HashSet<String>, changed: ArrayList<ScanStore.Meta>, noDir: Set<String>) {
        val filled = ArrayList<ScanStore.Meta>()
        val projection = arrayOf(
            MediaStore.Video.Media._ID, MediaStore.MediaColumns.VOLUME_NAME,
            MediaStore.Video.Media.DATE_TAKEN, MediaStore.MediaColumns.DATE_MODIFIED, MediaStore.MediaColumns.GENERATION_MODIFIED,
            MediaStore.MediaColumns.SIZE, MediaStore.MediaColumns.WIDTH, MediaStore.MediaColumns.HEIGHT, MediaStore.MediaColumns.ORIENTATION,
            MediaStore.MediaColumns.IS_FAVORITE, MediaStore.MediaColumns.RELATIVE_PATH, MediaStore.MediaColumns.DURATION,
            MediaStore.MediaColumns.DISPLAY_NAME,
        )
        val uri = MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
        try {
            context.contentResolver.query(uri, projection, null, null, "${MediaStore.Video.Media._ID} ASC")?.use { c ->
                while (c.moveToNext()) {
                    if (cancelled.get()) return
                    val volume = c.getString(1) ?: MediaStore.VOLUME_EXTERNAL_PRIMARY
                    val id = "$volume:v${c.getLong(0)}"
                    seen.add(id)
                    val stamp = c.getLong(4)
                    if (known[id] == stamp) {
                        if (id in noDir) filled.add(ScanStore.Meta(id, 0, stamp, 0, 0, 0, false, false, video = true, dir = c.getString(10) ?: ""))
                        continue
                    }
                    val taken = c.getLong(2).takeIf { it > 0 } ?: (c.getLong(3) * 1000)
                    val rotated = c.getInt(8) % 180 != 0
                    val w = c.getInt(6)
                    val h = c.getInt(7)
                    val where = ((c.getString(10) ?: "") + "/" + (c.getString(12) ?: "")).lowercase(Locale.ROOT).replace(" ", "").replace("_", "")
                    // Screen recordings: each maker names the folder its own way (Screen recordings, ScreenRecorder, Screenrecords …).
                    val rec = where.contains("screenrecord")
                    changed.add(ScanStore.Meta(id, taken, stamp, c.getLong(5), if (rotated) h else w, if (rotated) w else h,
                        c.getInt(9) == 1, false, video = true, dur = c.getLong(11), rec = rec, dir = c.getString(10) ?: ""))
                    if (changed.size >= 1000) { store.upsert(changed); changed.clear() }
                }
            }
        } catch (_: SecurityException) {
            // No access to videos: photos only.
        }
        store.fillMeta(filled)
    }

    /** MediaStore's MIME type as the scan's format: jpeg, heic, png, raw (DNG and makers' raw types) or other. */
    private fun format(mime: String?): String {
        val m = mime?.lowercase(Locale.ROOT) ?: return "other"
        return when {
            m == "image/jpeg" || m == "image/jpg" -> "jpeg"
            m == "image/heic" || m == "image/heif" || m == "image/heic-sequence" || m == "image/heif-sequence" -> "heic"
            m == "image/png" -> "png"
            m.contains("dng") || m.contains("raw") || m.startsWith("image/x-") -> "raw"
            else -> "other"
        }
    }

    private fun isVideo(id: String) = id.getOrNull(id.lastIndexOf(':') + 1) == 'v'

    private fun contentUri(id: String): Uri {
        val colon = id.lastIndexOf(':')
        val volume = id.substring(0, colon)
        return if (isVideo(id)) MediaStore.Video.Media.getContentUri(volume, id.substring(colon + 2).toLong())
        else MediaStore.Images.Media.getContentUri(volume, id.substring(colon + 1).toLong())
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
        if (!isVideo(id)) try {
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

    /**
     * Phase 3: the on-device AI over each analysed photo it has not seen (docs/AI.md). Stops for now when the
     * phone gets hot (thermal status severe or worse) — the next scan goes on where this one stopped.
     */
    private fun analyseAI() {
        if (!embedderTried) {
            embedderTried = true
            embedder = try {
                val installed = context.packageManager.getPackageInfo(context.packageName, 0).lastUpdateTime
                ImageEmbedder.fromAssets(context, installed)
            } catch (_: Throwable) { null }
        }
        val model = embedder ?: return
        val total = store.aiPendingCount()
        if (total == 0) return
        val power = context.getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
        var done = 0
        progress("ai", 0, total)
        while (!cancelled.get()) {
            if (power.currentThermalStatus >= android.os.PowerManager.THERMAL_STATUS_SEVERE) break
            val ids = store.aiPending(AI_BATCH)
            if (ids.isEmpty()) break
            val results = ArrayList<ScanStore.AIResult>(ids.size)
            for (id in ids) {
                if (cancelled.get()) break
                val video = isVideo(id)
                val result = try {
                    // A video's thumbnail is its poster frame: its vector, and the full embedding for lookalike videos.
                    val bmp = context.contentResolver.loadThumbnail(contentUri(id), Size(FeatureMath.LONG_SIDE, FeatureMath.LONG_SIDE), null)
                    val fitted = fit(bmp)
                    try {
                        val emb = model.embed(fitted)
                        val vec = ImageEmbedder.packed(model.compact(emb))
                        if (video) ScanStore.AIResult(id, vec, ImageEmbedder.packed(emb)) else ScanStore.AIResult(id, vec)
                    } finally {
                        if (fitted !== bmp) fitted.recycle()
                        bmp.recycle()
                    }
                } catch (_: Exception) { ScanStore.AIResult(id, null) }
                results.add(result)
            }
            store.storeAI(results)
            done += results.size
            progress("ai", minOf(done, total), total)
        }
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

    /** The compact vectors of these photos (src/logic/vectors.ts asks for the ones it lacks, PAGE at a time). */
    @PluginMethod
    fun getVectors(call: PluginCall) {
        val ids = call.getArray("ids")?.toList<String>()?.take(5000) ?: emptyList()
        io.execute {
            try {
                call.resolve(JSObject().put("rows", store.vectors(ids)))
            } catch (e: Exception) {
                call.reject("Could not read the cache", e)
            }
        }
    }

    private var faceDetector: FaceDetector? = null
    private var faceDetectorTried = false

    /**
     * Faces for a few photos (a similar group), cached: YuNet in ONNX Runtime (FaceDetector — never ML Kit, it
     * reports to Google). How many faces and how sharp the best one is; Android has no open-eyes score.
     */
    @PluginMethod
    fun scoreFaces(call: PluginCall) {
        val ids = call.getArray("ids")?.toList<String>()?.take(60) ?: emptyList()
        io.execute {
            try {
                val known = store.faces(ids)
                val missing = ids.filter { it !in known && !isVideo(it) }
                val fresh = ArrayList<Triple<String, Int, Double?>>()
                if (missing.isNotEmpty()) {
                    val detector = faceDetector ?: if (faceDetectorTried) null else {
                        faceDetectorTried = true
                        try {
                            val installed = context.packageManager.getPackageInfo(context.packageName, 0).lastUpdateTime
                            FaceDetector(File(ImageEmbedder.assetsDir(context, installed), "faces.onnx")).also { faceDetector = it }
                        } catch (_: Throwable) { null }
                    }
                    if (detector != null) for (id in missing) {
                        try {
                            val bmp = context.contentResolver.loadThumbnail(contentUri(id), Size(FaceDetector.SIZE, FaceDetector.SIZE), null)
                            val (w, h) = FeatureMath.fitSize(bmp.width, bmp.height, FaceDetector.SIZE)
                            val fitted = if (w == bmp.width && h == bmp.height) bmp else Bitmap.createScaledBitmap(bmp, w, h, true)
                            try {
                                val (faces, grey) = detector.detect(fitted)
                                val (n, q) = FaceDetector.quality(faces, grey, fitted.width, fitted.height)
                                fresh.add(Triple(id, n, q))
                            } finally {
                                if (fitted !== bmp) fitted.recycle()
                                bmp.recycle()
                            }
                        } catch (_: Exception) { /* gone, or no local copy: ranked without faces */ }
                    }
                    store.storeFaces(fresh)
                }
                val rows = JSArray()
                for (id in ids) {
                    known[id]?.let { rows.put(it) }
                        ?: fresh.firstOrNull { it.first == id }?.let { (_, n, q) -> rows.put(JSObject().put("id", id).put("faces", n).apply { if (q != null) put("faceQ", q) }) }
                }
                call.resolve(JSObject().put("rows", rows))
            } catch (e: Exception) {
                call.reject("Could not score faces", e)
            }
        }
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

    /**
     * Photos filed into albums while swiping. On Android an album is a folder: the photos move into it
     * (RELATIVE_PATH — an existing folder's path, or Pictures/<title>/ for a new one) after one
     * createWriteRequest dialog for all of them. The files themselves are never changed or copied.
     */
    @PluginMethod
    fun addToAlbums(call: PluginCall) {
        val dryRun = call.getBoolean("dryRun", false) == true
        val target = HashMap<String, String>()
        val raw = call.getArray("groups") ?: JSArray()
        for (i in 0 until raw.length()) {
            val g = raw.optJSONObject(i) ?: continue
            val path = g.optString("albumId").takeIf { it.isNotBlank() }
                ?: g.optString("title").replace(Regex("[\\\\/:*?\"<>|\\p{Cntrl}]"), " ").trim().take(80).takeIf { it.isNotEmpty() }
                    ?.let { "${Environment.DIRECTORY_PICTURES}/$it/" }
                ?: continue
            val ids = g.optJSONArray("ids") ?: continue
            for (j in 0 until ids.length()) ids.optString(j).takeIf { it.contains(':') }?.let { target[it] = path }
        }
        if (dryRun || target.isEmpty()) {
            call.resolve(JSObject().put("done", target.size).put("cancelled", false).put("dryRun", dryRun))
            return
        }
        val byUri = target.keys.associateBy { contentUri(it) }
        withConsent(byUri.keys.toList(), { MediaStore.createWriteRequest(context.contentResolver, it) }) { approved, cancelled ->
            if (cancelled) {
                call.resolve(JSObject().put("done", 0).put("cancelled", true).put("dryRun", false))
                return@withConsent
            }
            io.execute {
                var done = 0
                for (uri in approved) {
                    val path = byUri[uri]?.let { target[it] } ?: continue
                    val values = ContentValues().apply { put(MediaStore.MediaColumns.RELATIVE_PATH, path) }
                    try { if (context.contentResolver.update(uri, values, null, null) > 0) done++ } catch (_: Exception) { }
                }
                call.resolve(JSObject().put("done", done).put("cancelled", false).put("dryRun", false))
            }
        }
    }

    /**
     * A video played inside the app ([VideoPlayer]) — never handed to another
     * app. Resolves when the player closes; rejects if the phone can't play it.
     */
    @PluginMethod
    fun preview(call: PluginCall) {
        val id = call.getString("id")?.takeIf { it.contains(':') && isVideo(it) } ?: run { call.reject("No video"); return }
        val closeLabel = call.getString("closeLabel") ?: "Close"
        val biggerLabel = call.getString("biggerLabel") ?: "Bigger"
        val smallerLabel = call.getString("smallerLabel") ?: "Smaller"
        activity.runOnUiThread {
            VideoPlayer.show(activity, contentUri(id), closeLabel, biggerLabel, smallerLabel) { failed ->
                if (failed) call.reject("Cannot play this video", "PLAYBACK") else call.resolve()
            }
        }
    }

    /**
     * Android's "albums" for Settings › Geschützt: every folder (RELATIVE_PATH)
     * that holds photos or videos, titled by its last part, with how many.
     */
    @PluginMethod
    fun listAlbums(call: PluginCall) {
        io.execute {
            val counts = LinkedHashMap<String, Int>()
            for (uri in listOf(MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL), MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL))) {
                try {
                    context.contentResolver.query(uri, arrayOf(MediaStore.MediaColumns.RELATIVE_PATH), null, null, null)?.use { c ->
                        while (c.moveToNext()) {
                            val path = c.getString(0) ?: continue
                            counts[path] = (counts[path] ?: 0) + 1
                        }
                    }
                } catch (_: SecurityException) { /* no access to videos: photos only */ }
            }
            val albums = JSArray()
            for ((path, count) in counts.entries.sortedBy { it.key.lowercase(Locale.ROOT) }) {
                val title = path.trimEnd('/').substringAfterLast('/').ifEmpty { path }
                albums.put(JSObject().put("id", path).put("title", title).put("count", count))
            }
            call.resolve(JSObject().put("albums", albums))
        }
    }

    /** The photo and video ids in these folders (asked once per load, for the protected ones only). */
    @PluginMethod
    fun albumMembers(call: PluginCall) {
        val paths = call.getArray("ids")?.toList<String>()?.filter { it.isNotEmpty() } ?: emptyList()
        io.execute {
            val out = JSArray()
            if (paths.isNotEmpty()) {
                val where = "${MediaStore.MediaColumns.RELATIVE_PATH} IN (${paths.joinToString(",") { "?" }})"
                val args = paths.toTypedArray()
                val sources = listOf(
                    MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL) to "",
                    MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL) to "v",
                )
                for ((uri, prefix) in sources) {
                    try {
                        context.contentResolver.query(uri, arrayOf(android.provider.BaseColumns._ID, MediaStore.MediaColumns.VOLUME_NAME), where, args, null)?.use { c ->
                            while (c.moveToNext()) {
                                val volume = c.getString(1) ?: MediaStore.VOLUME_EXTERNAL_PRIMARY
                                out.put("$volume:$prefix${c.getLong(0)}")
                            }
                        }
                    } catch (_: SecurityException) { /* no access to videos: photos only */ }
                }
            }
            call.resolve(JSObject().put("ids", out))
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

    /* -------------------------------------- Live Photos and smaller videos */

    /** Live Photos are the iPhone's; Android's motion photos are not touched. */
    @PluginMethod
    fun convertLive(call: PluginCall) {
        call.reject("Live Photos exist on the iPhone only")
    }

    private data class VideoInfo(val size: Long, val dur: Long, val path: String?, val name: String?, val taken: Long)

    private fun videoInfo(uri: Uri): VideoInfo? = context.contentResolver.query(
        uri,
        arrayOf(MediaStore.MediaColumns.SIZE, MediaStore.MediaColumns.DURATION, MediaStore.MediaColumns.RELATIVE_PATH,
            MediaStore.MediaColumns.DISPLAY_NAME, MediaStore.Video.Media.DATE_TAKEN),
        null, null, null,
    )?.use { c -> if (c.moveToFirst()) VideoInfo(c.getLong(0), c.getLong(1), c.getString(2), c.getString(3), c.getLong(4)) else null }

    /**
     * A smaller copy of a video: re-encoded (HEVC where the phone has an
     * encoder, else what it falls back to) at about a third of its bitrate,
     * between 2 and 8 Mbit/s, saved next to it with the same date. Nothing is
     * saved when that would not be at least 20 % smaller, or in a dry run.
     * The original stays; the web layer asks to trash it (the system's dialog).
     */
    @androidx.annotation.OptIn(markerClass = [UnstableApi::class])
    @PluginMethod
    fun compressVideo(call: PluginCall) {
        val id = call.getString("id") ?: return call.reject("No id")
        if (!isVideo(id)) return call.reject("Not a video")
        val dryRun = call.getBoolean("dryRun", false) == true
        val source = contentUri(id)
        io.execute {
            val info = try { videoInfo(source) } catch (_: Exception) { null }
            if (info == null || info.size <= 0 || info.dur <= 0) { call.reject("Video not found"); return@execute }
            val bitrate = info.size * 8_000 / info.dur
            val target = (bitrate / 3).coerceIn(2_000_000L, 8_000_000L)
            val expected = target * info.dur / 8_000
            if (dryRun || expected > info.size * 8 / 10) {
                call.resolve(JSObject().put("created", org.json.JSONObject.NULL).put("before", info.size).put("after", expected).put("dryRun", dryRun))
                return@execute
            }
            val out = File(context.cacheDir, "compress-${System.currentTimeMillis()}.mp4")
            main.post { startTransformer(call, id, source, out, info, target.toInt()) }
        }
    }

    @androidx.annotation.OptIn(markerClass = [UnstableApi::class])
    private fun startTransformer(call: PluginCall, id: String, source: Uri, out: File, info: VideoInfo, bitrate: Int) {
        val holder = ProgressHolder()
        var transformer: Transformer? = null
        val poll = object : Runnable {
            override fun run() {
                val t = transformer ?: return
                if (t.getProgress(holder) == Transformer.PROGRESS_STATE_AVAILABLE) {
                    notifyListeners("compressProgress", JSObject().put("id", id).put("progress", holder.progress / 100.0))
                }
                main.postDelayed(this, 300)
            }
        }
        val encoders = DefaultEncoderFactory.Builder(context)
            .setRequestedVideoEncoderSettings(VideoEncoderSettings.Builder().setBitrate(bitrate).build())
            .setEnableFallback(true)
            .build()
        val built = Transformer.Builder(context)
            .setVideoMimeType(MimeTypes.VIDEO_H265)
            .setEncoderFactory(encoders)
            .addListener(object : Transformer.Listener {
                override fun onCompleted(composition: Composition, exportResult: ExportResult) {
                    main.removeCallbacks(poll)
                    io.execute { saveCompressed(call, out, info) }
                }

                override fun onError(composition: Composition, exportResult: ExportResult, exportException: ExportException) {
                    main.removeCallbacks(poll)
                    out.delete()
                    call.reject("Could not make the video smaller", exportException)
                }
            })
            .build()
        transformer = built
        try {
            built.start(MediaItem.fromUri(source), out.absolutePath)
            main.postDelayed(poll, 300)
        } catch (e: Exception) {
            out.delete()
            call.reject("Could not make the video smaller", e)
        }
    }

    /** The finished copy into MediaStore, next to the original (its folder, its date); pending until written. */
    private data class PhotoInfo(val size: Long, val path: String?, val name: String?, val taken: Long, val fav: Boolean, val mime: String?)

    private fun photoInfo(uri: Uri): PhotoInfo? = context.contentResolver.query(
        uri,
        arrayOf(MediaStore.MediaColumns.SIZE, MediaStore.MediaColumns.RELATIVE_PATH, MediaStore.MediaColumns.DISPLAY_NAME,
            MediaStore.Images.Media.DATE_TAKEN, MediaStore.MediaColumns.IS_FAVORITE, MediaStore.MediaColumns.MIME_TYPE),
        null, null, null,
    )?.use { c -> if (c.moveToFirst()) PhotoInfo(c.getLong(0), c.getString(1), c.getString(2), c.getLong(3), c.getInt(4) == 1, c.getString(5)) else null }

    /**
     * "Fotos verkleinern": each JPEG or PNG re-encoded — HEIC (HeifWriter, quality 80) when the phone has
     * an HEVC encoder, else JPEG at quality 82 — with its EXIF copied (orientation, date, GPS …), saved next to
     * the original (same folder, same DATE_TAKEN, IS_PENDING while written) and kept only when at least 30 %
     * smaller. The originals stay; the web layer asks to trash them (createTrashRequest, the system's dialog).
     * A dry run encodes but writes nothing. One batch (≤ 20) per call; progress as `compressProgress` "photos".
     */
    @PluginMethod
    fun compressPhotos(call: PluginCall) {
        val list = ids(call).filter { !isVideo(it) }
        val dryRun = call.getBoolean("dryRun", false) == true
        work.execute {
            val results = JSArray()
            list.forEachIndexed { i, id ->
                try { compressOne(id, dryRun)?.let { results.put(it) } } catch (_: Exception) { /* skipped: unreadable or no room */ }
                notifyListeners("compressProgress", JSObject().put("id", "photos").put("progress", (i + 1).toDouble() / list.size))
            }
            call.resolve(JSObject().put("results", results).put("dryRun", dryRun))
        }
    }

    private fun compressOne(id: String, dryRun: Boolean): JSObject? {
        val source = contentUri(id)
        val info = photoInfo(source) ?: return null
        val resolver = context.contentResolver
        val original = resolver.openInputStream(source)?.use { it.readBytes() } ?: return null
        val exif = ExifInterface(original.inputStream())
        val exifBlock = exifBlock(original)
        // Decoded as stored (BitmapFactory leaves the EXIF orientation alone): the copy keeps the orientation tag / rotation.
        val bmp = BitmapFactory.decodeByteArray(original, 0, original.size) ?: return null
        val out = File(context.cacheDir, "smaller-${System.nanoTime()}")
        try {
            val heic = try {
                val writer = HeifWriter.Builder(out.path, bmp.width, bmp.height, HeifWriter.INPUT_MODE_BITMAP)
                    .setQuality(HEIC_QUALITY).setRotation(exif.rotationDegrees).build()
                writer.start()
                writer.addBitmap(bmp)
                if (exifBlock != null) writer.addExifData(0, exifBlock, 0, exifBlock.size)
                writer.stop(30_000)
                writer.close()
                true
            } catch (_: Exception) {
                // No HEVC encoder on this phone: a JPEG at quality 82 instead, its EXIF copied tag by tag.
                out.outputStream().use { bmp.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, it) }
                copyExif(exif, out)
                false
            }
            val after = out.length()
            if (after <= 0 || after > info.size * (1 - KEEP_MIN_SAVING)) return null
            if (dryRun) return JSObject().put("from", id).put("to", "").put("before", info.size).put("after", after)
            val base = (info.name ?: "Bildklar").substringBeforeLast('.')
            val values = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, if (heic) "$base.heic" else "$base-klein.jpg")
                put(MediaStore.MediaColumns.MIME_TYPE, if (heic) "image/heic" else "image/jpeg")
                put(MediaStore.MediaColumns.RELATIVE_PATH, info.path?.takeIf { it.isNotBlank() } ?: "${Environment.DIRECTORY_PICTURES}/")
                if (info.taken > 0) put(MediaStore.Images.Media.DATE_TAKEN, info.taken)
                if (info.fav) put(MediaStore.MediaColumns.IS_FAVORITE, 1)
                put(MediaStore.MediaColumns.IS_PENDING, 1)
            }
            val uri = resolver.insert(MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY), values) ?: return null
            resolver.openOutputStream(uri)?.use { stream -> out.inputStream().use { it.copyTo(stream) } }
                ?: run { resolver.delete(uri, null, null); return null }
            values.clear()
            values.put(MediaStore.MediaColumns.IS_PENDING, 0)
            resolver.update(uri, values, null, null)
            val created = "${MediaStore.VOLUME_EXTERNAL_PRIMARY}:${ContentUris.parseId(uri)}"
            return JSObject().put("from", id).put("to", created).put("before", info.size).put("after", after)
        } finally {
            bmp.recycle()
            out.delete()
        }
    }

    /** A JPEG's EXIF block as HeifWriter wants it ("Exif\0\0" then the TIFF header), or null (a PNG, or none). */
    private fun exifBlock(jpeg: ByteArray): ByteArray? {
        if (jpeg.size < 4 || jpeg[0] != 0xFF.toByte() || jpeg[1] != 0xD8.toByte()) return null
        var i = 2
        while (i + 4 <= jpeg.size && jpeg[i] == 0xFF.toByte()) {
            val marker = jpeg[i + 1].toInt() and 0xFF
            val length = ((jpeg[i + 2].toInt() and 0xFF) shl 8) or (jpeg[i + 3].toInt() and 0xFF)
            if (marker == 0xDA || length < 2) return null
            val start = i + 4
            if (marker == 0xE1 && start + 6 <= jpeg.size && String(jpeg, start, 4, Charsets.US_ASCII) == "Exif") {
                return jpeg.copyOfRange(start, minOf(jpeg.size, i + 2 + length))
            }
            i += 2 + length
        }
        return null
    }

    /** The EXIF the copy keeps when it is a JPEG: when, where, how, which way up. */
    private fun copyExif(from: ExifInterface, file: File) {
        val to = ExifInterface(file.path)
        for (tag in EXIF_TAGS) from.getAttribute(tag)?.let { to.setAttribute(tag, it) }
        to.saveAttributes()
    }

    private fun saveCompressed(call: PluginCall, out: File, info: VideoInfo) {
        try {
            val after = out.length()
            if (after <= 0 || after > info.size * 8 / 10) {
                call.resolve(JSObject().put("created", org.json.JSONObject.NULL).put("before", info.size).put("after", after).put("dryRun", false))
                return
            }
            val base = (info.name ?: "video").substringBeforeLast('.')
            val values = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, "$base-klein.mp4")
                put(MediaStore.MediaColumns.MIME_TYPE, "video/mp4")
                put(MediaStore.MediaColumns.RELATIVE_PATH, info.path?.takeIf { it.isNotBlank() } ?: "${android.os.Environment.DIRECTORY_MOVIES}/")
                if (info.taken > 0) put(MediaStore.Video.Media.DATE_TAKEN, info.taken)
                put(MediaStore.MediaColumns.IS_PENDING, 1)
            }
            val resolver = context.contentResolver
            val uri = resolver.insert(MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY), values)
                ?: throw IllegalStateException("No place for the video")
            resolver.openOutputStream(uri)?.use { stream -> out.inputStream().use { it.copyTo(stream) } }
                ?: throw IllegalStateException("Cannot write the video")
            values.clear()
            values.put(MediaStore.MediaColumns.IS_PENDING, 0)
            resolver.update(uri, values, null, null)
            val created = "${MediaStore.VOLUME_EXTERNAL_PRIMARY}:v${ContentUris.parseId(uri)}"
            call.resolve(JSObject().put("created", created).put("before", info.size).put("after", after).put("dryRun", false))
        } catch (e: Exception) {
            call.reject("Could not save the smaller video", e)
        } finally {
            out.delete()
        }
    }

    /* ------------------------------------------------------------ widget */

    /** What the home-screen widget shows: a title, a line (in the app's language) and, for "On this day", a photo. */
    @PluginMethod
    fun setWidget(call: PluginCall) {
        val title = call.getString("title") ?: "Bildklar"
        val line = call.getString("line") ?: ""
        val photoId = call.getString("photoId")
        io.execute {
            context.getSharedPreferences(BildklarWidget.PREFS, Context.MODE_PRIVATE).edit()
                .putString("title", title).putString("line", line).apply()
            val image = File(context.filesDir, BildklarWidget.IMAGE)
            try {
                if (photoId != null && photoId.contains(':')) {
                    val bmp = context.contentResolver.loadThumbnail(contentUri(photoId), Size(600, 600), null)
                    val tmp = File(context.filesDir, BildklarWidget.IMAGE + ".tmp")
                    tmp.outputStream().use { bmp.compress(Bitmap.CompressFormat.JPEG, 80, it) }
                    bmp.recycle()
                    tmp.renameTo(image)
                } else {
                    image.delete()
                }
            } catch (_: Exception) {
                image.delete()
            }
            BildklarWidget.refresh(context)
            call.resolve()
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
        /** Photos per AI batch (and per progress event): one picture at a time through the model, its threads do the rest. */
        private const val AI_BATCH = 16
        /** The thumbnails' size cap in the cache folder. */
        private const val THUMB_CAP = 200L * 1024 * 1024
        /** URIs per MediaStore request: well inside a binder transaction's limit. */
        private const val REQUEST_CHUNK = 1500
        /** "Fotos verkleinern" (provisional, like the plan's other numbers; src/logic/compress.ts KEEP_MIN_SAVING). */
        private const val HEIC_QUALITY = 80
        private const val JPEG_QUALITY = 82
        private const val KEEP_MIN_SAVING = 0.3
        /** What a JPEG copy keeps of the original's EXIF. */
        private val EXIF_TAGS = listOf(
            ExifInterface.TAG_ORIENTATION, ExifInterface.TAG_DATETIME, ExifInterface.TAG_DATETIME_ORIGINAL, ExifInterface.TAG_DATETIME_DIGITIZED,
            ExifInterface.TAG_OFFSET_TIME, ExifInterface.TAG_OFFSET_TIME_ORIGINAL, ExifInterface.TAG_OFFSET_TIME_DIGITIZED,
            ExifInterface.TAG_SUBSEC_TIME, ExifInterface.TAG_SUBSEC_TIME_ORIGINAL, ExifInterface.TAG_SUBSEC_TIME_DIGITIZED,
            ExifInterface.TAG_GPS_LATITUDE, ExifInterface.TAG_GPS_LATITUDE_REF, ExifInterface.TAG_GPS_LONGITUDE, ExifInterface.TAG_GPS_LONGITUDE_REF,
            ExifInterface.TAG_GPS_ALTITUDE, ExifInterface.TAG_GPS_ALTITUDE_REF, ExifInterface.TAG_GPS_TIMESTAMP, ExifInterface.TAG_GPS_DATESTAMP,
            ExifInterface.TAG_MAKE, ExifInterface.TAG_MODEL, ExifInterface.TAG_SOFTWARE, ExifInterface.TAG_ARTIST, ExifInterface.TAG_COPYRIGHT,
            ExifInterface.TAG_IMAGE_DESCRIPTION, ExifInterface.TAG_USER_COMMENT,
            ExifInterface.TAG_F_NUMBER, ExifInterface.TAG_EXPOSURE_TIME, ExifInterface.TAG_PHOTOGRAPHIC_SENSITIVITY, ExifInterface.TAG_FOCAL_LENGTH,
            ExifInterface.TAG_FOCAL_LENGTH_IN_35MM_FILM, ExifInterface.TAG_FLASH, ExifInterface.TAG_WHITE_BALANCE, ExifInterface.TAG_LENS_MAKE,
            ExifInterface.TAG_LENS_MODEL,
        )
    }
}
