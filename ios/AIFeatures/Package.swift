// swift-tools-version: 5.9
import PackageDescription

// The on-device AI's Swift side (ImageEmbedder.swift, a link to the app's own
// file) with ONNX Runtime, so its golden-fixture test runs with `swift test`
// on a Mac (npm run test:ios:ai) — ONNX Runtime's Swift package has no Linux
// build, which is why this is not part of ios/PhotoFeatures (CI runs that on
// Linux). Nothing here is linked into the app; the App target links the same
// package version itself (ios/scripts/add-ai.rb).
let package = Package(
    name: "AIFeatures",
    platforms: [.iOS(.v16), .macOS(.v14)],
    dependencies: [
        .package(url: "https://github.com/microsoft/onnxruntime-swift-package-manager", exact: "1.24.2"),
    ],
    targets: [
        .target(name: "AIFeatures", dependencies: [.product(name: "onnxruntime", package: "onnxruntime-swift-package-manager")]),
        .testTarget(name: "AIFeaturesTests", dependencies: ["AIFeatures"]),
    ]
)
