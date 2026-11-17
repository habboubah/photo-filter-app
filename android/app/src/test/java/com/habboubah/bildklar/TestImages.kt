package com.habboubah.bildklar

import java.io.ByteArrayOutputStream
import java.io.DataInputStream
import java.io.File
import java.util.zip.Inflater

/** Pictures for the unit tests (ImageIO isn't on Android's unit-test classpath). */
object TestImages {
    /** A minimal PNG reader (8-bit RGB or RGBA, not interlaced — what ml/fixtures.py writes): ARGB pixels. ImageIO isn't on Android's unit-test classpath. */
    fun readPng(file: File): Triple<Int, Int, IntArray> {
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

}
