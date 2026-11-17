package com.habboubah.bildklar

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * The app's ImageEmbedder against the golden fixtures (fixtures/ai/): the same
 * model inputs ml/fixtures.py ran through the Python reference must give the
 * same embedding and compact vector here — within expected.json's tolerances —
 * so the labels, groups and search tuned in Python hold on Android. Runs ONNX Runtime's
 * desktop library on the build machine (app/build.gradle swaps it in for the
 * unit tests). ImageEmbedderTests.swift checks the iPhone the same way.
 * Run: npm run test:android
 */
class ImageEmbedderTest {
    private val fixtures = File(System.getProperty("aiFixtures") ?: "../../fixtures/ai")
    private val assets = File(System.getProperty("aiAssets") ?: "../../ai-assets")

    private fun readPng(file: File) = TestImages.readPng(file)

    private fun numbers(block: String): FloatArray =
        block.split(',').map { it.trim() }.filter { it.isNotEmpty() }.map { it.toFloat() }.toFloatArray()

    @Test
    fun matchesThePythonReference() {
        val json = File(fixtures, "expected.json").readText()
        assertEquals(ImageEmbedder.AI_VERSION, ImageEmbedder.number(json, "aiVersion").toInt())
        val minCosine = ImageEmbedder.number(json, "cosine").toFloat()
        val minVectorCosine = ImageEmbedder.number(json, "vectorCosine").toFloat()
        val cases = Regex("\"file\":\\s*\"([^\"]+)\",\\s*\"embedding\":\\s*\\[([^\\]]*)\\],\\s*\"vector\":\\s*\\[([^\\]]*)\\]").findAll(json).toList()
        assertTrue("no cases in expected.json", cases.isNotEmpty())
        ImageEmbedder(assets).use { embedder ->
            for (c in cases) {
                val (file, embText, vecText) = c.destructured
                val (w, _, argb) = readPng(File(fixtures, file))
                assertEquals(file, embedder.size, w)
                val emb = embedder.embedding(ImageEmbedder.normalise(argb, embedder.size))
                val want = numbers(embText)
                val cosine = emb.indices.fold(0f) { s, i -> s + emb[i] * want[i] }
                assertTrue("$file: cosine $cosine", cosine >= minCosine)
                val vec = embedder.compact(emb)
                val wantVec = numbers(vecText)
                assertEquals(file, wantVec.size, vec.size)
                val vecCosine = vec.indices.fold(0f) { s, i -> s + vec[i] * wantVec[i] }
                assertTrue("$file: vector cosine $vecCosine", vecCosine >= minVectorCosine)
            }
        }
    }

    @Test
    fun packsLikeTheApp() {
        // int8, scaled by the largest value: [0.5, -1, 0.25] → [64, -127, 32], base64.
        val bytes = java.util.Base64.getDecoder().decode(ImageEmbedder.packed(floatArrayOf(0.5f, -1f, 0.25f)))
        assertEquals(listOf<Byte>(64, -127, 32), bytes.toList())
    }

    @Test
    fun normalisesToMinusOneToOne() {
        val px = ImageEmbedder.normalise(intArrayOf(0xFF00FF80.toInt(), 0xFFFF0000.toInt(), 0, 0xFFFFFFFF.toInt()), 2)
        assertEquals(-1f, px[0], 0f)            // R of the first pixel
        assertEquals(1f, px[4], 0f)             // G of the first pixel
        assertEquals(128 / 127.5f - 1f, px[8], 1e-6f)
        assertEquals(1f, px[3], 0f)             // R of the last pixel
    }

    @Test
    fun readsHalfFloats() {
        // 1.0, -2.0, 0.5 as float16 little-endian
        val v = ImageEmbedder.halfFloats(byteArrayOf(0x00, 0x3C, 0x00, 0xC0.toByte(), 0x00, 0x38))
        assertEquals(1f, v[0], 0f)
        assertEquals(-2f, v[1], 0f)
        assertEquals(0.5f, v[2], 0f)
    }
}
