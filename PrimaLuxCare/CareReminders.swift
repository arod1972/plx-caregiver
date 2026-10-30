import Foundation
import UserNotifications

enum CareReminders {
    static func authorize() async -> Bool {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        switch settings.authorizationStatus {
        case .authorized, .provisional, .ephemeral:
            return true
        case .notDetermined:
            return (try? await center.requestAuthorization(options: [.alert, .sound])) ?? false
        default:
            return false
        }
    }

    static func schedule(dose: Dose) {
        let uid = dose.uid
        let title = dose.name
        let body = dose.dosage.isEmpty ? "Time for this dose." : dose.dosage
        let hour = dose.timeMinutes / 60
        let minute = dose.timeMinutes % 60
        Task {
            guard await authorize() else { return }
            let content = UNMutableNotificationContent()
            content.title = title
            content.body = body
            content.sound = .default
            var parts = DateComponents()
            parts.hour = hour
            parts.minute = minute
            let trigger = UNCalendarNotificationTrigger(dateMatching: parts, repeats: true)
            let request = UNNotificationRequest(identifier: "dose-\(uid.uuidString)", content: content, trigger: trigger)
            try? await UNUserNotificationCenter.current().add(request)
        }
    }

    static func schedule(event: CareEvent) {
        let uid = event.uid
        let title = event.title
        let when = event.startsAt
        guard when > Date() else { return }
        Task {
            guard await authorize() else { return }
            let content = UNMutableNotificationContent()
            content.title = title
            content.body = "On the calendar."
            content.sound = .default
            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(when.timeIntervalSinceNow, 60), repeats: false)
            let request = UNNotificationRequest(identifier: "event-\(uid.uuidString)", content: content, trigger: trigger)
            try? await UNUserNotificationCenter.current().add(request)
        }
    }

    static func schedule(errand: Errand) {
        guard let due = errand.dueOn else { return }
        let uid = errand.uid
        let title = errand.title
        let assignee = errand.assignee
        Task {
            guard await authorize() else { return }
            let content = UNMutableNotificationContent()
            content.title = title
            content.body = assignee.isEmpty ? "A task is due." : "Assigned to \(assignee)."
            content.sound = .default
            var parts = Calendar.current.dateComponents([.year, .month, .day], from: due)
            parts.hour = 9
            let trigger = UNCalendarNotificationTrigger(dateMatching: parts, repeats: false)
            let request = UNNotificationRequest(identifier: "task-\(uid.uuidString)", content: content, trigger: trigger)
            try? await UNUserNotificationCenter.current().add(request)
        }
    }

    static func posted(note: CircleNote) {
        let body = note.body
        Task {
            guard await authorize() else { return }
            let content = UNMutableNotificationContent()
            content.title = "New update"
            content.body = body
            content.sound = .default
            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
            let request = UNNotificationRequest(identifier: "note-\(UUID().uuidString)", content: content, trigger: trigger)
            try? await UNUserNotificationCenter.current().add(request)
        }
    }
}
