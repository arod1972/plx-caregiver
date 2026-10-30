import SwiftData
import SwiftUI
import UIKit

struct ProfileView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.colorScheme) private var scheme
    @Query private var members: [Member]
    @Query private var circles: [CareCircle]
    @Query private var grants: [Grant]
    @Query(sort: \AuditEntry.at) private var audits: [AuditEntry]
    @AppStorage("appearance") private var appearance = "system"
    @AppStorage("textSize") private var textSize = "standard"
    @AppStorage("parentMode") private var parentMode = false
    @AppStorage("deviceName") private var deviceName = ""
    @State private var inviteRole = "family"
    @State private var inviteText = ""
    @State private var joinText = ""
    @State private var packageText = ""
    @State private var notice = ""

    private var isParent: Bool { members.first { $0.isThisPhone }?.role == "parent" }
    private let roles = ["caregiver", "family", "viewer"]
    private let areas = ["calendar", "tasks", "meds", "updates"]
    private let levels = ["edit", "view", "none"]

    var body: some View {
        let palette = Palette.current(scheme)
        NavigationStack {
            CareScreen {
                HStack(spacing: 16) {
                    CareSeal(size: 56)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("GUARDIAN STEWARD")
                            .font(.caption.weight(.semibold))
                            .tracking(1.8)
                            .foregroundStyle(palette.metal)
                        Text(circles.first?.name ?? "Family")
                            .font(.headline)
                            .foregroundStyle(palette.ink)
                    }
                }
                MetalCard(padding: 18) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Privacy")
                            .font(.subheadline.weight(.semibold))
                        Text("Care stays on this iPhone. Nothing is sold. Names and notes are sealed on this device. A family update is sealed and signed before it leaves the phone.")
                            .font(.body)
                    }
                }
                if !notice.isEmpty {
                    Text(notice).font(.subheadline).foregroundStyle(palette.sage)
                }
                MetalCard(padding: 18) {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("THIS PHONE")
                            .font(.caption.weight(.semibold))
                            .tracking(1.6)
                            .foregroundStyle(palette.metal)
                        CareField(label: "Your name", text: $deviceName, prompt: "Adrian")
                        Text(members.first { $0.isThisPhone }?.role.capitalized ?? "Parent")
                            .font(.subheadline)
                            .foregroundStyle(palette.muted)
                        if isParent {
                            CareField(label: "Circle name", text: circleName, prompt: "Family")
                        }
                    }
                }
                MetalCard(padding: 18) {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("CIRCLE")
                            .font(.caption.weight(.semibold))
                            .tracking(1.6)
                            .foregroundStyle(palette.metal)
                        ForEach(members) { member in
                            HStack {
                                Text(member.isThisPhone ? (deviceName.isEmpty ? "This iPhone" : deviceName) : member.name)
                                Spacer()
                                if isParent && !member.isThisPhone {
                                    Picker("Role", selection: Binding(
                                        get: { member.role },
                                        set: { member.role = $0; try? context.save() }
                                    )) {
                                        ForEach(["parent", "caregiver", "family", "viewer"], id: \.self) { Text($0.capitalized).tag($0) }
                                    }
                                    .labelsHidden()
                                } else {
                                    Text(member.role.capitalized).foregroundStyle(palette.muted)
                                }
                            }
                            .font(.subheadline)
                        }
                        if isParent {
                            Picker("Invite as", selection: $inviteRole) {
                                ForEach(roles, id: \.self) { Text($0.capitalized).tag($0) }
                            }
                            .pickerStyle(.segmented)
                            MetalButton(title: "Make an invite", filled: false) { makeInvite() }
                            if !inviteText.isEmpty, let image = QRCode.image(for: inviteText) {
                                Image(uiImage: image)
                                    .interpolation(.none)
                                    .resizable()
                                    .frame(width: 180, height: 180)
                                    .frame(maxWidth: .infinity)
                            }
                        }
                        CareField(label: "Paste an invite", text: $joinText, prompt: "Invite JSON")
                        MetalButton(title: "Join", filled: false) { join() }
                        MetalButton(title: "Copy a signed update", filled: false) { exportPackage() }
                        CareField(label: "Paste an update", text: $packageText, prompt: "Signed update")
                        MetalButton(title: "Apply update", filled: false) { applyPackage() }
                    }
                }
                if isParent {
                    MetalCard(padding: 18) {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("WHO CAN SEE WHAT")
                                .font(.caption.weight(.semibold))
                                .tracking(1.6)
                                .foregroundStyle(palette.metal)
                            ForEach(grants) { grant in
                                HStack {
                                    Text("\(grant.role.capitalized) · \(grant.area)")
                                        .font(.subheadline)
                                    Spacer()
                                    Picker("Access", selection: Binding(
                                        get: { grant.access },
                                        set: {
                                            grant.access = $0
                                            AuditLog.record(context, action: "grant.change", resource: "\(grant.role).\(grant.area)")
                                            try? context.save()
                                        }
                                    )) {
                                        ForEach(levels, id: \.self) { Text($0).tag($0) }
                                    }
                                    .labelsHidden()
                                }
                            }
                        }
                    }
                }
                NavigationLink {
                    HealthView()
                } label: {
                    MetalCard(padding: 18) {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Apple Health").font(.headline)
                                Text("Steps, heart rate, sleep, and blood pressure. Only after you allow it.")
                                    .font(.subheadline)
                                    .foregroundStyle(palette.muted)
                            }
                            Spacer()
                            Text("Open").foregroundStyle(palette.sage)
                        }
                    }
                }
                .buttonStyle(.plain)
                MetalCard(padding: 18) {
                    VStack(alignment: .leading, spacing: 16) {
                        setting("Parent mode", selection: Binding(
                            get: { parentMode ? "on" : "off" },
                            set: { parentMode = $0 == "on" }
                        ), options: [("off", "Off"), ("on", "On")])
                        setting("Appearance", selection: $appearance, options: [("system", "System"), ("light", "Light"), ("dark", "Dark")])
                        setting("Text size", selection: $textSize, options: [("standard", "Standard"), ("large", "Large"), ("extra", "Extra large")])
                    }
                }
                if !audits.isEmpty {
                    MetalCard(padding: 18) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("ON THIS PHONE")
                                .font(.caption.weight(.semibold))
                                .tracking(1.6)
                                .foregroundStyle(palette.metal)
                            ForEach(Array(audits.suffix(6).reversed())) { entry in
                                Text("\(entry.action) · \(entry.at.formatted(date: .omitted, time: .shortened))")
                                    .font(.caption)
                                    .foregroundStyle(palette.muted)
                            }
                        }
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
                    }
                }
            }
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.large)
            .onChange(of: deviceName) { _, newValue in
                if let me = members.first(where: \.isThisPhone) {
                    me.name = newValue.isEmpty ? "This iPhone" : newValue
                    try? context.save()
                }
            }
        }
    }

    private var circleName: Binding<String> {
        Binding(
            get: { circles.first?.name ?? "" },
            set: { newValue in
                circles.first?.name = newValue
                try? context.save()
            }
        )
    }

    private func makeInvite() {
        do {
            inviteText = try CircleSync.invite(role: inviteRole, context: context)
            UIPasteboard.general.string = inviteText
            notice = "Invite copied. The other phone pastes it under Join."
        } catch {
            notice = error.localizedDescription
        }
    }

    private func join() {
        do {
            try CircleSync.join(json: joinText, context: context)
            notice = "This phone joined the circle."
            joinText = ""
        } catch {
            notice = error.localizedDescription
        }
    }

    private func exportPackage() {
        do {
            let text = try CircleSync.exportPackage(context: context)
            UIPasteboard.general.string = text
            packageText = text
            notice = "Signed update copied."
        } catch {
            notice = error.localizedDescription
        }
    }

    private func applyPackage() {
        do {
            try CircleSync.applyPackage(json: packageText, context: context)
            notice = "Update applied."
            packageText = ""
        } catch {
            notice = error.localizedDescription
        }
    }

    private func setting(_ title: String, selection: Binding<String>, options: [(String, String)]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.subheadline.weight(.semibold))
            Picker(title, selection: selection) {
                ForEach(options, id: \.0) { option in
                    Text(option.1).tag(option.0)
                }
            }
            .pickerStyle(.segmented)
        }
    }
}
