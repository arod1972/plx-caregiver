import SwiftUI
import SwiftData

struct ScanView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.colorScheme) private var scheme
    @Query(sort: \Dose.timeMinutes) private var doses: [Dose]
    @StateObject private var capture = LabelCapture()
    @State private var typed = ""
    @State private var draft = LabelReading()
    @State private var reviewing = false
    @State private var message = ""

    var body: some View {
        let palette = Palette.current(scheme)
        ZStack(alignment: .bottom) {
            if capture.cameraOn {
                LabelPreview(session: capture.session, front: capture.usingFront)
                    .ignoresSafeArea()
            } else {
                palette.canvas.ignoresSafeArea()
            }
            VStack(alignment: .leading, spacing: 12) {
                Text(capture.cameraOn ? capture.hint : "This simulator has no camera. Paste the words from the label.")
                    .font(.subheadline)
                    .foregroundStyle(palette.ink)
                if capture.usingFront {
                    Text("The phone can lie flat. Hold the bottle above the front camera.")
                        .font(.subheadline)
                        .foregroundStyle(palette.muted)
                }
                if !capture.cameraOn {
                    CareField(label: "Words on the label", text: $typed, prompt: "Lisinopril 10 mg\nTake 1 tablet by mouth daily")
                    MetalButton(title: "Read the label", filled: false) {
                        draft = LabelParser.parse(typed.components(separatedBy: .newlines))
                        reviewing = true
                    }
                } else {
                    found(palette)
                    MetalButton(title: "Use this label") { beginReview() }
                        .disabled(!capture.reading.canAdd)
                        .opacity(capture.reading.canAdd ? 1 : 0.45)
                }
                Text("The picture is not kept. Nothing is added until you confirm it.")
                    .font(.caption)
                    .foregroundStyle(palette.muted)
            }
            .padding(16)
            .background(palette.paper)
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
            .padding(.horizontal, 12)
            .padding(.bottom, 8)
        }
        .overlay(alignment: .topTrailing) {
            if capture.cameraOn {
                Button(action: capture.flip) {
                    Label(capture.usingFront ? "Front" : "Back", systemImage: "arrow.triangle.2.circlepath.camera")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(palette.onSage)
                        .padding(.horizontal, 14)
                        .frame(minHeight: 44)
                        .background(palette.sage)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
                .padding(.trailing, 16)
                .padding(.top, 8)
                .accessibilityLabel(capture.usingFront ? "Switch to the back camera" : "Switch to the front camera")
            }
        }
        .navigationTitle("Scan a label")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { capture.start() }
        .onDisappear { capture.stop() }
        .sheet(isPresented: $reviewing) {
            review(palette)
        }
    }

    private func found(_ palette: Palette) -> some View {
        let reading = capture.reading
        VStack(alignment: .leading, spacing: 4) {
            line("Medicine", reading.drugName.isEmpty ? "Still looking" : reading.drugName, palette: palette)
            line("Dose", reading.dosage, palette: palette)
            line("Directions", reading.instructions, palette: palette)
            line("Rx", reading.rxNumber, palette: palette)
            line("Qty", reading.quantity, palette: palette)
            line("Refills", reading.refills, palette: palette)
            line("Pharmacy", reading.pharmacy, palette: palette)
        }
    }

    private func line(_ title: String, _ value: String, palette: Palette) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundStyle(palette.metal)
                .frame(width: 78, alignment: .leading)
            Text(value.isEmpty ? "—" : value)
                .font(.subheadline)
                .foregroundStyle(value.isEmpty ? palette.muted : palette.ink)
                .lineLimit(2)
        }
    }

    private func review(_ palette: Palette) -> some View {
        let match = matchedDose(draft.drugName)
        return NavigationStack {
            CareScreen {
                if !message.isEmpty {
                    Text(message).font(.subheadline).foregroundStyle(palette.sage)
                }
                if !draft.patient.isEmpty {
                    Text("The label is for \(draft.patient). That name is not saved.")
                        .font(.subheadline)
                        .foregroundStyle(palette.muted)
                }
                CareField(label: "Medicine", text: $draft.drugName, prompt: "Lisinopril")
                CareField(label: "Dose", text: $draft.dosage, prompt: "10 mg")
                CareField(label: "Directions", text: $draft.instructions, prompt: "Take 1 tablet by mouth daily")
                CareField(label: "Rx number", text: $draft.rxNumber, prompt: "Optional")
                CareField(label: "Quantity", text: $draft.quantity, prompt: "30")
                CareField(label: "Refills", text: $draft.refills, prompt: "3")
                CareField(label: "Pharmacy", text: $draft.pharmacy, prompt: "Optional")
                if let match {
                    Text("\(match.name) is already on the list.")
                        .font(.subheadline)
                        .foregroundStyle(palette.muted)
                    MetalButton(title: "Update \(match.name)") { save(into: match) }
                    MetalButton(title: CareClock.takenToday(match) ? "Mark not taken" : "Mark taken", filled: false) {
                        CareClock.toggleTaken(match)
                        AuditLog.record(context, action: "dose.scan", resource: match.uid.uuidString)
                        try? context.save()
                        message = CareClock.takenToday(match) ? "Marked taken." : "Marked not taken."
                    }
                }
                MetalButton(title: "Add medication", filled: match == nil) { save(into: nil) }
                    .disabled(draft.drugName.trimmingCharacters(in: .whitespaces).count < 3)
                MetalButton(title: "Keep scanning", filled: false) {
                    reviewing = false
                    capture.paused = false
                }
            }
            .navigationTitle("Check the label")
            .navigationBarTitleDisplayMode(.inline)
        }
        .presentationDetents([.large])
        .tint(palette.sage)
    }

    private func beginReview() {
        draft = capture.reading
        capture.paused = true
        reviewing = true
    }

    private func matchedDose(_ name: String) -> Dose? {
        let needle = name.lowercased().trimmingCharacters(in: .whitespaces)
        guard needle.count >= 4 else { return nil }
        return doses.first { $0.name.lowercased() == needle }
            ?? doses.first { needle.contains($0.name.lowercased()) || $0.name.lowercased().contains(needle) }
    }

    private func save(into existing: Dose?) {
        let name = draft.drugName.trimmingCharacters(in: .whitespaces)
        guard name.count >= 3 else { return }
        let saved: Dose
        if let existing {
            existing.name = name
            existing.dosage = draft.dosage.trimmingCharacters(in: .whitespaces)
            existing.instructions = draft.instructions.trimmingCharacters(in: .whitespacesAndNewlines)
            existing.rxNumber = draft.rxNumber.trimmingCharacters(in: .whitespaces)
            existing.quantityText = draft.quantity.trimmingCharacters(in: .whitespaces)
            existing.refillsText = draft.refills.trimmingCharacters(in: .whitespaces)
            existing.pharmacy = draft.pharmacy.trimmingCharacters(in: .whitespacesAndNewlines)
            saved = existing
        } else {
            let created = Dose(
                name: name,
                dosage: draft.dosage.trimmingCharacters(in: .whitespaces),
                timeMinutes: draft.suggestedMinutes,
                instructions: draft.instructions.trimmingCharacters(in: .whitespacesAndNewlines),
                rxNumber: draft.rxNumber.trimmingCharacters(in: .whitespaces),
                quantity: draft.quantity.trimmingCharacters(in: .whitespaces),
                refills: draft.refills.trimmingCharacters(in: .whitespaces),
                pharmacy: draft.pharmacy.trimmingCharacters(in: .whitespacesAndNewlines)
            )
            context.insert(created)
            saved = created
        }
        AuditLog.record(context, action: "medication.scan", resource: saved.uid.uuidString)
        try? context.save()
        CareReminders.schedule(dose: saved)
        message = existing == nil ? "Added \(saved.name)." : "Updated \(saved.name)."
    }
}
