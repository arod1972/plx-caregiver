import AppIntents
internal import ExpoAppIntents

struct CareStatusIntent: AppIntent {
  static let title: LocalizedStringResource = "Care Status"
  static let openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    await AppIntentDispatcher.shared.dispatch(name: "careStatus")
    return .result(dialog: "Opening PrimaLux Care.")
  }
}
