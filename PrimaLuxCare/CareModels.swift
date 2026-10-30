import Foundation
import SwiftData
import AVFoundation

@Model
final class CareEvent {
    var uid: UUID
    var title: String
    var kind: String
    var startsAt: Date
    var repeatRule: String
    var notes: String

    init(title: String, kind: String, startsAt: Date, repeatRule: String = "none", notes: String = "") {
        self.uid = UUID()
        self.title = title
        self.kind = kind
        self.startsAt = startsAt
        self.repeatRule = repeatRule
        self.notes = notes
    }
}

@Model
final class Dose {
    var uid: UUID
    var name: String
    var dosage: String
    var timeMinutes: Int
    var refillOn: Date?
    var takenLog: [Date]

    init(name: String, dosage: String, timeMinutes: Int, refillOn: Date? = nil) {
        self.uid = UUID()
        self.name = name
        self.dosage = dosage
        self.timeMinutes = timeMinutes
        self.refillOn = refillOn
        self.takenLog = []
    }
}

@Model
final class Errand {
    var uid: UUID
    var title: String
    var notes: String
    var assignee: String
    var dueOn: Date?
    var isDone: Bool
    var completedAt: Date?

    init(title: String, notes: String = "", assignee: String = "", dueOn: Date? = nil) {
        self.uid = UUID()
        self.title = title
        self.notes = notes
        self.assignee = assignee
        self.dueOn = dueOn
        self.isDone = false
        self.completedAt = nil
    }
}

@Model
final class CircleNote {
    var uid: UUID
    var author: String
    var body: String
    var sentAt: Date

    init(author: String, body: String, sentAt: Date = .now) {
        self.uid = UUID()
        self.author = author
        self.body = body
        self.sentAt = sentAt
    }
}

enum CareDatabase {
    static let container: ModelContainer = {
        do {
            return try ModelContainer(for: CareEvent.self, Dose.self, Errand.self, CircleNote.self)
        } catch {
            fatalError("The care store could not open: \(error.localizedDescription)")
        }
    }()

    @MainActor
    static func seedIfNeeded() {
        let context = ModelContext(container)
        let doses = (try? context.fetch(FetchDescriptor<Dose>())) ?? []
        guard doses.isEmpty else { return }
        let calendar = Calendar.current
        let morning = calendar.date(bySettingHour: 8, minute: 0, second: 0, of: .now) ?? .now
        context.insert(Dose(name: "Lisinopril", dosage: "10 mg", timeMinutes: 8 * 60))
        context.insert(Dose(name: "Metformin", dosage: "500 mg", timeMinutes: 8 * 60))
        let tomorrow = calendar.date(byAdding: .day, value: 1, to: morning) ?? morning
        let clinic = calendar.date(bySettingHour: 10, minute: 30, second: 0, of: tomorrow) ?? tomorrow
        context.insert(CareEvent(title: "Clinic visit", kind: "Appointment", startsAt: clinic, notes: "Bring the medication list."))
        let friday = calendar.date(byAdding: .day, value: 3, to: .now) ?? .now
        context.insert(Errand(title: "Pick up the prescription", notes: "Pharmacy on Street Road", assignee: "You", dueOn: friday))
        context.insert(CircleNote(author: "You", body: "Morning doses are set for 8:00.", sentAt: morning))
        try? context.save()
    }
}

enum CareClock {
    static func label(minutes: Int) -> String {
        var parts = DateComponents()
        parts.hour = minutes / 60
        parts.minute = minutes % 60
        let date = Calendar.current.date(from: parts) ?? .now
        return date.formatted(date: .omitted, time: .shortened)
    }

    static func label(date: Date, allDay: Bool = false) -> String {
        if allDay { return "All day" }
        return date.formatted(date: .omitted, time: .shortened)
    }

    static func dayTitle(_ date: Date) -> String {
        date.formatted(.dateTime.weekday(.wide).month(.wide).day())
    }

    static func sameDay(_ a: Date, _ b: Date) -> Bool {
        Calendar.current.isDate(a, inSameDayAs: b)
    }

    static func week(containing date: Date) -> [Date] {
        let calendar = Calendar.current
        let start = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: date)) ?? date
        return (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: calendar.startOfDay(for: start)) }
    }

    static func event(_ event: CareEvent, occursOn day: Date) -> Bool {
        let calendar = Calendar.current
        let start = calendar.startOfDay(for: event.startsAt)
        let target = calendar.startOfDay(for: day)
        if target < start { return false }
        switch event.repeatRule {
        case "daily":
            return true
        case "weekly":
            return calendar.component(.weekday, from: event.startsAt) == calendar.component(.weekday, from: day)
        case "monthly":
            return calendar.component(.day, from: event.startsAt) == calendar.component(.day, from: day)
        default:
            return calendar.isDate(event.startsAt, inSameDayAs: day)
        }
    }

    static func takenToday(_ dose: Dose, on day: Date = .now) -> Bool {
        dose.takenLog.contains { Calendar.current.isDate($0, inSameDayAs: day) }
    }

    static func toggleTaken(_ dose: Dose, on day: Date = .now) {
        if takenToday(dose, on: day) {
            dose.takenLog.removeAll { Calendar.current.isDate($0, inSameDayAs: day) }
        } else {
            dose.takenLog.append(day)
        }
    }

    static func weekTaken(_ dose: Dose, now: Date = .now) -> Int {
        let calendar = Calendar.current
        let start = calendar.date(byAdding: .day, value: -6, to: calendar.startOfDay(for: now)) ?? now
        return dose.takenLog.filter { $0 >= start && $0 <= now.addingTimeInterval(60) }.count
    }
}

enum Speaker {
    private static let synth = AVSpeechSynthesizer()

    static func say(_ text: String) {
        synth.stopSpeaking(at: .immediate)
        let utterance = AVSpeechUtterance(string: text)
        utterance.rate = 0.46
        utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        synth.speak(utterance)
    }
}
