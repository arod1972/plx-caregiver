import ExpoModulesCore
import UIKit
import Vision

public class LabelOcrModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LabelOcr")

    AsyncFunction("recognize") { (uri: String) -> String in
      try readLabel(uri)
    }
  }
}

private func readLabel(_ uri: String) throws -> String {
  guard let image = loadImage(uri), let cgImage = image.cgImage else {
    throw LabelUnreadableException()
  }
  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.usesLanguageCorrection = true
  request.recognitionLanguages = ["en-US"]
  let handler = VNImageRequestHandler(cgImage: cgImage, orientation: cgOrientation(image.imageOrientation), options: [:])
  try handler.perform([request])
  let lines = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }
  return lines.joined(separator: "\n")
}

private func loadImage(_ uri: String) -> UIImage? {
  if let url = URL(string: uri), url.isFileURL {
    return UIImage(contentsOfFile: url.path)
  }
  let path = uri.hasPrefix("file://") ? String(uri.dropFirst("file://".count)) : uri
  return UIImage(contentsOfFile: path)
}

private func cgOrientation(_ orientation: UIImage.Orientation) -> CGImagePropertyOrientation {
  switch orientation {
  case .up: return .up
  case .down: return .down
  case .left: return .left
  case .right: return .right
  case .upMirrored: return .upMirrored
  case .downMirrored: return .downMirrored
  case .leftMirrored: return .leftMirrored
  case .rightMirrored: return .rightMirrored
  @unknown default: return .up
  }
}

internal final class LabelUnreadableException: Exception {
  override var reason: String {
    "The photo could not be read."
  }
}
