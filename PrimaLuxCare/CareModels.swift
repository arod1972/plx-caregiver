import AVFoundation
import Foundation
import SwiftData

@Model
final class CareEvent {
    var uid: UUID
    var titleBox: Data
    var kind: String
    var startsAt: Date
    var repeatRule: String
    var notesBox: Data
    var updatedAt: Date

    var title: String {
        get { Vault.open(titleBox) }
        set { titleBox = Vault.seal(newValue); updatedAt = .now }
    }

    var notes: String {
        get { Vault.open(notesBox) }
        set { notesBox = Vault.seal(newValue); updatedAt = .now }
    }

    init(title: String, kind: String, startsAt: Date, repeatRule: String = "none", notes: String = "") {
        self.uid = UUID()
        self.titleBox = Vault.seal(title)
        self.kind = kind
        self.startsAt = startsAt
        self.repeatRule = repeatRule
        self.notesBox = Vault.seal(notes)
        self.updatedAt = .now
    }
}

@Model
final class Dose {
    var uid: UUID
    var nameBox: Data
    var dosageBox: Data
    var timeMinutes: Int
    var refillOn: Date?
    var takenLog: [Date]
    var updatedAt: Date
    var instructionsBox: Data = Data()
    var rxBox: Data = Data()
    var quantityText: String = ""
    var refillsText: String = ""
    var pharmacyBox: Data = Data()

    var name: String {
        get { Vault.open(nameBox) }
        set { nameBox = Vault.seal(newValue); updatedAt = .now }
    }

    var dosage: String {
        get { Vault.open(dosageBox) }
        set { dosageBox = Vault.seal(newValue); updatedAt = .now }
    }

    var instructions: String {
        get { Vault.open(instructionsBox) }
        set { instructionsBox = Vault.seal(newValue); updatedAt = .now }
    }

    var rxNumber: String {
        get { Vault.open(rxBox) }
        set { rxBox = Vault.seal(newValue); updatedAt = .now }
    }

    var pharmacy: String {
        get { Vault.open(pharmacyBox) }
        set { pharmacyBox = Vault.seal(newValue); updatedAt = .now }
    }

    init(
        name: String,
        dosage: String,
        timeMinutes: Int,
        refillOn: Date? = nil,
        instructions: String = "",
        rxNumber: String = "",
        quantity: String = "",
        refills: String = "",
        pharmacy: String = ""
    ) {
        self.uid = UUID()
        self.nameBox = Vault.seal(name)
        self.dosageBox = Vault.seal(dosage)
        self.timeMinutes = timeMinutes
        self.refillOn = refillOn
        self.takenLog = []
        self.updatedAt = .now
        self.instructionsBox = Vault.seal(instructions)
        self.rxBox = Vault.seal(rxNumber)
        self.quantityText = quantity
        self.refillsText = refills
        self.pharmacyBox = Vault.seal(pharmacy)
    }
}

@Model
final class Errand {
    var uid: UUID
    var titleBox: Data
    var notesBox: Data
    var assignee: String
    var dueOn: Date?
    var isDone: Bool
    var completedAt: Date?
    var updatedAt: Date

    var title: String {
        get { Vault.open(titleBox) }
        set { titleBox = Vault.seal(newValue); updatedAt = .now }
    }

    var notes: String {
        get { Vault.open(notesBox) }
        set { notesBox = Vault.seal(newValue); updatedAt = .now }
    }

    init(title: String, notes: String = "", assignee: String = "", dueOn: Date? = nil) {
        self.uid = UUID()
        self.titleBox = Vault.seal(title)
        self.notesBox = Vault.seal(notes)
        self.assignee = assignee
        self.dueOn = dueOn
        self.isDone = false
        self.completedAt = nil
        self.updatedAt = .now
    }
}

@Model
final class CircleNote {
    var uid: UUID
    var author: String
    var bodyBox: Data
    var sentAt: Date
    var updatedAt: Date

    var body: String {
        get { Vault.open(bodyBox) }
        set { bodyBox = Vault.seal(newValue); updatedAt = .now }
    }

    init(author: String, body: String, sentAt: Date = .now) {
        self.uid = UUID()
        self.author = author
        self.bodyBox = Vault.seal(body)
        self.sentAt = sentAt
        self.updatedAt = sentAt
    }
}

@Model
final class Member {
    var uid: UUID
    var name: String
    var role: String
    var publicKey: Data
    var isThisPhone: Bool

    init(name: String, role: String, publicKey: Data = Data(), isThisPhone: Bool = false) {
        self.uid = UUID()
        self.name = name
        self.role = role
        self.publicKey = publicKey
        self.isThisPhone = isThisPhone
    }
}

@Model
final class CareCircle {
    var uid: UUID
    var name: String

    init(name: String) {
        self.uid = UUID()
        self.name = name
    }
}

@Model
final class Grant {
    var role: String
    var area: String
    var access: String

