package com.habboubah.bildklar

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import android.content.Context
import android.graphics.Bitmap
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer

/**
 * The on-device AI's shared image model (docs/AI.md) — the counterpart of
 * ImageEmbedder.swift, checked against the same golden fixtures
 * (fixtures/ai/expected.json, ImageEmbedderTest).
 *
 * SigLIP 2's image encoder (ai-assets/image.onnx, Apache 2.0) runs in ONNX
 * Runtime on the CPU. A photo becomes a 768-number embedding, and that becomes
 * the 256-number compact vector the scan stores (ai-assets/compact.bin, a
 * fixed projection): the app scores its labels, finds look-alikes and
 * searches from it (src/logic/vectors.ts). Nothing leaves the phone: ONNX
 * Runtime is a library inside the app, the model and the projection ship in
 * the APK's assets/ai/ (copied from the repository's ai-assets/ at build time).
 *
 * Not thread-safe: the plugin uses one instance from its scan thread.
 */
class ImageEmbedder(directory: File) : AutoCloseable {

    companion object {
        /** Bump with src/logic/ai.ts AI_VERSION, vectors.json and ImageEmbedder.swift: every photo gets its AI pass again. */
        const val AI_VERSION = 2
        private const val ASSETS = "ai"
        private val FILES = listOf("image.onnx", "compact.bin", "vectors.json", "faces.onnx")

        /**
         * The AI's files from the APK, in the app's files. ONNX Runtime opens a model by path
         * (reading 76 MB into memory instead would double what the model costs), so the assets
         * are copied there once per app version. The face detector (FaceDetector) uses the same folder.
         */
        @Synchronized
        fun assetsDir(context: Context, appVersion: Long): File {
            val dir = File(context.filesDir, "ai")
            val stamp = File(dir, "version")
            if (!stamp.exists() || stamp.readText() != "$appVersion") {
                dir.mkdirs()
                for (name in FILES) {
                    val tmp = File(dir, "$name.tmp")
                    context.assets.open("$ASSETS/$name").use { input -> tmp.outputStream().use { input.copyTo(it) } }
                    if (!tmp.renameTo(File(dir, name))) throw IllegalStateException("Could not place $name")
                }
                stamp.writeText("$appVersion")
            }
            return dir
        }

        /** The model from the APK (see assetsDir). */
        fun fromAssets(context: Context, appVersion: Long): ImageEmbedder = ImageEmbedder(assetsDir(context, appVersion))

        /**
         * A vector as int8 values in base64 (768 bytes → 1,024 characters; a compact vector 256 → 344), each
         * scaled by its own largest value — the cosine between two vectors does not notice. Matches
         * ImageEmbedder.swift `packed` and ml/compactlib.py `pack`.
         */
        fun packed(e: FloatArray): String {
            var top = 0f
            for (x in e) top = maxOf(top, kotlin.math.abs(x))
            val k = if (top > 0f) 127f / top else 0f
            val bytes = ByteArray(e.size) { i -> Math.round(e[i] * k).coerceIn(-127, 127).toByte() }
            return java.util.Base64.getEncoder().encodeToString(bytes)
        }

        /** ARGB pixels (row-major, `size` × `size`) → [3, size, size], (x / 255 − 0.5) / 0.5. */
        fun normalise(argb: IntArray, size: Int): FloatArray {
            val plane = size * size
            val out = FloatArray(3 * plane)
            for (i in 0 until plane) {
                val p = argb[i]
                out[i] = ((p shr 16) and 0xFF) / 127.5f - 1f
                out[plane + i] = ((p shr 8) and 0xFF) / 127.5f - 1f
                out[2 * plane + i] = (p and 0xFF) / 127.5f - 1f
            }
            return out
        }

        /** A number field of vectors.json (read by hand: Android's JSON classes don't run in unit tests). */
        fun number(json: String, key: String): Double =
            Regex("\"${Regex.escape(key)}\"\\s*:\\s*(-?[0-9.eE+-]+)").find(json)?.groupValues?.get(1)?.toDouble()
                ?: throw IllegalArgumentException("vectors.json has no $key")

        /** float16 little-endian → Float. */
        fun halfFloats(bytes: ByteArray): FloatArray {
            val buf = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
            return FloatArray(bytes.size / 2) { halfToFloat(buf.getShort(it * 2).toInt() and 0xFFFF) }
        }

        private fun halfToFloat(h: Int): Float {
            val sign = (h shr 15) and 1
            val exp = (h shr 10) and 0x1F
            val mant = h and 0x3FF
            val bits = when {
                exp == 0 && mant == 0 -> sign shl 31
                exp == 0 -> { // subnormal: normalise it
                    var e = -1
                    var m = mant
                    while (m and 0x400 == 0) { m = m shl 1; e-- }
                    (sign shl 31) or ((e + 1 + 127 - 15) shl 23) or ((m and 0x3FF) shl 13)
                }
                exp == 0x1F -> (sign shl 31) or (0xFF shl 23) or (mant shl 13)
                else -> (sign shl 31) or ((exp - 15 + 127) shl 23) or (mant shl 13)
            }
            return Float.fromBits(bits)
        }
    }

