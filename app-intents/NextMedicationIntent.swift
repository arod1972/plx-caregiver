import AppIntents
internal import ExpoAppIntents

struct NextMedicationIntent: AppIntent {
  static let title: LocalizedStringResource = "Next Medication"
  static let openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    await AppIntentDispatcher.shared.dispatch(name: "nextMedication")
    return .result(dialog: "Opening PrimaLux Care.")
  }
}
