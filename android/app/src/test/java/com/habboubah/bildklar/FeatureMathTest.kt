package com.habboubah.bildklar

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * The Kotlin features against the shared test pictures (fixtures/features/):
 * the same values as the TypeScript spec and the Swift code, to the bit.
 * Run: npm run test:android
 */
class FeatureMathTest {
    private val dir = File(System.getProperty("fixtures") ?: "../../fixtures/features")

    private data class Pgm(val w: Int, val h: Int, val grey: ByteArray)

    private fun readPgm(name: String): Pgm {
        val bytes = File(dir, name).readBytes()
        val header = String(bytes, 0, minOf(64, bytes.size), Charsets.ISO_8859_1)
        val m = Regex("^P5\\s+(\\d+)\\s+(\\d+)\\s+255\\s").find(header) ?: error("$name is not a binary PGM")
        val start = m.value.length
        return Pgm(m.groupValues[1].toInt(), m.groupValues[2].toInt(), bytes.copyOfRange(start, bytes.size))
    }

    /** The expected values of one picture, from expected.json (a small JSON read by hand: no Android JSON in unit tests). */
    private fun expected(name: String): Map<String, String> {
        val json = File(dir, "expected.json").readText()
        val block = Regex("\"${Regex.escape(name)}\":\\s*\\{([^}]*)\\}").find(json)?.groupValues?.get(1) ?: error("no $name in expected.json")
        return Regex("\"(\\w+)\":\\s*\"?([^\",\\s]+)\"?").findAll(block).associate { it.groupValues[1] to it.groupValues[2] }
    }

    @Test fun matchesTheSharedExpectedValues() {
        val json = File(dir, "expected.json").readText()
        assertTrue(json.contains("\"featureVersion\": ${FeatureMath.FEATURE_VERSION}"))
        for (name in listOf("scene.pgm", "scene-blur.pgm", "scene-copy.pgm", "fog.pgm", "other.pgm")) {
            val p = readPgm(name)
            val want = expected(name)
            val f = FeatureMath.features(p.grey, p.w, p.h)
            assertEquals("$name hash", want["hash"], f.hash)
            assertEquals("$name sharp", want["sharp"]!!.toDouble(), f.sharp, 0.0)
            assertEquals("$name contrast", want["contrast"]!!.toDouble(), f.contrast, 0.0)
            assertEquals("$name expo", want["expo"]!!.toDouble(), f.expo, 0.0)
            assertEquals("$name clip", want["clip"]!!.toDouble(), f.clip, 0.0)
        }
    }

    @Test fun aSharpPhotoScoresSharperThanItsBlurredCopy() {
        val a = readPgm("scene.pgm")
        val b = readPgm("scene-blur.pgm")
        assertTrue(FeatureMath.sharpness(a.grey, a.w, a.h) > 10 * FeatureMath.sharpness(b.grey, b.w, b.h))
    }

    @Test fun aCopyHashesCloseToItsOriginal() {
        fun hash(n: String) = readPgm(n).let { FeatureMath.dHash(it.grey, it.w, it.h) }
        assertTrue(FeatureMath.hamming(hash("scene.pgm"), hash("scene-copy.pgm")) <= 10)
        assertTrue(FeatureMath.hamming(hash("scene.pgm"), hash("other.pgm")) > 20)
    }

    @Test fun greyAndSizes() {
        assertEquals(77, FeatureMath.grey(255, 0, 0))
        assertEquals(255, FeatureMath.grey(255, 255, 255))
        assertEquals(Pair(512, 384), FeatureMath.fitSize(4032, 3024))
        assertEquals(Pair(200, 100), FeatureMath.fitSize(200, 100))
        assertEquals(0.0, FeatureMath.sharpness(ByteArray(16) { 128.toByte() }, 4, 4), 0.0)
        assertEquals(64, FeatureMath.hamming("0000000000000000", "ffffffffffffffff"))
    }
}
