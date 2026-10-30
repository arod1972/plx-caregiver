import SwiftUI
import SwiftData
import UIKit

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
        .onAppear { styleTabs(scheme) }
        .onChange(of: scheme) { _, newScheme in styleTabs(newScheme) }
    }
}

private func styleTabs(_ scheme: ColorScheme) {
    let dark = scheme == .dark
    let appearance = UITabBarAppearance()
    appearance.configureWithOpaqueBackground()
    appearance.backgroundColor = dark
        ? UIColor(red: 0.110, green: 0.110, blue: 0.118, alpha: 1)
        : UIColor(red: 0.949, green: 0.949, blue: 0.969, alpha: 1)
    let sage = dark
        ? UIColor(red: 0.545, green: 0.706, blue: 0.843, alpha: 1)
        : UIColor(red: 0.086, green: 0.196, blue: 0.310, alpha: 1)
    let metal = UIColor(red: 0.557, green: 0.600, blue: 0.643, alpha: 1)
    appearance.stackedLayoutAppearance.selected.iconColor = sage
    appearance.stackedLayoutAppearance.selected.titleTextAttributes = [.foregroundColor: sage]
    appearance.stackedLayoutAppearance.normal.iconColor = metal
    appearance.selectionIndicatorTintColor = metal
    UITabBar.appearance().standardAppearance = appearance
    UITabBar.appearance().scrollEdgeAppearance = appearance
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
