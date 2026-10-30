import AppIntents
internal import ExpoAppIntents

struct MarkDoseTakenIntent: AppIntent {
  static let title: LocalizedStringResource = "Mark Dose Taken"
  static let openAppWhenRun: Bool = true

  @Parameter(title: "Medication")
  var medication: String?

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    var params: AppIntentParams = [:]
    if let medication, !medication.isEmpty {
      params["medication"] = .string(medication)
    }
    await AppIntentDispatcher.shared.dispatch(name: "markDoseTaken", params: params)
    return .result(dialog: "Opening PrimaLux Care.")
  }
}
