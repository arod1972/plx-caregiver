import SwiftUI

struct HealthView: View {
    @StateObject private var health = HealthClient()
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        let palette = Palette.current(scheme)
        CareScreen {
            Text(health.message)
                .font(.subheadline)
                .foregroundStyle(palette.muted)
            if !health.allowed {
                MetalButton(title: "Allow Apple Health") { Task { await health.allow() } }
            } else {
                MetalButton(title: "Refresh", filled: false) { Task { await health.refresh() } }
            }
            MetalCard {
                VStack(spacing: 0) {
                    metric("Steps today", health.steps, palette: palette, last: false)
                    metric("Heart rate", health.heart, palette: palette, last: false)
                    metric("Sleep", health.sleep, palette: palette, last: false)
                    metric("Blood pressure", health.pressure, palette: palette, last: true)
                }
            }
            Text("Readings are not written into the family update.")
                .font(.caption)
                .foregroundStyle(palette.muted)
        }
        .navigationTitle("Apple Health")
        .navigationBarTitleDisplayMode(.inline)
        .background(palette.canvas.ignoresSafeArea())
    }

    private func metric(_ title: String, _ value: String, palette: Palette, last: Bool) -> some View {
        HStack {
            Text(title).font(.body).foregroundStyle(palette.ink)
            Spacer()
            Text(value).font(.headline).foregroundStyle(palette.sage)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .overlay(alignment: .bottom) {
            if !last { Rectangle().fill(palette.line).frame(height: 1).padding(.leading, 16) }
        }
    }
}
