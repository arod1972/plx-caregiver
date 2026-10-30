import SwiftUI
import SwiftData
import VisionKit

struct ScanView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.colorScheme) private var scheme
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \Dose.timeMinutes) private var doses: [Dose]
    @State private var showCamera = false
    @State private var reading = ""
    @State private var matched: Dose?
    @State private var message = "The photo is read on this iPhone and is not saved."

    var body: some View {
        let palette = Palette.current(scheme)
        CareScreen {
            Text(message)
                .font(.subheadline)
                .foregroundStyle(palette.muted)
            if DataScannerViewController.isSupported && DataScannerViewController.isAvailable {
                MetalButton(title: "Scan a label") { showCamera = true }
            } else {
                Text("This simulator has no camera. Type the words on the label.")
                    .font(.subheadline)
                    .foregroundStyle(palette.muted)
            }
            CareField(label: "Words on the label", text: $reading, prompt: "Lisinopril 10 mg")
            MetalButton(title: "Match", filled: false) { match() }
            if let matched {
                MetalCard(padding: 18) {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(matched.name).font(.headline)
                        Text(matched.dosage.isEmpty ? "Matched." : matched.dosage)
                            .foregroundStyle(palette.muted)
                        MetalButton(title: CareClock.takenToday(matched) ? "Mark not taken" : "Mark taken") {
                            CareClock.toggleTaken(matched)
                            AuditLog.record(context, action: "dose.scan", resource: matched.uid.uuidString)
                            try? context.save()
                            message = CareClock.takenToday(matched) ? "Marked taken." : "Marked not taken."
                        }
                    }
                }
            }
        }
        .navigationTitle("Scan a label")
        .navigationBarTitleDisplayMode(.inline)
        .background(palette.canvas.ignoresSafeArea())
        .sheet(isPresented: $showCamera) {
            LabelScanner { text in
                reading = text
                showCamera = false
                match()
            }
        }
    }

    private func match() {
        let hay = reading.lowercased()
        guard !hay.trimmingCharacters(in: .whitespaces).isEmpty else {
            matched = nil
            message = "Nothing to match yet."
            return
        }
        var best: (Dose, Double)?
        for dose in doses {
            let name = dose.name.lowercased()
            guard !name.isEmpty else { continue }
            if hay.contains(name) {
                matched = dose
                message = "Matched \(dose.name)."
                return
            }
            let tokens = name.split(separator: " ")
            let hits = tokens.filter { hay.contains($0) }.count
            let score = Double(hits) / Double(max(tokens.count, 1))
            if best == nil || score > best!.1 { best = (dose, score) }
        }
        if let best, best.1 >= 0.8 {
            matched = best.0
            message = "Matched \(best.0.name)."
        } else {
            matched = nil
            message = "No saved medication matches that label."
        }
    }
}

struct LabelScanner: UIViewControllerRepresentable {
    var onText: (String) -> Void

    func makeUIViewController(context: Context) -> DataScannerViewController {
        let scanner = DataScannerViewController(
            recognizedDataTypes: [.text()],
            qualityLevel: .accurate,
            recognizesMultipleItems: true,
            isHighFrameRateTrackingEnabled: false,
            isHighlightingEnabled: true
        )
        scanner.delegate = context.coordinator
        try? scanner.startScanning()
        return scanner
    }

    func updateUIViewController(_ uiViewController: DataScannerViewController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(onText: onText) }

    final class Coordinator: NSObject, DataScannerViewControllerDelegate {
        var onText: (String) -> Void
        init(onText: @escaping (String) -> Void) { self.onText = onText }

        func dataScanner(_ dataScanner: DataScannerViewController, didTapOn item: RecognizedItem) {
            if case .text(let text) = item {
                onText(text.transcript)
            }
        }
    }
}
