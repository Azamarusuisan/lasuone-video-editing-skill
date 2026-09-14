import AppKit
import CoreFoundation
import Vision

func imageFrames(from records: [[String: Any]]) throws -> [[String: Any]] {
    try records.enumerated().compactMap { index, frame in
        let file = frame["file"], time = frame["time_s"]
        if frame["status"] as? String == "NO_FRAME_AT_SOURCE_END" {
            guard file is NSNull, time is NSNull else {
                throw NSError(domain: "AnalyzeFrames", code: 2, userInfo: [NSLocalizedDescriptionKey: "capture record \(index): malformed NO_FRAME_AT_SOURCE_END sentinel"])
            }
            return nil
        }
        guard let filename = file as? String, !filename.isEmpty,
              let number = time as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID(), number.doubleValue.isFinite, number.doubleValue >= 0 else {
            throw NSError(domain: "AnalyzeFrames", code: 1, userInfo: [NSLocalizedDescriptionKey: "capture record \(index): expected non-empty file and finite non-negative time_s, or the tagged source-end sentinel"])
        }
        return frame
    }
}

if CommandLine.arguments.contains("--check") {
    let valid: [[String: Any]] = [["file": "frame.jpg", "time_s": 1.25], ["file": NSNull(), "time_s": NSNull(), "status": "NO_FRAME_AT_SOURCE_END"]]
    let validImages = try imageFrames(from: valid)
    precondition(validImages.count == 1)
    for invalid in [["file": NSNull(), "time_s": NSNull()], ["file": "frame.jpg", "time_s": NSNull(), "status": "NO_FRAME_AT_SOURCE_END"], ["file": "frame.jpg", "time_s": true], ["file": "frame.jpg", "time_s": -1]] as [[String: Any]] {
        do { _ = try imageFrames(from: [invalid]); preconditionFailure("invalid capture record accepted") }
        catch { precondition(error.localizedDescription.contains("capture record 0")) }
    }
    print("capture image/sentinel validation checks passed")
    exit(0)
}

let dir = URL(fileURLWithPath: CommandLine.arguments[1])
let capture = try JSONSerialization.jsonObject(with: Data(contentsOf: dir.appendingPathComponent("capture.json"))) as! [String: Any]
let records = capture["frames"] as! [[String: Any]]
let frames = try imageFrames(from: records)
var results = [[String: Any]]()
for (index, frame) in frames.enumerated() {
    let filename = frame["file"] as! String
    let url = dir.appendingPathComponent(filename)
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["ja-JP", "en-US"]
    request.usesLanguageCorrection = false
    try VNImageRequestHandler(url: url).perform([request])
    let text = (request.results ?? []).compactMap { observation -> [String: Any]? in
        guard let candidate = observation.topCandidates(1).first else { return nil }
        let b = observation.boundingBox
        return ["text": candidate.string, "ocr_confidence": candidate.confidence, "bbox_xywh_normalized_top_left": [b.minX, 1-b.maxY, b.width, b.height]]
    }
    results.append(["file": filename, "time_s": frame["time_s"]!, "text": text])
    if index % 6 == 0 {
        let group = Array(frames[index..<min(index+6, frames.count)])
        let sheet = NSImage(size: NSSize(width: 1920, height: 780))
        sheet.lockFocus()
        NSColor.black.setFill(); NSRect(x: 0,y: 0,width: 1920,height: 780).fill()
        for (j, f) in group.enumerated() {
            let x = CGFloat(j%3)*640, y = CGFloat(1-j/3)*390
            let img = NSImage(contentsOf: dir.appendingPathComponent(f["file"] as! String))!
            let scale = min(640/img.size.width, 360/img.size.height)
            let w = img.size.width*scale, h = img.size.height*scale
            img.draw(in: NSRect(x:x+(640-w)/2,y:y+(360-h)/2,width:w,height:h))
            let t = f["time_s"] as! Double
            let label = String(format:"%02d:%06.3f",Int(t)/60,t.truncatingRemainder(dividingBy:60))
            label.draw(at:NSPoint(x:x+10,y:y+363),withAttributes:[.font:NSFont.monospacedSystemFont(ofSize:18,weight:.regular),.foregroundColor:NSColor.white])
        }
        sheet.unlockFocus()
        let bitmap = NSBitmapImageRep(data:sheet.tiffRepresentation!)!
        try bitmap.representation(using:.jpeg,properties:[.compressionFactor:0.9])!.write(to:dir.appendingPathComponent(String(format:"sheet_%02d.jpg",index/6+1)))
    }
}
try JSONSerialization.data(withJSONObject:results,options:[.prettyPrinted,.sortedKeys]).write(to:dir.appendingPathComponent("ocr.json"))
print("OCR and sheets: \(frames.count) image frames from \(records.count) capture records in \(dir.lastPathComponent)")
