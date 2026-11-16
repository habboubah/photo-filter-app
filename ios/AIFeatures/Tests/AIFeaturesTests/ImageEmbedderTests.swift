import Foundation
import ImageIO
import XCTest
@testable import AIFeatures

/// The app's ImageEmbedder against the golden fixtures (fixtures/ai/): the
/// same model inputs ml/fixtures.py ran through the Python reference must give
/// the same embedding and label scores here — within expected.json's
/// tolerances — so the thresholds tuned in Python hold on the iPhone.
/// ImageEmbedderTest.kt checks Android the same way.
final class ImageEmbedderTests: XCTestCase {
    /// ios/AIFeatures/Tests/AIFeaturesTests/ → the repository root.
    private let root = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .deletingLastPathComponent().deletingLastPathComponent()

    private struct Expected: Decodable {
        struct Tolerance: Decodable { let cosine: Float; let logit: Float }
        struct Case: Decodable { let file: String; let embedding: [Float]; let logits: [Float]; let top: String }
        let aiVersion: Int
        let tolerance: Tolerance
        let cases: [Case]
    }

    private func image(_ url: URL) throws -> CGImage {
        guard let source = CGImageSourceCreateWithURL(url as CFURL, nil), let cg = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
            throw NSError(domain: "png", code: 1)
        }
        return cg
    }

    func testMatchesThePythonReference() throws {
        let fixtures = root.appendingPathComponent("fixtures/ai")
        let expected = try JSONDecoder().decode(Expected.self, from: Data(contentsOf: fixtures.appendingPathComponent("expected.json")))
        XCTAssertEqual(expected.aiVersion, ImageEmbedder.aiVersion)
        let embedder = try ImageEmbedder(directory: root.appendingPathComponent("ai-assets"))
        for c in expected.cases {
            let cg = try image(fixtures.appendingPathComponent(c.file))
            XCTAssertEqual(cg.width, embedder.size, c.file)
            let px = try XCTUnwrap(embedder.pixels(cg), c.file)
            let emb = try embedder.embedding(px)
            let cosine = zip(emb, c.embedding).reduce(Float(0)) { $0 + $1.0 * $1.1 }
            XCTAssertGreaterThanOrEqual(cosine, expected.tolerance.cosine, c.file)
            let logits = embedder.logits(emb)
            for (got, want) in zip(logits, c.logits) {
                XCTAssertEqual(got, want, accuracy: expected.tolerance.logit, c.file)
            }
        }
    }

    func testNormalisesToMinusOneToOne() {
        let px = ImageEmbedder.normalise([0, 255, 128, 255, 255, 0, 0, 255, 0, 0, 0, 0, 255, 255, 255, 0], size: 2)
        XCTAssertEqual(px[0], -1)          // R of the first pixel
        XCTAssertEqual(px[4], 1)           // G of the first pixel
        XCTAssertEqual(px[8], Float(128) / 127.5 - 1, accuracy: 1e-6)
        XCTAssertEqual(px[3], 1)           // R of the last pixel
    }
}
