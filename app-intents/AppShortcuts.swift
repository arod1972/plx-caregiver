import AppIntents

struct AppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: MarkDoseTakenIntent(),
      phrases: [
        "Mark the medication taken in \(.applicationName)",
        "Mark \(\.$medication) taken in \(.applicationName)",
      ],
      shortTitle: "Mark taken",
      systemImageName: "checkmark.circle"
    )
    AppShortcut(
      intent: NextMedicationIntent(),
      phrases: [
        "What is the next medication in \(.applicationName)",
        "Check the next medication in \(.applicationName)",
      ],
      shortTitle: "Next medication",
      systemImageName: "clock"
    )
    AppShortcut(
      intent: CareStatusIntent(),
      phrases: [
        "What is the care status in \(.applicationName)",
      ],
      shortTitle: "Care status",
      systemImageName: "list.bullet"
    )
  }
}
