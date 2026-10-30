import AVFoundation
import Foundation
import SwiftUI
import UIKit
import Vision

struct LabelReading: Equatable {
    var drugName = ""
    var dosage = ""
    var instructions = ""
    var rxNumber = ""
    var quantity = ""
    var refills = ""
    var pharmacy = ""
    var patient = ""
    var barcode = ""

    var canAdd: Bool { drugName.count >= 3 }

    var suggestedMinutes: Int {
        let text = instructions.lowercased()
        if let clock = LabelParser.clock(in: text) { return clock }
        if text.contains("bedtime") || text.contains("night") || text.contains("evening") { return 21 * 60 }
        if text.contains("noon") || text.contains("afternoon") { return 12 * 60 }
        return 8 * 60
    }
}

enum LabelParser {
    static func parse(_ lines: [String]) -> LabelReading {
        let clean = lines.map { collapse($0) }.filter { $0.count > 1 && !isNoise($0) }
        var reading = LabelReading()
        let sig = clean.filter { isInstruction($0) }
        reading.instructions = pretty(joinSig(sig))
        let chosen = bestDrug(in: clean)
        reading.drugName = chosen.name
        reading.dosage = chosen.dosage
        let blob = clean.joined(separator: "\n")
        reading.rxNumber = match(#"(?i)\b(?:rx|prescription)\s*(?:number|no\.?|#)?\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{4,})"#, in: blob)
        reading.quantity = match(#"(?i)\b(?:qty|quantity)\s*[:#]?\s*(\d+)"#, in: blob)
        reading.refills = firstFilled(
            match(#"(?i)\brefills?\s*[:#]?\s*(\d+|none)"#, in: blob),
            match(#"(?i)\b(\d+)\s*refills?\b"#, in: blob)
        )
        if let drugIndex = clean.firstIndex(where: { collapse($0).localizedCaseInsensitiveContains(reading.drugName) && !reading.drugName.isEmpty }) {
            reading.patient = clean.prefix(drugIndex).first(where: isPersonName).map(pretty) ?? ""
        }
        reading.pharmacy = dedupe(pharmacy(in: clean, drug: reading.drugName))
        return reading
    }

    static func keep(_ old: LabelReading, _ new: LabelReading) -> LabelReading {
        var kept = old
        kept.drugName = keepName(old.drugName, new.drugName)
        if kept.dosage.isEmpty, nameQuality(kept.drugName) > 0 { kept.dosage = new.dosage }
        kept.instructions = keepSig(old.instructions, new.instructions)
        if kept.rxNumber.isEmpty { kept.rxNumber = new.rxNumber }
        if kept.barcode.isEmpty { kept.barcode = new.barcode }
        if kept.rxNumber.isEmpty { kept.rxNumber = rx(fromBarcode: new.barcode) }
        if kept.quantity.isEmpty { kept.quantity = new.quantity }
        if kept.refills.isEmpty { kept.refills = new.refills }
        if kept.patient.isEmpty { kept.patient = new.patient }
        kept.pharmacy = keepPharmacy(old.pharmacy, new.pharmacy)
        return kept
    }

    static func hint(for reading: LabelReading) -> String {
        if reading.drugName.isEmpty {
            return "Hold the bottle still. The name is kept only after it stays the same."
        }
        if reading.instructions.isEmpty {
            return "Keep turning until the directions come around, such as TAKE 1 TABLET BY MOUTH DAILY."
        }
        if reading.rxNumber.isEmpty {
            return "Name and directions are in. The Rx number, quantity, and pharmacy are often near the bottom."
        }
        return "The label is ready. Check it, then add it."
    }

    static func clock(in text: String) -> Int? {
        guard let regex = try? NSRegularExpression(pattern: #"\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b"#, options: [.caseInsensitive]) else { return nil }
        let range = NSRange(text.startIndex..., in: text)
        guard let found = regex.firstMatch(in: text, range: range),
              let hourRange = Range(found.range(at: 1), in: text),
              let hour = Int(text[hourRange]) else { return nil }
        let minute: Int
        if let minuteRange = Range(found.range(at: 2), in: text) {
            minute = Int(text[minuteRange]) ?? 0
        } else {
            minute = 0
        }
        let marker = Range(found.range(at: 3), in: text).map { text[$0].lowercased() } ?? ""
        var normalized = hour % 12
        if marker.hasPrefix("p") { normalized += 12 }
        if hour == 12 && marker.hasPrefix("a") { normalized = 0 }
        if hour == 12 && marker.hasPrefix("p") { normalized = 12 }
        return normalized * 60 + min(minute, 59)
    }

    static func isSettledName(_ name: String) -> Bool {
        nameQuality(name) >= 5
    }

    static func rx(fromBarcode payload: String) -> String {
        let trimmed = payload.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.lowercased().hasPrefix("http") { return "" }
        let compact = trimmed.filter { $0.isNumber || $0 == "-" }
        let digits = compact.filter(\.isNumber)
        guard (6...16).contains(digits.count) else { return "" }
        return compact
    }

    private static func bestDrug(in lines: [String]) -> (name: String, dosage: String) {
        var bestName = ""
        var bestScore = 0
        var dosage = ""
        for (index, line) in lines.enumerated() {
            guard let found = strength(in: line) else { continue }
            if dosage.isEmpty { dosage = found.pretty }
            let onLine = nameQuality(splitDrug(line).name)
            if onLine > bestScore {
                bestScore = onLine
                bestName = splitDrug(line).name
            }
            if onLine >= 5 || index == 0 { continue }
            let previous = lines[index - 1]
            guard !isInstruction(previous), !isPersonName(previous) else { continue }
            let nearby = nameQuality(pretty(previous))
            if nearby > bestScore {
                bestScore = nearby
                bestName = pretty(previous)
            }
        }
        return (bestName, dosage)
    }

    private static func nameQuality(_ name: String) -> Int {
        let trimmed = collapse(name)
        let letters = trimmed.filter(\.isLetter)
        guard letters.count >= 4 else { return 0 }
        let junk = trimmed.filter { !$0.isLetter && !$0.isWhitespace && $0 != "-" && $0 != "'" }
        if junk.count > 0 { return 0 }
        let lower = trimmed.lowercased()
        let blocked = ["tablet", "tablets", "capsule", "capsules", "mouth", "daily", "refill", "refills", "walgreens", "pharmacy", "discard", "before"]
        if blocked.contains(where: { lower == $0 || lower.contains($0) }) { return 0 }
        return letters.count
    }

    private static func keepName(_ old: String, _ new: String) -> String {
        let oldScore = nameQuality(old)
        let newScore = nameQuality(new)
        if newScore == 0 { return old }
        if oldScore == 0 { return new }
        let oldKey = old.lowercased()
        let newKey = new.lowercased()
        if newKey.contains(oldKey) && newScore >= oldScore { return new }
        return old
    }

    private static func keepSig(_ old: String, _ new: String) -> String {
        if old.isEmpty { return new }
        if new.isEmpty { return old }
        if new.localizedCaseInsensitiveContains(old) && new.count > old.count { return new }
        return old
    }

    private static func keepPharmacy(_ old: String, _ new: String) -> String {
        let next = dedupe(new)
        if old.isEmpty { return next }
        if next.localizedCaseInsensitiveContains(old), next.count > old.count + 4 { return next }
        return old
    }

    private static func dedupe(_ text: String) -> String {
        var seen = Set<String>()
        var kept: [String] = []
        for word in text.split(separator: " ") {
            let token = String(word)
            let key = token.lowercased()
            if key == "•" || key == ".." || key == "." || key == "·" { continue }
            if seen.contains(key) { continue }
            seen.insert(key)
            kept.append(token)
        }
        return kept.joined(separator: " ")
    }

    private static func joinSig(_ lines: [String]) -> String {
        var kept: [String] = []
        for line in lines {
            if kept.contains(where: { $0.localizedCaseInsensitiveContains(line) }) { continue }
            if let index = kept.firstIndex(where: { line.localizedCaseInsensitiveContains($0) }) {
                kept[index] = line
                continue
            }
            kept.append(line)
        }
        return kept.joined(separator: " ")
    }

    private static func firstFilled(_ values: String...) -> String {
        values.first { !$0.isEmpty } ?? ""
    }

    private static func splitDrug(_ line: String) -> (name: String, dosage: String) {
        guard let found = strength(in: line) else { return (pretty(line), "") }
        var name = line.replacingOccurrences(of: found.raw, with: " ", options: .caseInsensitive)
        for word in ["tablets", "tablet", "capsules", "capsule", "caps", "cap", "tabs", "tab"] {
            name = name.replacingOccurrences(of: "\\b\(word)\\b", with: " ", options: [.regularExpression, .caseInsensitive])
        }
        return (pretty(name), found.pretty)
    }

    private static func strength(in line: String) -> (raw: String, pretty: String)? {
        guard let regex = try? NSRegularExpression(pattern: #"\b(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|units|iu|%)\b"#, options: [.caseInsensitive]) else { return nil }
        let range = NSRange(line.startIndex..., in: line)
        guard let found = regex.firstMatch(in: line, range: range),
              let whole = Range(found.range, in: line),
              let amount = Range(found.range(at: 1), in: line),
              let unit = Range(found.range(at: 2), in: line) else { return nil }
        return (String(line[whole]), "\(line[amount]) \(line[unit].lowercased())")
    }

    private static func pharmacy(in lines: [String], drug: String) -> String {
        let kept = lines.filter { line in
            let lower = line.lowercased()
            if !drug.isEmpty && lower.contains(drug.lowercased()) { return false }
            if isInstruction(line) { return false }
            if lower.contains("pharmacy") || lower.contains("pharm") { return true }
            let chains = ["cvs", "walgreens", "rite aid", "walmart", "costco", "kroger", "publix", "safeway", "giant", "acme", "shoprite"]
            if chains.contains(where: { lower.contains($0) }) { return true }
            return !match(#"\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}"#, in: line).isEmpty
        }
        return pretty(kept.suffix(3).joined(separator: " "))
    }

    private static func isInstruction(_ line: String) -> Bool {
        let lower = line.lowercased()
        if lower.range(of: #"^(take|instill|apply|inject|inhale|insert|place|dissolve|chew|give|use|swallow)\b"#, options: .regularExpression) != nil {
            return true
        }
        return lower.contains("by mouth") || lower.contains("as directed") || lower.contains("as needed") || lower.contains("every day")
    }

    private static func isPersonName(_ line: String) -> Bool {
        let words = line.split(separator: " ")
        guard (2...4).contains(words.count) else { return false }
        if line.rangeOfCharacter(from: .decimalDigits) != nil { return false }
        if strength(in: line) != nil || isInstruction(line) { return false }
        return true
    }

    private static func isNoise(_ line: String) -> Bool {
        let lower = line.lowercased()
        let phrases = ["federal law", "transfer of this", "discard after", "ndc", "drowsiness", "alcohol may", "controlled substance"]
        return phrases.contains { lower.contains($0) }
    }

    private static func match(_ pattern: String, in text: String) -> String {
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else { return "" }
        let range = NSRange(text.startIndex..., in: text)
        guard let found = regex.firstMatch(in: text, range: range) else { return "" }
        let index = found.numberOfRanges > 1 ? 1 : 0
        guard let slice = Range(found.range(at: index), in: text) else { return "" }
        return String(text[slice])
    }

    private static func collapse(_ text: String) -> String {
        text.replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func pretty(_ text: String) -> String {
        collapse(text).lowercased().capitalized
    }
}

final class LabelCapture: NSObject, ObservableObject {
    @Published var reading = LabelReading()
    @Published var hint = LabelParser.hint(for: LabelReading())
    @Published var cameraOn = false
    @Published var usingFront = false
    @Published var previewRotation: CGFloat = 180
    let session = AVCaptureSession()
    private let queue = DispatchQueue(label: "guardian.label.scan")
    private let videoOutput = AVCaptureVideoDataOutput()
    private var started = false
    private var lastPass = Date.distantPast
    private var lines: [String: SeenLine] = [:]
    private var locked = LabelReading()
    private let gate = NSLock()
    private var pausedFlag = false
    private var position: AVCaptureDevice.Position = .back
    private var settleUntil = Date()
    private var steadyName = ""
    private var steadyHits = 0
    private var seenBarcode = ""

    var paused: Bool {
        get {
            gate.lock()
            defer { gate.unlock() }
            return pausedFlag
        }
        set {
            gate.lock()
            pausedFlag = newValue
            gate.unlock()
        }
    }

    func start() {
        guard !started else { return }
        started = true
        queue.async { [weak self] in
            self?.configure()
        }
    }

    func flip() {
        queue.async { [weak self] in
            guard let self else { return }
            let next: AVCaptureDevice.Position = self.position == .back ? .front : .back
            guard AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: next) != nil else { return }
            self.position = next
            self.beginHold()
            self.installCamera(next)
            self.applyRotation()
            DispatchQueue.main.async {
                self.usingFront = next == .front
                self.reading = LabelReading()
                self.hint = LabelParser.hint(for: LabelReading())
            }
        }
    }

    func stop() {
        queue.async { [weak self] in
            guard let self, self.session.isRunning else { return }
            self.session.stopRunning()
        }
    }

    func restart() {
        queue.async { [weak self] in
            guard let self else { return }
            self.lines.removeAll()
            self.beginHold()
            self.applyRotation()
            DispatchQueue.main.async {
                self.reading = LabelReading()
                self.hint = LabelParser.hint(for: LabelReading())
            }
        }
    }

    private func beginHold() {
        settleUntil = Date().addingTimeInterval(1.2)
        steadyName = ""
        steadyHits = 0
        seenBarcode = ""
        lines.removeAll()
        locked = LabelReading()
    }

    private func currentAngle() -> CGFloat {
        position == .front ? 0 : 180
    }

    private func applyRotation() {
        let angle = currentAngle()
        if let connection = videoOutput.connection(with: .video), connection.isVideoRotationAngleSupported(angle) {
            connection.videoRotationAngle = angle
        }
        DispatchQueue.main.async { self.previewRotation = angle }
    }

    private func configure() {
        session.beginConfiguration()
        session.sessionPreset = .hd1920x1080
        installCamera(.back)
        videoOutput.alwaysDiscardsLateVideoFrames = true
        videoOutput.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarFullRange]
        videoOutput.setSampleBufferDelegate(self, queue: queue)
        guard session.canAddOutput(videoOutput) else {
            session.commitConfiguration()
            return
        }
        session.addOutput(videoOutput)
        session.commitConfiguration()
        applyRotation()
        session.startRunning()
        applyRotation()
        beginHold()
        DispatchQueue.main.async { self.cameraOn = true }
    }

    private func installCamera(_ position: AVCaptureDevice.Position) {
        let alreadyConfiguring = session.inputs.isEmpty && !session.isRunning
        if !alreadyConfiguring { session.beginConfiguration() }
        for input in session.inputs { session.removeInput(input) }
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: position),
              let input = try? AVCaptureDeviceInput(device: device),
              session.canAddInput(input) else {
            if !alreadyConfiguring { session.commitConfiguration() }
            return
        }
        session.addInput(input)
        try? device.lockForConfiguration()
        if device.isFocusModeSupported(.continuousAutoFocus) { device.focusMode = .continuousAutoFocus }
        if device.isSmoothAutoFocusSupported { device.isSmoothAutoFocusEnabled = true }
        if device.isAutoFocusRangeRestrictionSupported { device.autoFocusRangeRestriction = .near }
        if device.isExposureModeSupported(.continuousAutoExposure) { device.exposureMode = .continuousAutoExposure }
        device.unlockForConfiguration()
        if !alreadyConfiguring { session.commitConfiguration() }
    }

    private func absorb(text: String, confidence: Float, midY: CGFloat) {
        let cleaned = text.replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard cleaned.count >= 2, confidence >= 0.32 else { return }
        let key = cleaned.lowercased()
        if var existing = lines[key] {
            existing.seen += 1
            existing.confidence = max(existing.confidence, confidence)
            existing.midY = midY
            lines[key] = existing
            return
        }
        if let sibling = lines.first(where: { same($0.key, key) }) {
            var existing = sibling.value
            existing.seen += 1
            existing.confidence = max(existing.confidence, confidence)
            existing.midY = midY
            if cleaned.count > existing.text.count {
                lines.removeValue(forKey: sibling.key)
                existing.text = cleaned
                existing.key = key
                lines[key] = existing
            } else {
                lines[sibling.key] = existing
            }
            return
        }
        lines[key] = SeenLine(text: cleaned, confidence: confidence, seen: 1, midY: midY, key: key)
    }

    private func same(_ a: String, _ b: String) -> Bool {
        if a == b { return true }
        let short = a.count < b.count ? a : b
        let long = a.count < b.count ? b : a
        guard short.count >= 8 else { return false }
        return long.contains(short)
    }

    private func publish() {
        let stable = lines.values.filter { $0.seen >= 2 || $0.confidence >= 0.82 }
        let ordered = stable.sorted { $0.midY > $1.midY }.map(\.text)
        var parsed = LabelParser.parse(ordered)
        parsed.barcode = seenBarcode
        if parsed.rxNumber.isEmpty { parsed.rxNumber = LabelParser.rx(fromBarcode: seenBarcode) }
        locked = steady(parsed)
        let next = locked
        let nextHint = steadyHits > 0 && steadyHits < 3
            ? "Seeing \(steadyName). Hold still."
            : LabelParser.hint(for: next)
        DispatchQueue.main.async {
            guard !self.paused else { return }
            self.reading = next
            self.hint = nextHint
        }
    }

    private func steady(_ parsed: LabelReading) -> LabelReading {
        let name = parsed.drugName
        guard LabelParser.isSettledName(name) else { return locked }
        if name.lowercased() == steadyName.lowercased() {
            steadyHits += 1
        } else {
            steadyName = name
            steadyHits = 1
        }
        guard steadyHits >= 3 else { return locked }
        return LabelParser.keep(locked, parsed)
    }
}

private struct SeenLine {
    var text: String
    var confidence: Float
    var seen: Int
    var midY: CGFloat
    var key: String
}

extension LabelCapture: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        let now = Date()
        guard now.timeIntervalSince(lastPass) > 0.35 else { return }
        lastPass = now
        guard !paused, let buffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        if Date() < settleUntil {
            DispatchQueue.main.async {
                guard !self.paused else { return }
                self.reading = LabelReading()
                self.hint = "Hold the bottle still. The name is kept once it stops changing."
            }
            return
        }
        let textRequest = VNRecognizeTextRequest()
        textRequest.recognitionLevel = .accurate
        textRequest.usesLanguageCorrection = true
        textRequest.recognitionLanguages = ["en-US"]
        textRequest.minimumTextHeight = 0.008
        textRequest.customWords = [
            "lisinopril", "metformin", "atorvastatin", "amlodipine", "omeprazole", "losartan",
            "gabapentin", "levothyroxine", "metoprolol", "sertraline", "albuterol", "furosemide",
            "tablets", "capsules", "refills", "pharmacy", "Walgreens", "CVS"
        ]
        let codes = VNDetectBarcodesRequest()
        codes.symbologies = [.qr, .code128, .code39, .code93, .pdf417, .dataMatrix, .ean13, .ean8]
        let handler = VNImageRequestHandler(cvPixelBuffer: buffer, orientation: .up)
        try? handler.perform([textRequest, codes])
        let observations = textRequest.results ?? []
        for observation in observations {
            guard let candidate = observation.topCandidates(1).first else { continue }
            absorb(text: candidate.string, confidence: candidate.confidence, midY: observation.boundingBox.midY)
        }
        for code in codes.results ?? [] {
            guard let payload = code.payloadStringValue else { continue }
            let trimmed = payload.trimmingCharacters(in: .whitespacesAndNewlines)
            guard trimmed.count > 3 else { continue }
            if seenBarcode.isEmpty { seenBarcode = trimmed }
            let rx = LabelParser.rx(fromBarcode: trimmed)
            if locked.rxNumber.isEmpty, !rx.isEmpty { locked.rxNumber = rx }
        }
        publish()
    }
}

struct LabelPreview: UIViewRepresentable {
    let session: AVCaptureSession
    var front: Bool
    var rotation: CGFloat

    func makeUIView(context: Context) -> PreviewHost {
        let view = PreviewHost()
        view.previewLayer.session = session
        view.previewLayer.videoGravity = .resizeAspectFill
        view.front = front
        view.rotation = rotation
        return view
    }

    func updateUIView(_ uiView: PreviewHost, context: Context) {
        uiView.previewLayer.session = session
        uiView.front = front
        uiView.rotation = rotation
    }
}

final class PreviewHost: UIView {
    override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
    var previewLayer: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
    var front = false { didSet { applyConnection() } }
    var rotation: CGFloat = 90 { didSet { applyConnection() } }

    override func layoutSubviews() {
        super.layoutSubviews()
        applyConnection()
    }

    private func applyConnection() {
        guard let connection = previewLayer.connection else { return }
        if connection.isVideoRotationAngleSupported(rotation) {
            connection.videoRotationAngle = rotation
        }
        guard connection.isVideoMirroringSupported else { return }
        connection.automaticallyAdjustsVideoMirroring = false
        connection.isVideoMirrored = front
    }
}
