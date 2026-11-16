package com.habboubah.fotonest

import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

/**
 * The per-photo features, exactly as specified in src/logic/features.ts (the
 * spec) and computed the same way by FeatureMath.swift on the iPhone. All three
 * are tested against fixtures/features/expected.json, so a sharpness or a hash
 * means the same on both phones.
 *
 * Input is a grey image (one byte per pixel, row by row) of the photo scaled to
 * fit 512 × 512. Pure: no Android classes, so the JVM unit tests run it as is.
 */
object FeatureMath {
    /** Bump with the spec's FEATURE_VERSION: every photo is analysed again. */
    const val FEATURE_VERSION = 1
    const val LONG_SIDE = 512

    data class Features(val hash: String, val sharp: Double, val contrast: Double, val expo: Double, val clip: Double)

    /** The grey value of one RGB pixel, as every implementation computes it. */
    fun grey(r: Int, g: Int, b: Int): Int = (77 * r + 150 * g + 29 * b + 128) shr 8

    /** An ARGB pixel array (Bitmap.getPixels) as grey bytes. */
    fun greyOf(argb: IntArray): ByteArray {
        val out = ByteArray(argb.size)
        for (i in argb.indices) {
            val p = argb[i]
            out[i] = grey((p shr 16) and 0xff, (p shr 8) and 0xff, p and 0xff).toByte()
        }
        return out
    }

    /** The size a w × h photo is scaled to: fits LONG_SIDE, never enlarged, at least 1. */
    fun fitSize(w: Int, h: Int, long: Int = LONG_SIDE): Pair<Int, Int> {
        val scale = min(1.0, long.toDouble() / max(w, h))
        return Pair(max(1, jsRound(w * scale).toInt()), max(1, jsRound(h * scale).toInt()))
    }

    private fun cellBounds(i: Int, n: Int, size: Int): Pair<Int, Int> {
        val a = (i.toLong() * size / n).toInt()
        val b = max(a + 1, ((i + 1).toLong() * size / n).toInt())
        return Pair(min(a, size - 1), min(b, size))
    }

    fun dHash(g: ByteArray, w: Int, h: Int): String {
        val sums = LongArray(72)
        val counts = LongArray(72)
        for (r in 0 until 8) {
            val (y0, y1) = cellBounds(r, 8, h)
            for (c in 0 until 9) {
                val (x0, x1) = cellBounds(c, 9, w)
                var sum = 0L
                for (y in y0 until y1) {
                    val row = y * w
                    for (x in x0 until x1) sum += g[row + x].toInt() and 0xff
                }
                sums[r * 9 + c] = sum
                counts[r * 9 + c] = ((x1 - x0) * (y1 - y0)).toLong()
            }
        }
        val hex = StringBuilder(16)
        for (r in 0 until 8) {
            var byte = 0
            for (c in 0 until 8) {
                val a = r * 9 + c
                val bit = if (sums[a] * counts[a + 1] < sums[a + 1] * counts[a]) 1 else 0
                byte = (byte shl 1) or bit
            }
            hex.append(String.format("%02x", byte))
        }
        return hex.toString()
    }

    fun sharpness(g: ByteArray, w: Int, h: Int): Double {
        if (w < 3 || h < 3) return 0.0
        var s = 0L
        var q = 0L
        for (y in 1 until h - 1) {
            val row = y * w
            for (x in 1 until w - 1) {
                val i = row + x
                val l = (g[i - w].toInt() and 0xff) + (g[i + w].toInt() and 0xff) +
                    (g[i - 1].toInt() and 0xff) + (g[i + 1].toInt() and 0xff) - 4 * (g[i].toInt() and 0xff)
                s += l
                q += l.toLong() * l
            }
        }
        val n = ((w - 2).toLong() * (h - 2)).toDouble()
        val mean = s / n
        return round(max(0.0, q / n - mean * mean), 2)
    }

    data class Stats(val contrast: Double, val expo: Double, val clip: Double)

    fun stats(g: ByteArray): Stats {
        var s = 0L
        var q = 0L
        var clipped = 0L
        for (b in g) {
            val v = b.toInt() and 0xff
            s += v
            q += v.toLong() * v
            if (v <= 4 || v >= 251) clipped++
        }
        val n = max(1, g.size).toDouble()
        val mean = s / n
        return Stats(
            contrast = round(sqrt(max(0.0, q / n - mean * mean)), 2),
            expo = round(mean / 255, 4),
            clip = round(clipped / n, 4),
        )
    }

    fun features(g: ByteArray, w: Int, h: Int): Features {
        val st = stats(g)
        return Features(dHash(g, w, h), sharpness(g, w, h), st.contrast, st.expo, st.clip)
    }

    /** JavaScript's Math.round: halves go up (towards +∞). */
    private fun jsRound(x: Double): Double = floor(x + 0.5)

    /** Math.round(x · 10^places) / 10^places, as the spec rounds (all values here are ≥ 0). */
    private fun round(x: Double, places: Int): Double {
        val f = Math.pow(10.0, places.toDouble())
        return jsRound(x * f) / f
    }

    /** How many of the 64 bits two hashes differ in. */
    fun hamming(a: String, b: String): Int =
        java.lang.Long.bitCount(java.lang.Long.parseUnsignedLong(a, 16) xor java.lang.Long.parseUnsignedLong(b, 16))
}
