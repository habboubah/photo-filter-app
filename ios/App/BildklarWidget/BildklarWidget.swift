import WidgetKit
import SwiftUI
import UIKit

/// Bildklar's home-screen widget: "On this day" with a photo from an earlier
/// year, or the space that could be freed. The app writes what to show into
/// the shared App Group folder (PhotoLibraryPlugin.setWidget: widget.json and
/// widget.jpg); the widget only reads those two files — it never opens the
/// photo library and talks to nobody.
private let appGroup = "group.com.habboubah.bildklar"

struct BildklarEntry: TimelineEntry {
    let date: Date
    let title: String
    let line: String
    let image: UIImage?
}

private struct Stored: Decodable {
    let title: String
    let line: String
}

struct BildklarProvider: TimelineProvider {
    func placeholder(in context: Context) -> BildklarEntry { Self.fallback() }

    func getSnapshot(in context: Context, completion: @escaping (BildklarEntry) -> Void) {
        completion(Self.load())
    }

    /// What the app wrote last; asked for again after midnight (a new day may bring a new "On this day" once the app ran).
    func getTimeline(in context: Context, completion: @escaping (Timeline<BildklarEntry>) -> Void) {
        let tomorrow = Calendar.current.startOfDay(for: Date().addingTimeInterval(86_400))
        completion(Timeline(entries: [Self.load()], policy: .after(tomorrow)))
    }

    private static func fallback() -> BildklarEntry {
        BildklarEntry(date: Date(), title: "Bildklar", line: String(localized: "widgetOpen"), image: nil)
    }

    private static func load() -> BildklarEntry {
        guard let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup),
              let data = try? Data(contentsOf: dir.appendingPathComponent("widget.json")),
              let stored = try? JSONDecoder().decode(Stored.self, from: data) else { return fallback() }
        let image = UIImage(contentsOfFile: dir.appendingPathComponent("widget.jpg").path)
        return BildklarEntry(date: Date(), title: stored.title, line: stored.line, image: image)
    }
}

struct BildklarWidgetView: View {
    let entry: BildklarEntry

    /// The app's warm paper and slate ink (src/index.css), for the card without a photo.
    private let paper = Color(red: 0.965, green: 0.945, blue: 0.918)
    private let ink = Color(red: 0.11, green: 0.14, blue: 0.17)

    @ViewBuilder private var background: some View {
        if let image = entry.image {
            ZStack {
                Image(uiImage: image).resizable().scaledToFill()
                LinearGradient(colors: [.clear, .black.opacity(0.6)], startPoint: .center, endPoint: .bottom)
            }
        } else {
            paper
        }
    }

    var body: some View {
        let text = VStack(alignment: .leading, spacing: 2) {
            Spacer(minLength: 0)
            Text(entry.title).font(.headline).lineLimit(2)
            Text(entry.line).font(.caption).lineLimit(2)
        }
        .foregroundColor(entry.image == nil ? ink : .white)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
        if #available(iOSApplicationExtension 17.0, *) {
            text.containerBackground(for: .widget) { background }
        } else {
            text.padding(14).background(background)
        }
    }
}

@main
struct BildklarWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "BildklarWidget", provider: BildklarProvider()) { entry in
            BildklarWidgetView(entry: entry)
        }
        .configurationDisplayName("widgetName")
        .description("widgetDescription")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
