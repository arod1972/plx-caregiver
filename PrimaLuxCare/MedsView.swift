import SwiftUI
import SwiftData

struct MedsView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.colorScheme) private var scheme
    @Query(sort: \Dose.timeMinutes) private var doses: [Dose]
    @AppStorage("parentMode") private var parentMode = false
    @State private var adding = false
    @State private var editing: Dose?

    var body: some View {
        let palette = Palette.current(scheme)
        let remaining = doses.filter { !CareClock.takenToday($0) }.count
        NavigationStack {
            CareScreen {
                VStack(alignment: .leading, spacing: 6) {
                    Text("EVERY DAY")
                        .font(.caption.weight(.semibold))
                        .tracking(1.6)
                        .foregroundStyle(palette.metal)
                    Text(remaining == 0 ? "All marked for today." : "\(remaining) still to take.")
                        .font(.subheadline)
                        .foregroundStyle(palette.muted)
                }
                if doses.isEmpty {
                    EmptyCare(title: "No medications", bodyText: "Add a name, a dose, and a time.")
                } else {
                    MetalCard {
                        VStack(spacing: 0) {
                            ForEach(doses) { dose in
                                row(dose, palette: palette, last: dose.uid == doses.last?.uid)
                            }
                        }
                    }
                }
                if parentMode {
                    MetalButton(title: "Read aloud", filled: false) {
                        let text = doses.map { "\($0.name), \($0.dosage), at \(CareClock.label(minutes: $0.timeMinutes))." }.joined(separator: " ")
                        Speaker.say(text.isEmpty ? "No medications." : text)
                    }
                }
            }
            .navigationTitle("Medications")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        adding = true
                    } label: {
                        Image(systemName: "plus")
                            .font(.body.weight(.semibold))
                            .foregroundStyle(palette.onSage)
                            .frame(width: 36, height: 36)
                            .background(palette.sage)
                            .clipShape(Circle())
                            .overlay { Circle().strokeBorder(palette.metalLight.opacity(0.8), lineWidth: 1) }
                    }
                    .accessibilityLabel("Add a medication")
                }
            }
            .sheet(isPresented: $adding) { DoseEditor(dose: nil) }
            .sheet(item: $editing) { dose in DoseEditor(dose: dose) }
        }
    }

    private func row(_ dose: Dose, palette: Palette, last: Bool) -> some View {
        HStack(spacing: 12) {
            Button {
                editing = dose
            } label: {
                HStack(spacing: 12) {
                    Text(CareClock.label(minutes: dose.timeMinutes))
                        .font(.subheadline.weight(.semibold))
                        .frame(width: 76, alignment: .leading)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(dose.name).font(.headline)
                        Text(detail(dose)).font(.caption).foregroundStyle(palette.muted)
                        Text("This week \(CareClock.weekTaken(dose)) of 7")
                            .font(.caption2)
                            .foregroundStyle(palette.metal)
                    }
                    Spacer(minLength: 0)
                }
            }
            .buttonStyle(.plain)
            .foregroundStyle(palette.ink)
            DoseMark(done: CareClock.takenToday(dose)) {
                CareClock.toggleTaken(dose)
            }
            .accessibilityLabel(CareClock.takenToday(dose) ? "\(dose.name) taken" : "Mark \(dose.name) taken")
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .overlay(alignment: .bottom) {
            if !last { Rectangle().fill(palette.line).frame(height: 1).padding(.leading, 16) }
        }
    }

    private func detail(_ dose: Dose) -> String {
        let state = CareClock.takenToday(dose) ? "Taken" : "Not taken yet"
        let refill: String = {
            guard let refillOn = dose.refillOn else { return "" }
            return " · Refill \(refillOn.formatted(.dateTime.month(.abbreviated).day()))"
        }()
        if dose.dosage.isEmpty { return state + refill }
        return "\(dose.dosage) · \(state)\(refill)"
    }
}

struct DoseEditor: View {
    var dose: Dose?
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @Environment(\.colorScheme) private var scheme
    @State private var name = ""
    @State private var dosage = ""
    @State private var time = Calendar.current.date(bySettingHour: 8, minute: 0, second: 0, of: .now) ?? .now
    @State private var hasRefill = false
    @State private var refill = Calendar.current.date(byAdding: .month, value: 1, to: .now) ?? .now

    var body: some View {
        let palette = Palette.current(scheme)
        NavigationStack {
            CareScreen {
                CareField(label: "Name", text: $name, prompt: "Lisinopril")
                CareField(label: "Dosage", text: $dosage, prompt: "10 mg")
                DatePicker("Time", selection: $time, displayedComponents: .hourAndMinute)
                Toggle("Refill date", isOn: $hasRefill)
                if hasRefill {
                    DatePicker("Refill", selection: $refill, displayedComponents: .date)
                }
                MetalButton(title: "Save") { save() }
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                if dose != nil {
                    MetalButton(title: "Remove", filled: false) {
                        if let dose { context.delete(dose) }
                        dismiss()
                    }
                }
                MetalButton(title: "Close", filled: false) { dismiss() }
            }
            .navigationTitle(dose == nil ? "New medication" : "Edit medication")
            .navigationBarTitleDisplayMode(.inline)
        }
        .presentationDetents([.large])
        .tint(palette.sage)
        .onAppear {
            guard let dose else { return }
            name = dose.name
            dosage = dose.dosage
            var parts = DateComponents()
            parts.hour = dose.timeMinutes / 60
            parts.minute = dose.timeMinutes % 60
            time = Calendar.current.date(from: parts) ?? time
            if let refillOn = dose.refillOn {
                hasRefill = true
                refill = refillOn
            }
        }
    }

    private func save() {
        let clock = Calendar.current.dateComponents([.hour, .minute], from: time)
        let minutes = (clock.hour ?? 8) * 60 + (clock.minute ?? 0)
        let cleanName = name.trimmingCharacters(in: .whitespaces)
        let cleanDose = dosage.trimmingCharacters(in: .whitespaces)
        if let dose {
            dose.name = cleanName
            dose.dosage = cleanDose
            dose.timeMinutes = minutes
            dose.refillOn = hasRefill ? refill : nil
        } else {
            context.insert(Dose(name: cleanName, dosage: cleanDose, timeMinutes: minutes, refillOn: hasRefill ? refill : nil))
        }
        dismiss()
    }
}
