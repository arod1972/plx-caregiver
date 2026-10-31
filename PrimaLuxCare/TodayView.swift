import SwiftUI
import SwiftData

struct TodayView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.colorScheme) private var scheme
    @Query(sort: \CareEvent.startsAt) private var events: [CareEvent]
    @Query(sort: \Dose.timeMinutes) private var doses: [Dose]
    @AppStorage("parentMode") private var parentMode = false
    @AppStorage("doseCheck") private var doseCheck = "tap"
    @State private var selected = Calendar.current.startOfDay(for: .now)
    @State private var adding = false
    @State private var verifying: Dose?

    var body: some View {
        let palette = Palette.current(scheme)
        let canEdit = CareAccess.allows("calendar", edit: true, context: context)
        let canView = CareAccess.allows("calendar", edit: false, context: context)
        let dayEvents = events.filter { CareClock.event($0, occursOn: selected) }
        NavigationStack {
            CareScreen {
                if let warning = CareDatabase.storeWarning {
                    Text(warning).foregroundStyle(palette.muted)
                }
                hero(palette)
                if !canView {
                    EmptyCare(title: "Not shared", bodyText: "The calendar is not on this phone for your role.")
                } else {
                weekStrip(palette)
                if dayEvents.isEmpty && doses.isEmpty {
                    EmptyCare(title: "Nothing scheduled", bodyText: "This day is clear.")
                } else {
                    MetalCard {
                        VStack(spacing: 0) {
                            ForEach(doses) { dose in
                                doseRow(dose, palette: palette, last: dose.uid == doses.last?.uid && dayEvents.isEmpty)
                            }
                            ForEach(dayEvents) { event in
                                eventRow(event, palette: palette, last: event.uid == dayEvents.last?.uid)
                            }
                        }
                    }
                }
                if parentMode {
                    MetalButton(title: "Read aloud", filled: false) {
                        Speaker.say(spoken(dayEvents))
                    }
                }
                }
            }
            .navigationTitle("Calendar")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if canEdit {
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
                            .overlay {
                                Circle().strokeBorder(palette.metalLight.opacity(0.8), lineWidth: 1)
                            }
                    }
                    .accessibilityLabel("Add an event")
                }
                }
            }
            .sheet(isPresented: $adding) {
                EventEditor(day: selected)
            }
            .sheet(item: $verifying) { dose in
                VerifyScan(expectedName: dose.name) {
                    CareClock.toggleTaken(dose, on: selected)
                    AuditLog.record(context, action: "dose.scan", resource: dose.uid.uuidString)
                    try? context.save()
                    verifying = nil
                }
            }
        }
    }

    private func hero(_ palette: Palette) -> some View {
        HStack(alignment: .center, spacing: 16) {
            ZStack {
                CareSeal(size: 88)
                Text(selected.formatted(.dateTime.day()))
                    .font(.system(size: 32, weight: .semibold))
                    .foregroundStyle(palette.ink)
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(selected.formatted(.dateTime.weekday(.wide)).uppercased())
                    .font(.caption.weight(.semibold))
                    .tracking(1.6)
                    .foregroundStyle(palette.metal)
                Text(selected.formatted(.dateTime.month(.wide)))
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(palette.ink)
                Text(parentMode ? "Your day." : "Appointments, visits, and doses.")
                    .font(.subheadline)
                    .foregroundStyle(palette.muted)
            }
            Spacer(minLength: 0)
        }
    }

    private func weekStrip(_ palette: Palette) -> some View {
        let days = CareClock.week(containing: .now)
        return HStack(spacing: 4) {
            ForEach(days, id: \.self) { day in
                let active = CareClock.sameDay(day, selected)
                let busy = events.contains { CareClock.event($0, occursOn: day) }
                Button {
                    selected = day
                } label: {
                    VStack(spacing: 6) {
                        Text(day.formatted(.dateTime.weekday(.narrow)))
                            .font(.caption2.weight(.semibold))
                        Text(day.formatted(.dateTime.day()))
                            .font(.body.weight(.semibold))
                        Circle()
                            .fill(busy ? (active ? palette.onSage : palette.metal) : Color.clear)
                            .frame(width: 4, height: 4)
                    }
                    .foregroundStyle(active ? palette.onSage : palette.ink)
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: 72)
                    .background(active ? palette.sage : Color.clear)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay {
                        if active {
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .strokeBorder(palette.metalLight.opacity(0.7), lineWidth: 1)
                        }
                    }
                }
                .buttonStyle(.plain)
                .accessibilityLabel(CareClock.dayTitle(day))
            }
        }
    }

    private func doseRow(_ dose: Dose, palette: Palette, last: Bool) -> some View {
        let taken = CareClock.takenToday(dose, on: selected)
        return Button {
            mark(dose, taken: taken)
        } label: {
            HStack(alignment: .center, spacing: 12) {
                Text(CareClock.label(minutes: dose.timeMinutes))
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(palette.ink)
                    .frame(width: 76, alignment: .leading)
                VStack(alignment: .leading, spacing: 2) {
                    Text(dose.name)
                        .font(.headline)
                        .foregroundStyle(palette.ink)
                    Text(doseLine(dose, taken: taken))
                        .font(.caption)
                        .foregroundStyle(palette.muted)
                }
                Spacer(minLength: 0)
                if doseCheck == "scan" && !taken {
                    Image(systemName: "camera")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(palette.sage)
                }
                DoseMark(done: taken)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .contentShape(Rectangle())
        }
        .buttonStyle(.borderless)
        .accessibilityLabel(taken ? "\(dose.name) taken" : "Mark \(dose.name) taken")
        .overlay(alignment: .bottom) {
            if !last { Rectangle().fill(palette.line).frame(height: 1).padding(.leading, 16) }
        }
    }

    private func mark(_ dose: Dose, taken: Bool) {
        if taken {
            CareClock.toggleTaken(dose, on: selected)
            AuditLog.record(context, action: "dose.taken", resource: dose.uid.uuidString)
            try? context.save()
            return
        }
        if doseCheck == "scan" {
            verifying = dose
            return
        }
        CareClock.toggleTaken(dose, on: selected)
        AuditLog.record(context, action: "dose.taken", resource: dose.uid.uuidString)
        try? context.save()
    }

    private func eventRow(_ event: CareEvent, palette: Palette, last: Bool) -> some View {
        HStack(alignment: .center, spacing: 12) {
            Text(event.kind == "Important date" ? "All day" : CareClock.label(date: event.startsAt))
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(palette.ink)
                .frame(width: 76, alignment: .leading)
            VStack(alignment: .leading, spacing: 2) {
                Text(event.title)
                    .font(.headline)
                    .foregroundStyle(palette.ink)
                Text(event.kind)
                    .font(.caption)
                    .foregroundStyle(palette.muted)
                if !event.notes.isEmpty {
                    Text(event.notes)
                        .font(.subheadline)
                        .foregroundStyle(palette.muted)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .overlay(alignment: .bottom) {
            if !last { Rectangle().fill(palette.line).frame(height: 1).padding(.leading, 16) }
        }
    }

    private func doseLine(_ dose: Dose, taken: Bool) -> String {
        let state = taken ? "Taken" : (doseCheck == "scan" ? "Scan the bottle to mark" : "Not taken yet")
        if dose.dosage.isEmpty { return state }
        return "\(dose.dosage) · \(state)"
    }

    private func spoken(_ dayEvents: [CareEvent]) -> String {
        let meds = doses.map { "\($0.name) at \(CareClock.label(minutes: $0.timeMinutes))." }.joined(separator: " ")
        let visits = dayEvents.map { "\($0.title) at \(CareClock.label(date: $0.startsAt))." }.joined(separator: " ")
        if meds.isEmpty && visits.isEmpty { return "Nothing is scheduled." }
        return "Today. \(meds) \(visits)"
    }
}

struct EventEditor: View {
    var day: Date
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @Environment(\.colorScheme) private var scheme
    @State private var title = ""
    @State private var kind = "Appointment"
    @State private var time = Calendar.current.date(bySettingHour: 9, minute: 0, second: 0, of: .now) ?? .now
    @State private var notes = ""
    @State private var repeatRule = "none"

    private let kinds = ["Appointment", "Visit", "Important date"]
    private let repeats = [("none", "Once"), ("weekly", "Weekly"), ("monthly", "Monthly")]

    var body: some View {
        let palette = Palette.current(scheme)
        NavigationStack {
            CareScreen {
                CareField(label: "Title", text: $title, prompt: "Clinic visit")
                VStack(alignment: .leading, spacing: 8) {
                    Text("Kind")
                        .font(.subheadline.weight(.semibold))
                    Picker("Kind", selection: $kind) {
                        ForEach(kinds, id: \.self) { Text($0).tag($0) }
                    }
                    .pickerStyle(.segmented)
                }
                if kind != "Important date" {
                    DatePicker("Time", selection: $time, displayedComponents: .hourAndMinute)
                        .font(.subheadline.weight(.semibold))
                }
                CareField(label: "Notes", text: $notes, prompt: "Optional")
                Picker("Repeats", selection: $repeatRule) {
                    ForEach(repeats, id: \.0) { Text($0.1).tag($0.0) }
                }
                MetalButton(title: "Save") { save() }
                    .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                MetalButton(title: "Close", filled: false) { dismiss() }
            }
            .navigationTitle("New event")
            .navigationBarTitleDisplayMode(.inline)
        }
        .presentationDetents([.large])
        .tint(palette.sage)
    }

    private func save() {
        let calendar = Calendar.current
        let clock = calendar.dateComponents([.hour, .minute], from: time)
        var parts = calendar.dateComponents([.year, .month, .day], from: day)
        parts.hour = kind == "Important date" ? 9 : clock.hour
        parts.minute = kind == "Important date" ? 0 : clock.minute
        let when = calendar.date(from: parts) ?? day
        let event = CareEvent(title: title.trimmingCharacters(in: .whitespaces), kind: kind, startsAt: when, repeatRule: repeatRule, notes: notes.trimmingCharacters(in: .whitespaces))
        context.insert(event)
        AuditLog.record(context, action: "calendar.save", resource: event.uid.uuidString)
        try? context.save()
        CareReminders.schedule(event: event)
        dismiss()
    }
}
