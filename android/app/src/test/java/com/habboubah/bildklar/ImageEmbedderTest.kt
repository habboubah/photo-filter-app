package com.habboubah.bildklar

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.ByteArrayOutputStream
import java.io.DataInputStream
import java.io.File
import java.util.zip.Inflater

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

    /** A minimal PNG reader (8-bit RGB or RGBA, not interlaced — what ml/fixtures.py writes): ARGB pixels. ImageIO isn't on Android's unit-test classpath. */
    private fun readPng(file: File): Triple<Int, Int, IntArray> {
        val input = DataInputStream(file.inputStream().buffered())
        input.skipBytes(8)
        var w = 0
        var h = 0
        var channels = 3
        val idat = ByteArrayOutputStream()
        while (true) {
            val length = input.readInt()
            val type = String(ByteArray(4).also { input.readFully(it) }, Charsets.US_ASCII)
            val data = ByteArray(length).also { input.readFully(it) }
            input.readInt() // CRC
            when (type) {
                "IHDR" -> {
                    w = ((data[0].toInt() and 0xFF) shl 24) or ((data[1].toInt() and 0xFF) shl 16) or ((data[2].toInt() and 0xFF) shl 8) or (data[3].toInt() and 0xFF)
                    h = ((data[4].toInt() and 0xFF) shl 24) or ((data[5].toInt() and 0xFF) shl 16) or ((data[6].toInt() and 0xFF) shl 8) or (data[7].toInt() and 0xFF)
                    require(data[8].toInt() == 8 && data[12].toInt() == 0) { "only 8-bit, non-interlaced PNGs" }
                    channels = when (data[9].toInt()) { 2 -> 3; 6 -> 4; else -> error("only RGB / RGBA PNGs") }
                }
                "IDAT" -> idat.write(data)
                "IEND" -> break
            }
        }
        val inflater = Inflater().apply { setInput(idat.toByteArray()) }
        val stride = w * channels
        val raw = ByteArray((stride + 1) * h)
        var got = 0
        while (got < raw.size) got += inflater.inflate(raw, got, raw.size - got)
        val out = ByteArray(stride * h)
        for (y in 0 until h) {
            val filter = raw[y * (stride + 1)].toInt()
            for (x in 0 until stride) {
                val v = raw[y * (stride + 1) + 1 + x].toInt() and 0xFF
                val a = if (x >= channels) out[y * stride + x - channels].toInt() and 0xFF else 0
                val b = if (y > 0) out[(y - 1) * stride + x].toInt() and 0xFF else 0
                val c = if (x >= channels && y > 0) out[(y - 1) * stride + x - channels].toInt() and 0xFF else 0
                val pred = when (filter) {
                    0 -> 0
                    1 -> a
                    2 -> b
                    3 -> (a + b) / 2
                    4 -> { val p = a + b - c; val pa = Math.abs(p - a); val pb = Math.abs(p - b); val pc = Math.abs(p - c); if (pa <= pb && pa <= pc) a else if (pb <= pc) b else c }
                    else -> error("bad PNG filter $filter")
                }
                out[y * stride + x] = (v + pred).toByte()
            }
        }
        val argb = IntArray(w * h) { i ->
            val r = out[i * channels].toInt() and 0xFF
            val g = out[i * channels + 1].toInt() and 0xFF
            val b = out[i * channels + 2].toInt() and 0xFF
            (0xFF shl 24) or (r shl 16) or (g shl 8) or b
        }
        return Triple(w, h, argb)
    }

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
