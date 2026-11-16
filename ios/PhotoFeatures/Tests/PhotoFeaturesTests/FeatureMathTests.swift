import Foundation
import XCTest
@testable import PhotoFeatures

/// The Swift features against the shared test pictures (fixtures/features/):
/// the same values as the TypeScript spec and the Kotlin code, to the bit.
final class FeatureMathTests: XCTestCase {
    /// ios/PhotoFeatures/Tests/PhotoFeaturesTests/ → the repository's fixtures/features.
    private let dir = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .deletingLastPathComponent().deletingLastPathComponent()
        .appendingPathComponent("fixtures/features")

    private func pgm(_ name: String) throws -> (w: Int, h: Int, grey: [UInt8]) {
        let data = try Data(contentsOf: dir.appendingPathComponent(name))
        let head = String(decoding: data.prefix(64), as: UTF8.self)
        let parts = head.split(whereSeparator: { $0 == " " || $0 == "\n" }).prefix(4).map(String.init)
        guard parts.count == 4, parts[0] == "P5", let w = Int(parts[1]), let h = Int(parts[2]) else {
            throw NSError(domain: "pgm", code: 1)
        }
        let start = data.count - w * h
        return (w, h, [UInt8](data.suffix(from: data.startIndex + start)))
    }

    private struct Expected: Decodable {
        struct Picture: Decodable { let w: Int; let h: Int; let hash: String; let sharp: Double; let contrast: Double; let expo: Double; let clip: Double }
        let featureVersion: Int
        let pictures: [String: Picture]
    }

    func testMatchesTheSharedExpectedValues() throws {
        let expected = try JSONDecoder().decode(Expected.self, from: Data(contentsOf: dir.appendingPathComponent("expected.json")))
        XCTAssertEqual(expected.featureVersion, FeatureMath.featureVersion)
        for (name, want) in expected.pictures {
            let p = try pgm(name)
            XCTAssertEqual(p.w, want.w, name)
            let f = FeatureMath.features(p.grey, p.w, p.h)
            XCTAssertEqual(f.hash, want.hash, name)
            XCTAssertEqual(f.sharp, want.sharp, name)
            XCTAssertEqual(f.contrast, want.contrast, name)
            XCTAssertEqual(f.expo, want.expo, name)
            XCTAssertEqual(f.clip, want.clip, name)
        }
    }

    func testASharpPhotoScoresSharperThanItsBlurredCopy() throws {
        let a = try pgm("scene.pgm")
        let b = try pgm("scene-blur.pgm")
        XCTAssertGreaterThan(FeatureMath.sharpness(a.grey, a.w, a.h), 10 * FeatureMath.sharpness(b.grey, b.w, b.h))
    }

    func testACopyHashesCloseToItsOriginal() throws {
        func hash(_ n: String) throws -> String { let p = try pgm(n); return FeatureMath.dHash(p.grey, p.w, p.h) }
        XCTAssertLessThanOrEqual(FeatureMath.hamming(try hash("scene.pgm"), try hash("scene-copy.pgm")), 10)
        XCTAssertGreaterThan(FeatureMath.hamming(try hash("scene.pgm"), try hash("other.pgm")), 20)
    }

    func testGreyAndSizes() {
        XCTAssertEqual(FeatureMath.grey(255, 0, 0), 77)
        XCTAssertEqual(FeatureMath.grey(255, 255, 255), 255)
        XCTAssertTrue(FeatureMath.fitSize(4032, 3024) == (512, 384))
        XCTAssertTrue(FeatureMath.fitSize(200, 100) == (200, 100))
        XCTAssertEqual(FeatureMath.sharpness([UInt8](repeating: 128, count: 16), 4, 4), 0)
        XCTAssertEqual(FeatureMath.hamming("0000000000000000", "ffffffffffffffff"), 64)
    }
}