    val size: Int
    val dim: Int
    val vecDim: Int
    /** vecDim × dim, row-major. */
    private val projection: FloatArray
    private val env: OrtEnvironment = OrtEnvironment.getEnvironment()
    private val session: OrtSession

    init {
        val meta = File(directory, "vectors.json").readText()
        require(number(meta, "aiVersion").toInt() == AI_VERSION) { "vectors.json does not match this build" }
        size = number(meta, "size").toInt()
        dim = number(meta, "dim").toInt()
        vecDim = number(meta, "vecDim").toInt()
        projection = halfFloats(File(directory, "compact.bin").readBytes())
        require(projection.size == vecDim * dim) { "compact.bin has the wrong size" }
        val options = OrtSession.SessionOptions().apply {
            setIntraOpNumThreads(2)
            setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT)
        }
        session = env.createSession(File(directory, "image.onnx").path, options)
    }

    /** The model's input from a bitmap: squeezed to size × size (no crop, bilinear), RGB, −1 … 1, channels first. */
    fun pixels(bmp: Bitmap): FloatArray {
        val scaled = if (bmp.width == size && bmp.height == size) bmp else Bitmap.createScaledBitmap(bmp, size, size, true)
        val argb = IntArray(size * size)
        scaled.getPixels(argb, 0, size, 0, 0, size, size)
        if (scaled !== bmp) scaled.recycle()
        return normalise(argb, size)
    }

    /** The embedding (L2-normalised by the model) for one prepared input. */
    fun embedding(pixels: FloatArray): FloatArray =
        OnnxTensor.createTensor(env, FloatBuffer.wrap(pixels), longArrayOf(1, 3, size.toLong(), size.toLong())).use { input ->
            session.run(mapOf("pixels" to input)).use { result ->
                @Suppress("UNCHECKED_CAST")
                (result[0].value as Array<FloatArray>)[0]
            }
        }

    /** The compact vector of an embedding: the projection, L2-normalised (ml/compactlib.py `compact`). */
    fun compact(embedding: FloatArray): FloatArray {
        val out = FloatArray(vecDim)
        var norm = 0f
        for (r in 0 until vecDim) {
            var dot = 0f
            val row = r * dim
            for (i in 0 until dim) dot += embedding[i] * projection[row + i]
            out[r] = dot
            norm += dot * dot
        }
        val k = if (norm > 0f) 1f / kotlin.math.sqrt(norm) else 0f
        for (r in 0 until vecDim) out[r] *= k
        return out
    }

    /** The picture's embedding (a video's poster frame: lookalike videos, src/logic/lookalike.ts). */
    fun embed(bmp: Bitmap): FloatArray = embedding(pixels(bmp))

    override fun close() {
        session.close()
    }
}
