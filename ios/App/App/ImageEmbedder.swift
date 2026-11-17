import Foundation
import CoreGraphics
import OnnxRuntimeBindings

/// The on-device AI's shared image model (docs/AI.md) — the counterpart of
/// ImageEmbedder.kt, checked against the same golden fixtures
/// (fixtures/ai/expected.json, ImageEmbedderTests).
///
/// SigLIP 2's image encoder (ai-assets/image.onnx, Apache 2.0) runs in ONNX
/// Runtime on the CPU. A photo becomes a 768-number embedding; each label's
/// score is `scale · dot(embedding, label) + bias` — stored × 10, rounded, in
/// label order (src/types.ts Photo.ai). Nothing leaves the phone: ONNX Runtime
/// is a library inside the app, the model and the label vectors ship in the
/// app bundle (the `ai-assets` folder).
///
/// Not thread-safe: the plugin uses one instance from its scan queue.
final class ImageEmbedder {
    /// Bump with src/logic/ai.ts AI_VERSION, vectors.json and ImageEmbedder.kt: every photo gets its AI pass again.
    static let aiVersion = 1

    let size: Int
    let dim: Int
    let labelCount: Int
    private let scale: Float
    private let bias: Float
    /// labelCount × dim, row-major.
    private let vectors: [Float]
    private let env: ORTEnv
    private let session: ORTSession

    /// The model from the app bundle's `ai-assets` folder.
    convenience init() throws {
        guard let dir = Bundle.main.url(forResource: "ai-assets", withExtension: nil) else {
            throw NSError(domain: "ImageEmbedder", code: 1, userInfo: [NSLocalizedDescriptionKey: "ai-assets missing from the bundle"])
        }
        try self.init(directory: dir)
    }

    init(directory: URL) throws {
        let meta = try JSONSerialization.jsonObject(with: Data(contentsOf: directory.appendingPathComponent("vectors.json"))) as? [String: Any] ?? [:]
        guard let version = meta["aiVersion"] as? Int, version == Self.aiVersion,
              let size = meta["size"] as? Int, let dim = meta["dim"] as? Int,
              let scale = (meta["scale"] as? NSNumber)?.floatValue, let bias = (meta["bias"] as? NSNumber)?.floatValue,
              let labels = meta["labels"] as? [Any] else {
            throw NSError(domain: "ImageEmbedder", code: 2, userInfo: [NSLocalizedDescriptionKey: "vectors.json does not match this build"])
        }
        self.size = size
        self.dim = dim
        self.labelCount = labels.count
        self.scale = scale
        self.bias = bias
        vectors = try Self.halfFloats(Data(contentsOf: directory.appendingPathComponent("vectors.bin")), count: labels.count * dim)

        env = try ORTEnv(loggingLevel: .warning)
        let options = try ORTSessionOptions()
        try options.setIntraOpNumThreads(2)
        try options.setGraphOptimizationLevel(.all)
        session = try ORTSession(env: env, modelPath: directory.appendingPathComponent("image.onnx").path, sessionOptions: options)
    }

    /// float16 little-endian → Float.
    private static func halfFloats(_ data: Data, count: Int) throws -> [Float] {
        guard data.count == count * 2 else {
            throw NSError(domain: "ImageEmbedder", code: 3, userInfo: [NSLocalizedDescriptionKey: "vectors.bin has the wrong size"])
        }
        return data.withUnsafeBytes { raw in
            (0..<count).map { i in Float(Float16(bitPattern: raw.loadUnaligned(fromByteOffset: i * 2, as: UInt16.self))) }
        }
    }

    /// The model's input: the picture squeezed to size × size (no crop), RGB, scaled to −1 … 1, channels first.
    func pixels(_ cg: CGImage) -> [Float]? {
        let n = size
        var rgba = [UInt8](repeating: 0, count: n * n * 4)
        let drawn: Bool = rgba.withUnsafeMutableBytes { buf in
            guard let ctx = CGContext(
                data: buf.baseAddress, width: n, height: n, bitsPerComponent: 8, bytesPerRow: n * 4,
                space: CGColorSpace(name: CGColorSpace.sRGB) ?? CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
            ) else { return false }
            ctx.interpolationQuality = .medium
            ctx.draw(cg, in: CGRect(x: 0, y: 0, width: n, height: n))
            return true
        }
        guard drawn else { return nil }
        return Self.normalise(rgba, size: n)
    }

    /// RGBA bytes (row-major, alpha ignored) → [3, size, size], (x / 255 − 0.5) / 0.5.
    static func normalise(_ rgba: [UInt8], size n: Int) -> [Float] {
        var out = [Float](repeating: 0, count: 3 * n * n)
        let plane = n * n
        for i in 0..<plane {
            out[i] = Float(rgba[i * 4]) / 127.5 - 1
            out[plane + i] = Float(rgba[i * 4 + 1]) / 127.5 - 1
            out[2 * plane + i] = Float(rgba[i * 4 + 2]) / 127.5 - 1
        }
        return out
    }

    /// The embedding (L2-normalised by the model) for one prepared input.
    func embedding(_ pixels: [Float]) throws -> [Float] {
        let data = NSMutableData(bytes: pixels, length: pixels.count * MemoryLayout<Float>.size)
        let input = try ORTValue(tensorData: data, elementType: .float, shape: [1, 3, NSNumber(value: size), NSNumber(value: size)])
        let outputs = try session.run(withInputs: ["pixels": input], outputNames: ["embedding"], runOptions: nil)
        guard let value = outputs["embedding"] else {
            throw NSError(domain: "ImageEmbedder", code: 4, userInfo: [NSLocalizedDescriptionKey: "No embedding"])
        }
        let raw = try value.tensorData() as Data
        return raw.withUnsafeBytes { Array($0.bindMemory(to: Float.self).prefix(dim)) }
    }

    /// Each label's logit for an embedding.
    func logits(_ embedding: [Float]) -> [Float] {
        (0..<labelCount).map { l in
            var dot: Float = 0
            let row = l * dim
            for i in 0..<dim { dot += embedding[i] * vectors[row + i] }
            return scale * dot + bias
        }
    }

    /// What the scan stores for a picture: the logits × 10, rounded (Photo.ai); nil when the picture can't be read.
    /// The picture's embedding (a video's poster frame: lookalike videos, src/logic/lookalike.ts).
    func embed(_ cg: CGImage) -> [Float]? {
        guard let px = pixels(cg) else { return nil }
        return try? embedding(px)
    }

    /// An embedding as int8 values in base64 (768 bytes → 1,024 characters). Each vector is scaled by its own
    /// largest value, which the cosine between two vectors does not notice. Matches ImageEmbedder.kt `packed`.
    static func packed(_ e: [Float]) -> String {
        let top = e.reduce(Float(0)) { max($0, abs($1)) }
        let k: Float = top > 0 ? 127 / top : 0
        let bytes = e.map { UInt8(bitPattern: Int8(clamping: Int(($0 * k).rounded()))) }
        return Data(bytes).base64EncodedString()
    }

    func scores(_ cg: CGImage) -> [Int]? {
        guard let px = pixels(cg), let emb = try? embedding(px) else { return nil }
        return logits(emb).map { Int(($0 * 10).rounded()) }
    }
}
