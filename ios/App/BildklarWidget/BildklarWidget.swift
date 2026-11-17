import WidgetKit
import SwiftUI
import UIKit

/// Bildklar's widget. On the home screen: "On this day" with a photo from an
/// earlier year, or the space that could be freed. On the Lock Screen (iOS 16
/// accessory families, monochrome, so never a photo): the space that could be
/// freed and how much of the library is gone through — a line, a gauge or one
/// line of text beside the clock. The app writes what to show into
/// the shared App Group folder (PhotoLibraryPlugin.setWidget: widget.json and
/// widget.jpg); the widget only reads those two files — it never opens the
/// photo library and talks to nobody.
private let appGroup = "group.com.habboubah.bildklar"

struct BildklarEntry: TimelineEntry {
    let date: Date
    let title: String
    let line: String
    let image: UIImage?
    /// Bytes that could be freed (the clean-up card's number), when the app knows it.
    var freeable: Int64? = nil
    /// The share of the library gone through month by month, 0–100.
    var pct: Int? = nil
}

private struct Stored: Decodable {
    let title: String
    let line: String
    let freeable: Int64?
    let pct: Int?
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
        return BildklarEntry(date: Date(), title: stored.title, line: stored.line, image: image, freeable: stored.freeable, pct: stored.pct)
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

/// The Lock Screen's three shapes. Monochrome: the system tints them, so no colours and no photo.
struct BildklarAccessoryView: View {
    let entry: BildklarEntry
    @Environment(\.widgetFamily) private var family

    /// "2,4 GB frei machbar" in the phone's language and number format; nil when there is nothing to free.
    private var freeText: String? {
        guard let bytes = entry.freeable, bytes > 0 else { return nil }
        let size = ByteCountFormatter.string(fromByteCount: bytes, countStyle: .file)
        return String(format: String(localized: "lockFreeable"), size)
    }

    private var pctText: String? {
        guard let pct = entry.pct else { return nil }
        return (Double(pct) / 100).formatted(.percent.precision(.fractionLength(0)))
    }

    var body: some View {
        switch family {
        case .accessoryCircular:
            Gauge(value: Double(entry.pct ?? 0), in: 0...100) {
                Image(systemName: "photo.on.rectangle")
            } currentValueLabel: {
                Text("\(entry.pct ?? 0)")
            }
            .gaugeStyle(.accessoryCircularCapacity)
        case .accessoryInline:
            Text(freeText ?? pctText.map { String(format: String(localized: "lockProgress"), $0) } ?? "Bildklar")
        default:
            VStack(alignment: .leading, spacing: 1) {
                Text("Bildklar").font(.headline).widgetAccentable()
                Text(freeText ?? String(localized: "lockNothing")).font(.caption).lineLimit(1)
                if let pctText { Text(String(format: String(localized: "lockProgress"), pctText)).font(.caption).lineLimit(1) }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

/// Home screen or Lock Screen, by the family the system asks for.
struct BildklarEntryView: View {
    let entry: BildklarEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        switch family {
        case .accessoryCircular, .accessoryRectangular, .accessoryInline:
            if #available(iOSApplicationExtension 17.0, *) {
                BildklarAccessoryView(entry: entry).containerBackground(for: .widget) { AccessoryWidgetBackground() }
            } else {
                BildklarAccessoryView(entry: entry)
            }
        default:
            BildklarWidgetView(entry: entry)
        }
    }
}

@main
struct BildklarWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "BildklarWidget", provider: BildklarProvider()) { entry in
            BildklarEntryView(entry: entry)
        }
        .configurationDisplayName("widgetName")
        .description("widgetDescription")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular, .accessoryInline])
    }
}
