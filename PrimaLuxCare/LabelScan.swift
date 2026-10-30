import AVFoundation
import Foundation
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
        let instructionIndexes = clean.indices.filter { isInstruction(clean[$0]) }
        if let first = instructionIndexes.first {
            var last = first
            while instructionIndexes.contains(last + 1) { last += 1 }
            reading.instructions = pretty(clean[first...last].joined(separator: " "))
        }
        if let drugLine = drugLine(in: clean, before: instructionIndexes.first) {
            let parts = splitDrug(drugLine)
            reading.drugName = parts.name
            reading.dosage = parts.dosage
        }
        let blob = clean.joined(separator: "\n")
        reading.rxNumber = match(#"(?i)\b(?:rx|prescription)\s*(?:number|no\.?|#)?\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{4,})"#, in: blob)
        reading.quantity = match(#"(?i)\b(?:qty|quantity)\s*[:#]?\s*(\d+)"#, in: blob)
        reading.refills = match(#"(?i)\brefills?\s*[:#]?\s*(\d+|none)"#, in: blob)
        if let drugIndex = clean.firstIndex(where: { collapse($0).localizedCaseInsensitiveContains(reading.drugName) && !reading.drugName.isEmpty }) {
            reading.patient = clean.prefix(drugIndex).first(where: isPersonName).map(pretty) ?? ""
        }
        reading.pharmacy = pharmacy(in: clean, drug: reading.drugName)
        return reading
    }

    static func hint(for reading: LabelReading) -> String {
        if reading.drugName.isEmpty {
            return "Hold the bottle close and turn it slowly. A shaky hand is fine. The name is usually the large line."
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

    private static func drugLine(in lines: [String], before instruction: Int?) -> String? {
        let pool = lines.enumerated().filter { !isInstruction($0.element) && strength(in: $0.element) != nil }
        if let instruction, let nearest = pool.filter({ $0.offset < instruction }).max(by: { $0.offset < $1.offset }) {
            return nearest.element
        }
        return pool.first?.element
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
    let session = AVCaptureSession()
    private let queue = DispatchQueue(label: "guardian.label.scan")
    private var started = false
    private var lastPass = Date.distantPast
    private var lines: [String: SeenLine] = [:]
    private let gate = NSLock()
    private var pausedFlag = false

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

    func stop() {
        queue.async { [weak self] in
            guard let self, self.session.isRunning else { return }
            self.session.stopRunning()
        }
    }

    private func configure() {
        session.beginConfiguration()
        session.sessionPreset = .hd1920x1080
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let input = try? AVCaptureDeviceInput(device: device),
              session.canAddInput(input) else {
            session.commitConfiguration()
            return
        }
        session.addInput(input)
        try? device.lockForConfiguration()
        if device.isFocusModeSupported(.continuousAutoFocus) { device.focusMode = .continuousAutoFocus }
        if device.isSmoothAutoFocusSupported { device.isSmoothAutoFocusEnabled = true }
        if device.isAutoFocusRangeRestrictionSupported { device.autoFocusRangeRestriction = .near }
        if device.isExposureModeSupported(.continuousAutoExposure) { device.exposureMode = .continuousAutoExposure }
        device.unlockForConfiguration()
        let output = AVCaptureVideoDataOutput()
        output.alwaysDiscardsLateVideoFrames = true
        output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarFullRange]
        output.setSampleBufferDelegate(self, queue: queue)
        guard session.canAddOutput(output) else {
            session.commitConfiguration()
            return
        }
        session.addOutput(output)
        session.commitConfiguration()
        session.startRunning()
        DispatchQueue.main.async { self.cameraOn = true }
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
        let next = LabelParser.parse(ordered)
        let nextHint = LabelParser.hint(for: next)
        DispatchQueue.main.async {
            guard !self.paused else { return }
            self.reading = next
            self.hint = nextHint
        }
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
        codes.symbologies = [.qr]
        let handler = VNImageRequestHandler(cvPixelBuffer: buffer, orientation: .right)
        try? handler.perform([textRequest, codes])
        for observation in textRequest.results ?? [] {
            guard let candidate = observation.topCandidates(1).first else { continue }
            absorb(text: candidate.string, confidence: candidate.confidence, midY: observation.boundingBox.midY)
        }
        for code in codes.results ?? [] {
            guard let payload = code.payloadStringValue, payload.count > 3, !payload.hasPrefix("http") else { continue }
            for piece in payload.components(separatedBy: .newlines) where !piece.isEmpty {
                absorb(text: piece, confidence: 0.9, midY: code.boundingBox.midY)
            }
        }
        publish()
    }
}

struct LabelPreview: UIViewRepresentable {
    let session: AVCaptureSession

    func makeUIView(context: Context) -> PreviewHost {
        let view = PreviewHost()
        view.previewLayer.session = session
        view.previewLayer.videoGravity = .resizeAspectFill
        return view
    }

    func updateUIView(_ uiView: PreviewHost, context: Context) {
        uiView.previewLayer.session = session
    }
}

final class PreviewHost: UIView {
    override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
    var previewLayer: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }

    override func layoutSubviews() {
        super.layoutSubviews()
        guard let connection = previewLayer.connection, connection.isVideoRotationAngleSupported(90) else { return }
        connection.videoRotationAngle = 90
    }
}