    init(role: String, area: String, access: String) {
        self.role = role
        self.area = area
        self.access = access
    }
}

@Model
final class AuditEntry {
    var uid: UUID
    var action: String
    var resource: String
    var at: Date

    init(action: String, resource: String) {
        self.uid = UUID()
        self.action = action
        self.resource = resource
        self.at = .now
    }
}

enum CareDatabase {
    static var storeWarning: String?

    static let container: ModelContainer = {
        let schema = Schema([
            CareEvent.self, Dose.self, Errand.self, CircleNote.self,
            Member.self, CareCircle.self, Grant.self, AuditEntry.self,
        ])
        let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: NSTemporaryDirectory())
        let url = support.appending(path: "PrimaLuxCare-v2.store")
        let configuration = ModelConfiguration(schema: schema, url: url)
        do {
            return try ModelContainer(for: schema, configurations: configuration)
        } catch {
            storeWarning = "The saved list could not be opened. This launch is keeping care in memory only."
            let memory = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
            do {
                return try ModelContainer(for: schema, configurations: memory)
            } catch {
                fatalError("The care store could not open: \(error.localizedDescription)")
            }
        }
    }()

    @MainActor
    static func seedIfNeeded() {
        let context = ModelContext(container)
        let members = (try? context.fetch(FetchDescriptor<Member>())) ?? []
        if members.isEmpty {
            let key = Vault.signingKey()
            _ = Vault.circleKey()
            _ = Vault.symmetricKey()
            context.insert(CareCircle(name: "Family"))
            context.insert(Member(name: "This iPhone", role: "parent", publicKey: key.publicKey.x963Representation, isThisPhone: true))
            for role in ["caregiver", "family", "viewer"] {
                for area in ["calendar", "tasks", "meds", "updates"] {
                    let access = defaultAccess(role: role, area: area)
                    context.insert(Grant(role: role, area: area, access: access))
                }
            }
        }
        let doses = (try? context.fetch(FetchDescriptor<Dose>())) ?? []
        guard doses.isEmpty else {
            try? context.save()
            return
        }
        let calendar = Calendar.current
        let morning = calendar.date(bySettingHour: 8, minute: 0, second: 0, of: .now) ?? .now
        let lisinopril = Dose(name: "Lisinopril", dosage: "10 mg", timeMinutes: 8 * 60)
        let metformin = Dose(name: "Metformin", dosage: "500 mg", timeMinutes: 8 * 60)
        context.insert(lisinopril)
        context.insert(metformin)
        let tomorrow = calendar.date(byAdding: .day, value: 1, to: morning) ?? morning
        let clinicTime = calendar.date(bySettingHour: 10, minute: 30, second: 0, of: tomorrow) ?? tomorrow
        context.insert(CareEvent(title: "Clinic visit", kind: "Appointment", startsAt: clinicTime, notes: "Bring the medication list."))
        let friday = calendar.date(byAdding: .day, value: 3, to: .now) ?? .now
        context.insert(Errand(title: "Pick up the prescription", notes: "Pharmacy on Street Road", assignee: "You", dueOn: friday))
        context.insert(CircleNote(author: "You", body: "Morning doses are set for 8:00.", sentAt: morning))
        context.insert(AuditEntry(action: "store.create", resource: "device"))
        try? context.save()
        CareReminders.schedule(dose: lisinopril)
        CareReminders.schedule(dose: metformin)
    }

    static func defaultAccess(role: String, area: String) -> String {
        if role == "caregiver" { return "edit" }
        if role == "family" { return area == "updates" ? "edit" : "view" }
        return "view"
    }
}

enum CareAccess {
    private static var cachedRole: String?

    static func invalidate() {
        cachedRole = nil
    }

    static func role(_ context: ModelContext) -> String {
        if let cachedRole { return cachedRole }
        let members = (try? context.fetch(FetchDescriptor<Member>())) ?? []
        let found = members.first { $0.isThisPhone }?.role ?? "parent"
        cachedRole = found
        return found
    }

    static func allows(_ area: String, edit: Bool, context: ModelContext) -> Bool {
        let role = role(context)
        if role == "parent" { return true }
        let grants = (try? context.fetch(FetchDescriptor<Grant>())) ?? []
        let access = grants.first { $0.role == role && $0.area == area }?.access ?? "none"
        if access == "none" { return false }
        return edit ? access == "edit" : true
    }
}

enum AuditLog {
    static func record(_ context: ModelContext, action: String, resource: String) {
        context.insert(AuditEntry(action: action, resource: resource))
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

    static func label(date: Date) -> String {
        date.formatted(date: .omitted, time: .shortened)
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
            dose.takenLog = dose.takenLog.filter { !Calendar.current.isDate($0, inSameDayAs: day) }
        } else {
            dose.takenLog = dose.takenLog + [Calendar.current.startOfDay(for: day)]
        }
        dose.updatedAt = .now
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
