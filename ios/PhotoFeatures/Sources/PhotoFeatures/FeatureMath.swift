import Foundation

/// The per-photo features, exactly as specified in src/logic/features.ts (the
/// spec) and computed the same way by FeatureMath.kt on Android. All three are
/// tested against fixtures/features/expected.json, so a sharpness or a hash
/// means the same on both phones.
///
/// Input is a grey image (one byte per pixel, row by row) of the photo scaled
/// to fit 512 × 512. Pure Swift: the package's tests (`swift test`) run it on
/// any machine, and the app target compiles this very file
/// (ios/App/App.xcodeproj references it).
public enum FeatureMath {
    /// Bump with the spec's FEATURE_VERSION: every photo is analysed again.
    public static let featureVersion = 1
    public static let longSide = 512

    public struct Features: Equatable {
        public let hash: String
        public let sharp: Double
        public let contrast: Double
        public let expo: Double
        public let clip: Double
    }

    /// The grey value of one RGB pixel, as every implementation computes it.
    @inline(__always)
    public static func grey(_ r: Int, _ g: Int, _ b: Int) -> UInt8 {
        UInt8((77 * r + 150 * g + 29 * b + 128) >> 8)
    }

    /// The size a w × h photo is scaled to: fits `long`, never enlarged, at least 1.
    public static func fitSize(_ w: Int, _ h: Int, long: Int = longSide) -> (w: Int, h: Int) {
        let scale = min(1.0, Double(long) / Double(max(w, h)))
        return (max(1, Int(jsRound(Double(w) * scale))), max(1, Int(jsRound(Double(h) * scale))))
    }

    private static func cellBounds(_ i: Int, _ n: Int, _ size: Int) -> (Int, Int) {
        let a = i * size / n
        let b = max(a + 1, (i + 1) * size / n)
        return (min(a, size - 1), min(b, size))
    }

    public static func dHash(_ g: [UInt8], _ w: Int, _ h: Int) -> String {
        var sums = [Int64](repeating: 0, count: 72)
        var counts = [Int64](repeating: 0, count: 72)
        for r in 0..<8 {
            let (y0, y1) = cellBounds(r, 8, h)
            for c in 0..<9 {
                let (x0, x1) = cellBounds(c, 9, w)
                var sum: Int64 = 0
                for y in y0..<y1 {
                    let row = y * w
                    for x in x0..<x1 { sum += Int64(g[row + x]) }
                }
                sums[r * 9 + c] = sum
                counts[r * 9 + c] = Int64((x1 - x0) * (y1 - y0))
            }
        }
        var hex = ""
        for r in 0..<8 {
            var byte = 0
            for c in 0..<8 {
                let a = r * 9 + c
                let bit = sums[a] * counts[a + 1] < sums[a + 1] * counts[a] ? 1 : 0
                byte = (byte << 1) | bit
            }
            hex += String(format: "%02x", byte)
        }
        return hex
    }

    public static func sharpness(_ g: [UInt8], _ w: Int, _ h: Int) -> Double {
        if w < 3 || h < 3 { return 0 }
        var s: Int64 = 0
        var q: Int64 = 0
        g.withUnsafeBufferPointer { p in
            for y in 1..<(h - 1) {
                let row = y * w
                for x in 1..<(w - 1) {
                    let i = row + x
                    let l = Int64(p[i - w]) + Int64(p[i + w]) + Int64(p[i - 1]) + Int64(p[i + 1]) - 4 * Int64(p[i])
                    s += l
                    q += l * l
                }
            }
        }
        let n = Double((w - 2) * (h - 2))
        let mean = Double(s) / n
        return round(max(0, Double(q) / n - mean * mean), 2)
    }

    public static func stats(_ g: [UInt8]) -> (contrast: Double, expo: Double, clip: Double) {
        var s: Int64 = 0
        var q: Int64 = 0
        var clipped: Int64 = 0
        for v in g {
            let x = Int64(v)
            s += x
            q += x * x
            if v <= 4 || v >= 251 { clipped += 1 }
        }
        let n = Double(max(1, g.count))
        let mean = Double(s) / n
        return (
            contrast: round(max(0, Double(q) / n - mean * mean).squareRoot(), 2),
            expo: round(mean / 255, 4),
            clip: round(Double(clipped) / n, 4)
        )
    }

    public static func features(_ g: [UInt8], _ w: Int, _ h: Int) -> Features {
        let st = stats(g)
        return Features(hash: dHash(g, w, h), sharp: sharpness(g, w, h), contrast: st.contrast, expo: st.expo, clip: st.clip)
    }

    /// How many of the 64 bits two hashes differ in.
    public static func hamming(_ a: String, _ b: String) -> Int {
        guard let x = UInt64(a, radix: 16), let y = UInt64(b, radix: 16) else { return 64 }
        return (x ^ y).nonzeroBitCount
    }

    /// JavaScript's Math.round: halves go up (towards +∞).
    private static func jsRound(_ x: Double) -> Double { (x + 0.5).rounded(.down) }

    /// Math.round(x · 10^places) / 10^places, as the spec rounds (all values here are ≥ 0).
    private static func round(_ x: Double, _ places: Int) -> Double {
        let f = pow(10.0, Double(places))
        return jsRound(x * f) / f
    }
}
