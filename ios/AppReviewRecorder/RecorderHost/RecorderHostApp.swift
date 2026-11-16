import SwiftUI

/// Only there because a UI test needs an app to belong to. The test itself
/// drives the installed shopping list app (by bundle id), not this app.
@main
struct RecorderHostApp: App {
    var body: some Scene {
        WindowGroup {
            Text("Shopping List recorder\nRun the UI test, not this app.")
                .multilineTextAlignment(.center)
                .padding()
        }
    }
}
