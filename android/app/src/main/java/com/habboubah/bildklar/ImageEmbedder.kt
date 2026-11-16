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
 * Runtime on the CPU. A photo becomes a 768-number embedding; each label's
 * score is `scale · dot(embedding, label) + bias` — stored × 10, rounded, in
 * label order (src/types.ts Photo.ai). Nothing leaves the phone: ONNX Runtime
 * is a library inside the app, the model and the label vectors ship in the
 * APK's assets/ai/ (copied from the repository's ai-assets/ at build time).
 *
 * Not thread-safe: the plugin uses one instance from its scan thread.
 */
class ImageEmbedder(directory: File) : AutoCloseable {

    companion object {
        /** Bump with src/logic/ai.ts AI_VERSION, vectors.json and ImageEmbedder.swift: every photo gets its AI pass again. */
        const val AI_VERSION = 1
        private const val ASSETS = "ai"
        private val FILES = listOf("image.onnx", "vectors.bin", "vectors.json")

        /**
         * The model from the APK. ONNX Runtime opens a file by path (reading 76 MB into
         * memory instead would double what the model costs), so the assets are copied to
         * the app's files once per app version.
         */
        fun fromAssets(context: Context, appVersion: Long): ImageEmbedder {
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
            return ImageEmbedder(dir)
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
    val labelCount: Int
    private val scale: Float
    private val bias: Float
    /** labelCount × dim, row-major. */
    private val vectors: FloatArray
    private val env: OrtEnvironment = OrtEnvironment.getEnvironment()
    private val session: OrtSession

    init {
        val meta = File(directory, "vectors.json").readText()
        require(number(meta, "aiVersion").toInt() == AI_VERSION) { "vectors.json does not match this build" }
        size = number(meta, "size").toInt()
        dim = number(meta, "dim").toInt()
        labelCount = Regex("\"kind\"").findAll(meta).count()
        scale = number(meta, "scale").toFloat()
        bias = number(meta, "bias").toFloat()
        vectors = halfFloats(File(directory, "vectors.bin").readBytes())
        require(vectors.size == labelCount * dim) { "vectors.bin has the wrong size" }
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

    /** Each label's logit for an embedding. */
    fun logits(embedding: FloatArray): FloatArray = FloatArray(labelCount) { l ->
        var dot = 0f
        val row = l * dim
        for (i in 0 until dim) dot += embedding[i] * vectors[row + i]
        scale * dot + bias
    }

    /** What the scan stores for a picture: the logits × 10, rounded (Photo.ai). */
    fun scores(bmp: Bitmap): IntArray = logits(embedding(pixels(bmp))).let { z -> IntArray(z.size) { Math.round(z[it] * 10) } }

    override fun close() {
        session.close()
    }
}
