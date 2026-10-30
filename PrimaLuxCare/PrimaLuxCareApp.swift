import SwiftUI
import SwiftData

@main
struct PrimaLuxCareApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
                .task { CareDatabase.seedIfNeeded() }
        }
        .modelContainer(CareDatabase.container)
    }
}

struct RootView: View {
    @AppStorage("appearance") private var appearance = "system"
    @AppStorage("textSize") private var textSize = "standard"
    @AppStorage("parentMode") private var parentMode = false
    @Environment(\.colorScheme) private var scheme

    private var preferred: ColorScheme? {
        switch appearance {
        case "light": return .light
        case "dark": return .dark
        default: return nil
        }
    }

    var body: some View {
        let palette = Palette.current(scheme)
        TabView {
            TodayView()
                .tabItem { Label("Calendar", systemImage: "calendar") }
            TasksView()
                .tabItem { Label("Tasks", systemImage: "checkmark.circle") }
            MedsView()
                .tabItem { Label("Meds", systemImage: "pills") }
            UpdatesView()
                .tabItem { Label("Updates", systemImage: "text.bubble") }
            ProfileView()
                .tabItem { Label("Profile", systemImage: "person") }
        }
        .tint(palette.sage)
        .preferredColorScheme(preferred)
        .modifier(TypeScale(parentMode: parentMode, textSize: textSize))
    }
}

private struct TypeScale: ViewModifier {
    var parentMode: Bool
    var textSize: String

    @ViewBuilder
    func body(content: Content) -> some View {
        if parentMode || textSize == "extra" {
            content.dynamicTypeSize(.accessibility2)
        } else if textSize == "large" {
            content.dynamicTypeSize(.xxxLarge)
        } else {
            content
        }
    }
}
