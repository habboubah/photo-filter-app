package com.habboubah.bildklar

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import android.graphics.Bitmap
import java.io.File
import java.nio.FloatBuffer
import kotlin.math.exp
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

/**
 * Faces on Android (docs/AI.md, "Faces on Android"): YuNet (OpenCV Zoo,
 * face_detection_yunet_2023mar, MIT licence, 0.23 MB) in ONNX Runtime — the
 * iPhone has Vision for this, and ML Kit is out (it reports to Google). It
 * gives the best shot of a similar group what the iPhone's face scores give
 * it (src/logic/best.ts): how many faces, and how good the best one is — here
 * how sharp the face itself is, so a sharp background behind a blurred child
 * loses. Android has no open-eyes score.
 *
 * ml/faces.py is the Python reference (the same input, decoding and
 * suppression, checked against OpenCV's own FaceDetectorYN);
 * FaceDetectorTest checks this class against its fixtures.
 *
 * Not thread-safe: the plugin uses one instance from its scan thread.
 */
class FaceDetector(model: File) : AutoCloseable {

    /** A face in the picture's pixels: its box, the detector's score (0–1) and five landmarks (eyes, nose, mouth corners). */
    data class Face(val x: Float, val y: Float, val w: Float, val h: Float, val score: Float, val marks: FloatArray)

    companion object {
        const val SIZE = 640
        const val SCORE_MIN = 0.6f
        const val NMS_IOU = 0.3f
        private val STRIDES = intArrayOf(8, 16, 32)
        /** A face smaller than this share of the picture's short side does not count (a crowd far away). */
        const val MIN_FACE = 0.04f
        /** The face's sharpness that counts as fully sharp (the Laplacian's variance, log scale). */
        private const val SHARP_FACE = 300.0

        /**
         * The model's input from ARGB pixels at most SIZE × SIZE: on black at the top left, BGR 0–255, channels
         * first (what OpenCV's blobFromImage gives YuNet).
         */
        fun input(argb: IntArray, w: Int, h: Int): FloatArray {
            require(w in 1..SIZE && h in 1..SIZE) { "fit the picture into $SIZE × $SIZE first" }
            val plane = SIZE * SIZE
            val out = FloatArray(3 * plane)
            for (y in 0 until h) for (x in 0 until w) {
                val p = argb[y * w + x]
                val i = y * SIZE + x
                out[i] = (p and 0xFF).toFloat()                     // B
                out[plane + i] = ((p shr 8) and 0xFF).toFloat()     // G
                out[2 * plane + i] = ((p shr 16) and 0xFF).toFloat() // R
            }
            return out
        }

        /** The faces in the model's outputs (`cls_8` … `kps_32`, each flattened), in input pixels, before suppression. */
        fun decode(out: Map<String, FloatArray>, scoreMin: Float = SCORE_MIN): List<Face> {
            val faces = ArrayList<Face>()
            for (stride in STRIDES) {
                val cls = out.getValue("cls_$stride")
                val obj = out.getValue("obj_$stride")
                val bbox = out.getValue("bbox_$stride")
                val kps = out.getValue("kps_$stride")
                val cols = SIZE / stride
                for (idx in cls.indices) {
                    val score = sqrt(cls[idx].coerceIn(0f, 1f) * obj[idx].coerceIn(0f, 1f))
                    if (score < scoreMin) continue
                    val r = idx / cols
                    val c = idx % cols
                    val cx = (c + bbox[idx * 4]) * stride
                    val cy = (r + bbox[idx * 4 + 1]) * stride
                    val w = exp(bbox[idx * 4 + 2]) * stride
                    val h = exp(bbox[idx * 4 + 3]) * stride
                    val marks = FloatArray(10) { k -> (kps[idx * 10 + k] + if (k % 2 == 0) c else r) * stride }
                    faces.add(Face(cx - w / 2, cy - h / 2, w, h, score, marks))
                }
            }
            return faces
        }

        private fun iou(a: Face, b: Face): Float {
            val iw = max(0f, min(a.x + a.w, b.x + b.w) - max(a.x, b.x))
            val ih = max(0f, min(a.y + a.h, b.y + b.h) - max(a.y, b.y))
            val inter = iw * ih
            val union = a.w * a.h + b.w * b.h - inter
            return if (union > 0f) inter / union else 0f
        }

        /** Non-maximum suppression: the best face of each place. */
        fun suppress(faces: List<Face>): List<Face> {
            val kept = ArrayList<Face>()
            for (f in faces.sortedByDescending { it.score }) if (kept.all { iou(f, it) <= NMS_IOU }) kept.add(f)
            return kept
        }

        /**
         * What the scan stores for a photo (Photo.faces, Photo.faceQ): the faces large enough to count, and the best
         * one's quality — its detector score times how sharp the face is (the Laplacian's variance of its grey crop,
         * 0–1 on a log scale). `grey`: the picture in grey, `w` × `h`, the same pixels the faces were found in.
         */
        fun quality(faces: List<Face>, grey: ByteArray, w: Int, h: Int): Pair<Int, Double?> {
            val big = faces.filter { min(it.w, it.h) >= MIN_FACE * min(w, h) }
            if (big.isEmpty()) return 0 to null
            var best = 0.0
            for (f in big) {
                val x0 = max(0, f.x.toInt())
                val y0 = max(0, f.y.toInt())
                val x1 = min(w, (f.x + f.w).toInt())
                val y1 = min(h, (f.y + f.h).toInt())
                if (x1 - x0 < 8 || y1 - y0 < 8) continue
                val cw = x1 - x0
                val ch = y1 - y0
                val crop = ByteArray(cw * ch)
                for (y in 0 until ch) System.arraycopy(grey, (y0 + y) * w + x0, crop, y * cw, cw)
                val sharp = (ln(1 + FeatureMath.sharpness(crop, cw, ch)) / ln(1 + SHARP_FACE)).coerceIn(0.0, 1.0)
                best = max(best, sharp * f.score)
            }
            return big.size to best
        }
    }

    private val env: OrtEnvironment = OrtEnvironment.getEnvironment()
    private val session: OrtSession = env.createSession(model.path, OrtSession.SessionOptions().apply { setIntraOpNumThreads(2) })

    /** The faces in ARGB pixels at most SIZE × SIZE, in those pixels. */
    fun detect(argb: IntArray, w: Int, h: Int): List<Face> {
        val outputs = OnnxTensor.createTensor(env, FloatBuffer.wrap(input(argb, w, h)), longArrayOf(1, 3, SIZE.toLong(), SIZE.toLong())).use { t ->
            session.run(mapOf(session.inputNames.first() to t)).use { result ->
                val map = HashMap<String, FloatArray>()
                for ((name, value) in result) {
                    @Suppress("UNCHECKED_CAST")
                    val rows = (value.value as Array<Array<FloatArray>>)[0]
                    val flat = FloatArray(rows.size * (rows.firstOrNull()?.size ?: 0))
                    var i = 0
                    for (row in rows) for (v in row) flat[i++] = v
                    map[name] = flat
                }
                map
            }
        }
        return suppress(decode(outputs))
    }

    /** The faces in a bitmap fitted into SIZE × SIZE (the caller fits it), with its grey pixels for the quality. */
    fun detect(bmp: Bitmap): Pair<List<Face>, ByteArray> {
        val argb = IntArray(bmp.width * bmp.height)
        bmp.getPixels(argb, 0, bmp.width, 0, 0, bmp.width, bmp.height)
        return detect(argb, bmp.width, bmp.height) to FeatureMath.greyOf(argb)
    }

    override fun close() {
        session.close()
    }
}
