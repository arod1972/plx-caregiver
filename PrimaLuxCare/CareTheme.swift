import SwiftUI

struct Palette {
    let canvas: Color
    let paper: Color
    let ink: Color
    let muted: Color
    let line: Color
    let sage: Color
    let sageSoft: Color
    let onSage: Color
    let metal: Color
    let metalLight: Color

    static let light = Palette(
        canvas: Color(red: 0.949, green: 0.949, blue: 0.969),
        paper: Color(red: 1, green: 1, blue: 1),
        ink: Color(red: 0.110, green: 0.110, blue: 0.118),
        muted: Color(red: 0.388, green: 0.388, blue: 0.400),
        line: Color(red: 0.898, green: 0.898, blue: 0.918),
        sage: Color(red: 0.086, green: 0.196, blue: 0.310),
        sageSoft: Color(red: 0.902, green: 0.933, blue: 0.957),
        onSage: Color(red: 1, green: 1, blue: 1),
        metal: Color(red: 0.557, green: 0.600, blue: 0.643),
        metalLight: Color(red: 0.910, green: 0.933, blue: 0.949)
    )

    static let dark = Palette(
        canvas: Color(red: 0.055, green: 0.055, blue: 0.063),
        paper: Color(red: 0.110, green: 0.110, blue: 0.118),
        ink: Color(red: 0.949, green: 0.949, blue: 0.969),
        muted: Color(red: 0.596, green: 0.596, blue: 0.624),
        line: Color(red: 0.220, green: 0.220, blue: 0.227),
        sage: Color(red: 0.545, green: 0.706, blue: 0.843),
        sageSoft: Color(red: 0.102, green: 0.149, blue: 0.196),
        onSage: Color(red: 0.055, green: 0.086, blue: 0.118),
        metal: Color(red: 0.773, green: 0.804, blue: 0.831),
        metalLight: Color(red: 0.957, green: 0.969, blue: 0.973)
    )

    static func current(_ scheme: ColorScheme) -> Palette {
        scheme == .dark ? .dark : .light
    }
}

struct CareSeal: View {
    var size: CGFloat = 44
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        let palette = Palette.current(scheme)
        ZStack {
            Circle()
                .stroke(palette.sage.opacity(0.85), lineWidth: max(1, size * 0.035))
            Circle()
                .stroke(
                    LinearGradient(
                        colors: [palette.metalLight, palette.metal, palette.metalLight],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: max(1, size * 0.02)
                )
                .padding(size * 0.12)
        }
        .frame(width: size, height: size)
    }
}

struct MetalCard<Content: View>: View {
    var padding: CGFloat = 0
    @ViewBuilder var content: () -> Content
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        let palette = Palette.current(scheme)
        content()
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(palette.paper)
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
            .overlay(alignment: .top) {
                LinearGradient(
                    colors: [
                        palette.metalLight.opacity(0.15),
                        palette.metalLight,
                        palette.metal,
                        palette.metalLight,
                        palette.metalLight.opacity(0.15),
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .frame(height: 1.5)
                .padding(.horizontal, 20)
            }
            .overlay {
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .strokeBorder(
                        LinearGradient(
                            colors: [palette.metalLight.opacity(0.9), palette.metal.opacity(0.28), palette.line],
                            startPoint: .top,
                            endPoint: .bottom
                        ),
                        lineWidth: 1
                    )
            }
            .shadow(color: .black.opacity(scheme == .dark ? 0.28 : 0.06), radius: 18, y: 8)
    }
}

struct MetalButton: View {
    var title: String
    var filled = true
    var action: () -> Void
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        let palette = Palette.current(scheme)
        Button(action: action) {
            Text(title)
                .font(.body.weight(.semibold))
                .frame(maxWidth: .infinity)
                .frame(minHeight: 48)
                .foregroundStyle(filled ? palette.onSage : palette.ink)
                .background(filled ? palette.sage : Color.clear)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(alignment: .top) {
                    if filled {
                        LinearGradient(
                            colors: [palette.metalLight.opacity(0.1), palette.metalLight, palette.metalLight.opacity(0.1)],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                        .frame(height: 1)
                        .padding(.horizontal, 18)
                    }
                }
                .overlay {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .strokeBorder(filled ? palette.metal.opacity(0.55) : palette.line, lineWidth: 1)
                }
        }
        .buttonStyle(.plain)
    }
}

struct DoseMark: View {
    var done: Bool
    var action: () -> Void
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        let palette = Palette.current(scheme)
        Button(action: action) {
            ZStack {
                Circle()
                    .stroke(
                        LinearGradient(
                            colors: [palette.metalLight, palette.metal],
                            startPoint: .top,
                            endPoint: .bottom
                        ),
                        lineWidth: 1.5
                    )
                if done {
                    Circle().fill(palette.sage).padding(3)
                    Image(systemName: "checkmark")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(palette.onSage)
                }
            }
            .frame(width: 28, height: 28)
            .frame(width: 44, height: 44)
        }
        .buttonStyle(.plain)
    }
}

struct CareField: View {
    var label: String
    @Binding var text: String
    var prompt: String
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        let palette = Palette.current(scheme)
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(palette.ink)
            TextField(prompt, text: $text)
                .font(.body)
                .padding(.horizontal, 14)
                .frame(minHeight: 48)
                .background(palette.canvas)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .strokeBorder(palette.line, lineWidth: 1)
                }
        }
    }
}

struct EmptyCare: View {
    var title: String
    var bodyText: String
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        let palette = Palette.current(scheme)
        MetalCard {
            HStack(spacing: 16) {
                CareSeal(size: 48)
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.headline)
                        .foregroundStyle(palette.ink)
                    Text(bodyText)
                        .font(.subheadline)
                        .foregroundStyle(palette.muted)
                }
            }
            .padding(18)
        }
    }
}

struct CareScreen<Content: View>: View {
    @ViewBuilder var content: () -> Content
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        let palette = Palette.current(scheme)
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                content()
            }
            .padding(.horizontal, 20)
            .padding(.top, 8)
            .padding(.bottom, 32)
            .frame(maxWidth: 560)
            .frame(maxWidth: .infinity)
        }
        .background(palette.canvas.ignoresSafeArea())
        .toolbarBackground(palette.canvas, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
    }
}
