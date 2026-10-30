import SwiftUI

struct ProfileView: View {
    @Environment(\.colorScheme) private var scheme
    @AppStorage("appearance") private var appearance = "system"
    @AppStorage("textSize") private var textSize = "standard"
    @AppStorage("parentMode") private var parentMode = false
    @AppStorage("deviceName") private var deviceName = ""

    var body: some View {
        let palette = Palette.current(scheme)
        NavigationStack {
            CareScreen {
                HStack(spacing: 16) {
                    CareSeal(size: 56)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("PRIMALUX")
                            .font(.caption.weight(.semibold))
                            .tracking(1.8)
                            .foregroundStyle(palette.metal)
                        Text("Care stays on this iPhone.")
                            .font(.headline)
                            .foregroundStyle(palette.ink)
                    }
                }
                MetalCard(padding: 18) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Privacy")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(palette.ink)
                        Text("Nothing is sold. The list works with no network. This build does not send care data anywhere.")
                            .font(.body)
                            .foregroundStyle(palette.ink)
                    }
                }
                MetalCard(padding: 18) {
                    VStack(alignment: .leading, spacing: 16) {
                        CareField(label: "Your name on this phone", text: $deviceName, prompt: "Adrian")
                        setting("Parent mode", selection: Binding(
                            get: { parentMode ? "on" : "off" },
                            set: { parentMode = $0 == "on" }
                        ), options: [("off", "Off"), ("on", "On")])
                        setting("Appearance", selection: $appearance, options: [("system", "System"), ("light", "Light"), ("dark", "Dark")])
                        setting("Text size", selection: $textSize, options: [("standard", "Standard"), ("large", "Large"), ("extra", "Extra large")])
                    }
                }
                MetalCard(padding: 18) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("READING SAMPLE")
                            .font(.caption.weight(.semibold))
                            .tracking(1.6)
                            .foregroundStyle(palette.metal)
                        Text("This is how a reminder will read. One tablet with breakfast.")
                            .font(.body)
                            .foregroundStyle(palette.ink)
                    }
                }
            }
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.large)
        }
    }

    private func setting(_ title: String, selection: Binding<String>, options: [(String, String)]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.subheadline.weight(.semibold))
            Picker(title, selection: selection) {
                ForEach(options, id: \.0) { option in
                    Text(option.1).tag(option.0)
                }
            }
            .pickerStyle(.segmented)
        }
    }
}
