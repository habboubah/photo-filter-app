// swift-tools-version: 5.9
import PackageDescription

// The photo features as a package of their own, so their tests run with
// `swift test` (npm run test:ios) on any Mac — or Linux — without a simulator.
// The app target compiles the same FeatureMath.swift (App.xcodeproj
// references it); nothing here is linked into the app.
let package = Package(
    name: "PhotoFeatures",
    platforms: [.iOS(.v16), .macOS(.v13)],
    products: [.library(name: "PhotoFeatures", targets: ["PhotoFeatures"])],
    targets: [
        .target(name: "PhotoFeatures"),
        .testTarget(name: "PhotoFeaturesTests", dependencies: ["PhotoFeatures"]),
    ]
)
