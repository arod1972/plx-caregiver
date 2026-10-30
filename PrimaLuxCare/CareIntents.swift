import AppIntents
import SwiftData

struct MarkDoseTakenIntent: AppIntent {
    static var title: LocalizedStringResource = "Mark Dose Taken"
    static var description = IntentDescription("Marks a saved medication taken on this iPhone.")
    static var openAppWhenRun = true

    @Parameter(title: "Medication")
    var medication: String

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let spoken = medication
        let message: String = await MainActor.run {
            let context = ModelContext(CareDatabase.container)
            let doses = (try? context.fetch(FetchDescriptor<Dose>())) ?? []
            let needle = spoken.lowercased()
            guard let dose = doses.first(where: { $0.name.lowercased() == needle }) ?? doses.first(where: { $0.name.lowercased().contains(needle) }) else {
                return "No medication named \(spoken)."
            }
            if !CareClock.takenToday(dose) {
                CareClock.toggleTaken(dose)
                AuditLog.record(context, action: "dose.siri", resource: dose.uid.uuidString)
                try? context.save()
            }
            return "Marked \(dose.name) taken."
        }
        return .result(dialog: IntentDialog(stringLiteral: message))
    }
}

struct QueryCalendarIntent: AppIntent {
    static var title: LocalizedStringResource = "Today’s Care"
    static var description = IntentDescription("Reads today’s medications and calendar on this iPhone.")
    static var openAppWhenRun = true

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let message: String = await MainActor.run {
            let context = ModelContext(CareDatabase.container)
            let doses = (try? context.fetch(FetchDescriptor<Dose>())) ?? []
            let events = ((try? context.fetch(FetchDescriptor<CareEvent>())) ?? []).filter { CareClock.event($0, occursOn: .now) }
            let meds = doses.map { "\($0.name) at \(CareClock.label(minutes: $0.timeMinutes))" }
            let visits = events.map { "\($0.title) at \(CareClock.label(date: $0.startsAt))" }
            let lines = meds + visits
            return lines.isEmpty ? "Nothing is scheduled today." : lines.joined(separator: ". ")
        }
        return .result(dialog: IntentDialog(stringLiteral: message))
    }
}

struct AddTaskIntent: AppIntent {
    static var title: LocalizedStringResource = "Add Care Task"
    static var description = IntentDescription("Adds a task on this iPhone.")
    static var openAppWhenRun = true

    @Parameter(title: "Task")
    var titleText: String

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let spoken = titleText.trimmingCharacters(in: .whitespacesAndNewlines)
        let message: String = await MainActor.run {
            guard !spoken.isEmpty else { return "Say the task to add." }
            let context = ModelContext(CareDatabase.container)
            let errand = Errand(title: spoken, assignee: "You")
            context.insert(errand)
            AuditLog.record(context, action: "task.siri", resource: errand.uid.uuidString)
            try? context.save()
            CareReminders.schedule(errand: errand)
            return "Added \(spoken)."
        }
        return .result(dialog: IntentDialog(stringLiteral: message))
    }
}

struct CareShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: MarkDoseTakenIntent(),
            phrases: ["Mark \(\.$medication) taken in \(.applicationName)"],
            shortTitle: "Mark taken",
            systemImageName: "pills"
        )
        AppShortcut(
            intent: QueryCalendarIntent(),
            phrases: ["What's on today in \(.applicationName)", "Read my calendar in \(.applicationName)"],
            shortTitle: "Today",
            systemImageName: "calendar"
        )
        AppShortcut(
            intent: AddTaskIntent(),
            phrases: ["Add a task in \(.applicationName)"],
            shortTitle: "Add task",
            systemImageName: "checkmark.circle"
        )
    }
}
