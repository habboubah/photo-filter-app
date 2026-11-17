package com.habboubah.bildklar

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import kotlin.math.abs

/**
 * FaceDetector against the Python reference (ml/faces.py, itself checked
 * against OpenCV's FaceDetectorYN): the fixtures' faces (fixtures/faces/,
 * CC BY photos from COCO) must come out with the same boxes and scores, within
 * expected.json's tolerances. Runs ONNX Runtime's desktop library.
 * Run: npm run test:android
 */
class FaceDetectorTest {
    private val fixtures = File(System.getProperty("faceFixtures") ?: "../../fixtures/faces")
    private val assets = File(System.getProperty("aiAssets") ?: "../../ai-assets")

    @Test
    fun findsTheReferenceFaces() {
        val json = File(fixtures, "expected.json").readText()
        val box = ImageEmbedder.number(json, "box").toFloat()
        val scoreTol = ImageEmbedder.number(json, "score").toFloat()
        val cases = Regex("\"file\":\\s*\"([^\"]+)\",\\s*\"faces\":\\s*\\[(.*?)\\]\\s*\\}", RegexOption.DOT_MATCHES_ALL).findAll(json).toList()
        assertEquals(3, cases.size)
        FaceDetector(File(assets, "faces.onnx")).use { detector ->
            for (c in cases) {
                val (file, facesText) = c.destructured
                val want = Regex("\\[([^\\[\\]]+)\\]").findAll(facesText).map { m -> m.groupValues[1].split(',').map { it.trim().toFloat() } }.toList()
                val (w, h, argb) = TestImages.readPng(File(fixtures, file))
                val got = detector.detect(argb, w, h).sortedByDescending { it.score }
                assertEquals("$file: faces", want.size, got.size)
                for ((g, e) in got.zip(want)) {
                    assertTrue("$file: box ${g.x},${g.y} vs ${e[0]},${e[1]}", abs(g.x - e[0]) <= box && abs(g.y - e[1]) <= box && abs(g.w - e[2]) <= box && abs(g.h - e[3]) <= box)
                    assertEquals("$file: score", e[4], g.score, scoreTol)
                }
            }
        }
    }

    @Test
    fun scoresTheBestFaceBySharpness() {
        // A 100 × 100 picture: a sharp checkerboard face at the top left, a flat one at the bottom right.
        val w = 100
        val h = 100
        val grey = ByteArray(w * h) { i -> val x = i % w; val y = i / w; if (x < 40 && y < 40 && (x + y) % 2 == 0) 255.toByte() else 120.toByte() }
        val sharp = FaceDetector.Face(0f, 0f, 40f, 40f, 0.9f, FloatArray(10))
        val flat = FaceDetector.Face(55f, 55f, 40f, 40f, 0.95f, FloatArray(10))
        val (n, q) = FaceDetector.quality(listOf(sharp, flat), grey, w, h)
        assertEquals(2, n)
        assertTrue("quality $q", q != null && q > 0.8)
        assertEquals(0 to null, FaceDetector.quality(listOf(flat.copy(w = 2f, h = 2f)), grey, w, h))
    }

    @Test
    fun decodesAnAnchor() {
        // One anchor at stride 32, row 1, column 2: box offset (0.5, 0.5), size e^0 × 32.
        val out = HashMap<String, FloatArray>()
        for (s in intArrayOf(8, 16, 32)) {
            val n = (640 / s) * (640 / s)
            out["cls_$s"] = FloatArray(n); out["obj_$s"] = FloatArray(n); out["bbox_$s"] = FloatArray(n * 4); out["kps_$s"] = FloatArray(n * 10)
        }
        val idx = 1 * 20 + 2
        out.getValue("cls_32")[idx] = 0.81f; out.getValue("obj_32")[idx] = 1f
        out.getValue("bbox_32")[idx * 4] = 0.5f; out.getValue("bbox_32")[idx * 4 + 1] = 0.5f
        val faces = FaceDetector.decode(out)
        assertEquals(1, faces.size)
        val f = faces[0]
        assertEquals(0.9f, f.score, 1e-4f)
        assertEquals(64f, f.x, 1e-3f)   // centre (2.5 × 32 = 80) − 16
        assertEquals(32f, f.y, 1e-3f)   // centre (1.5 × 32 = 48) − 16
        assertEquals(32f, f.w, 1e-3f)
    }
}
