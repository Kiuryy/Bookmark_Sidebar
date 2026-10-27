// Records a single window (with transparent rounded corners) into a .mov with alpha channel.
//
//   record-window --pid=<pid> --output=<file.mov> [--fps=30] [--scale=2] [--codec=hevc] [--quality=0.9] [--shadow]
//
//   --pid      process id owning the window (the largest on-screen window of this process is recorded)
//   --output   target file
//   --fps      maximum frame rate (default 30), frames are only written when the window content changes
//   --scale    pixels per point of the video (default: the one of the display, 2 on Retina = sharp, 1 = half the size)
//   --codec    hevc (default, HEVC with alpha, small files) or prores (ProRes 4444 with alpha, lossless-ish, huge files)
//   --quality  HEVC quality from 0 to 1 (default 0.9), higher = sharper text + larger files
//   --shadow   include the window shadow (default: without shadow, only the window with transparent corners)
//
// Stops on SIGINT/SIGTERM (sent by launch-browser.mjs when the browser is closed). Requires the "Screen Recording" permission
// for the app running this binary (terminal/IDE).

import AVFoundation
import CoreMedia
import Foundation
import ScreenCaptureKit
import VideoToolbox

func argument(_ name: String) -> String? {
    CommandLine.arguments.first { $0.hasPrefix("--\(name)=") }.map { String($0.dropFirst(name.count + 3)) }
}

func fail(_ message: String) -> Never {
    FileHandle.standardError.write("record-window: \(message)\n".data(using: .utf8)!)
    exit(1)
}

guard let pidValue = argument("pid"), let pid = pid_t(pidValue), let output = argument("output") else {
    fail("usage: record-window --pid=<pid> --output=<file.mov> [--fps=30] [--scale=2] [--codec=hevc|prores] [--quality=0.9] [--shadow]")
}
let fps = Int32(argument("fps") ?? "30") ?? 30
let outputScale = argument("scale").flatMap(Double.init) // nil = the scale of the display
let quality = Double(argument("quality") ?? "0.9") ?? 0.9
let codec: AVVideoCodecType
switch argument("codec") ?? "hevc" {
case "hevc": codec = .hevcWithAlpha
case "prores": codec = .proRes4444
default: fail("unknown --codec, use hevc or prores")
}
let withShadow = CommandLine.arguments.contains("--shadow")

// a command line tool has no connection to the window server yet, ScreenCaptureKit asserts without it (CGS_REQUIRE_INIT)
_ = CGMainDisplayID()

final class Recorder: NSObject, SCStreamOutput, SCStreamDelegate {
    private let writer: AVAssetWriter
    private let input: AVAssetWriterInput
    private let queue = DispatchQueue(label: "record-window.frames")
    private var stream: SCStream?
    private var started = false
    private var finished = false

    init(output: URL, width: Int, height: Int) throws {
        try? FileManager.default.removeItem(at: output)
        writer = try AVAssetWriter(outputURL: output, fileType: .mov)
        var settings: [String: Any] = [
            AVVideoCodecKey: codec,
            AVVideoWidthKey: width,
            AVVideoHeightKey: height
        ]
        if codec == .hevcWithAlpha { // the default bitrate is tuned for camera footage, text and UI edges get blurry with it
            settings[AVVideoCompressionPropertiesKey] = [
                AVVideoQualityKey: quality,
                kVTCompressionPropertyKey_TargetQualityForAlpha as String: quality
            ]
        }
        input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
        input.expectsMediaDataInRealTime = true
        writer.add(input)
        super.init()
    }

    func start(filter: SCContentFilter, configuration: SCStreamConfiguration) async throws {
        guard writer.startWriting() else {
            throw writer.error ?? NSError(domain: "record-window", code: 1)
        }
        let stream = SCStream(filter: filter, configuration: configuration, delegate: self)
        try stream.addStreamOutput(self, type: .screen, sampleHandlerQueue: queue)
        try await stream.startCapture()
        self.stream = stream
    }

    func update(filter: SCContentFilter) async {
        try? await stream?.updateContentFilter(filter)
    }

    func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of type: SCStreamOutputType) {
        guard type == .screen, !finished, sampleBuffer.isValid, isCompleteFrame(sampleBuffer) else {
            return
        }
        if !started {
            writer.startSession(atSourceTime: sampleBuffer.presentationTimeStamp)
            started = true
        }
        if input.isReadyForMoreMediaData {
            input.append(sampleBuffer)
        }
    }

    func stream(_ stream: SCStream, didStopWithError error: Error) { // e.g. the window was closed
        stop()
    }

    /// Finishes the file, the last frame is kept until now (frames are only delivered when the content changes)
    func stop() {
        queue.async {
            guard !self.finished else {
                return
            }
            self.finished = true
            Task {
                try? await self.stream?.stopCapture()
                guard self.started else {
                    self.writer.cancelWriting()
                    fail("no frame was recorded")
                }
                self.input.markAsFinished()
                self.writer.endSession(atSourceTime: CMClockGetTime(CMClockGetHostTimeClock()))
                await self.writer.finishWriting()
                if self.writer.status == .completed {
                    print("Saved \(self.writer.outputURL.path)")
                    exit(0)
                }
                fail("could not write the file: \(self.writer.error?.localizedDescription ?? "unknown error")")
            }
        }
    }

    /// Frames without changes are delivered as "idle" frames without image data
    private func isCompleteFrame(_ sampleBuffer: CMSampleBuffer) -> Bool {
        guard let attachments = CMSampleBufferGetSampleAttachmentsArray(sampleBuffer, createIfNecessary: false) as? [[SCStreamFrameInfo: Any]],
              let rawStatus = attachments.first?[.status] as? Int,
              let status = SCFrameStatus(rawValue: rawStatus) else {
            return false
        }
        return status == .complete
    }
}

/// Waits until the process shows a regular window, returns the largest one (and the content it was found in)
func findWindow() async -> (SCWindow, SCShareableContent) {
    for _ in 0..<50 {
        do {
            let content = try await SCShareableContent.excludingDesktopWindows(true, onScreenWindowsOnly: true)
            let windows = content.windows.filter {
                $0.owningApplication?.processID == pid && $0.windowLayer == 0 && $0.frame.width > 200 && $0.frame.height > 200
            }
            if let window = windows.max(by: { $0.frame.width * $0.frame.height < $1.frame.width * $1.frame.height }) {
                return (window, content)
            }
        } catch {
            fail("no access to the screen, allow \"Screen Recording\" for your terminal/IDE in System Settings → Privacy & Security (\(error.localizedDescription))")
        }
        try? await Task.sleep(nanoseconds: 200_000_000)
    }
    fail("no window of process \(pid) found")
}

/// Captures the display without all windows that don't belong to the browser. Excluding the other applications isn't
/// enough, the wallpaper and the black "Backstop" window behind it have no application.
/// Returns the ids of the excluded windows too, to detect windows that were opened later
func otherWindowsFilter(display: SCDisplay) async -> (SCContentFilter, Set<CGWindowID>)? {
    guard let content = try? await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true) else {
        return nil
    }
    let others = content.windows.filter { $0.owningApplication?.processID != pid }
    return (SCContentFilter(display: display, excludingWindows: others), Set(others.map { $0.windowID }))
}

let (window, content) = await findWindow()
guard let display = content.displays.first(where: { $0.frame.intersects(window.frame) }) ?? content.displays.first else {
    fail("no display found")
}

// A filter that names the browser (desktopIndependentWindow, including: [window], including: [app]) makes macOS 26
// replace its traffic lights with the purple "window is being shared" badge. So the display is captured instead,
// without the windows of all other processes (they stay transparent), and cropped to the window. Menus and popups of the
// browser are recorded too, other windows of the browser would be as well when they overlap. The window must not be moved.
guard var (filter, excludedWindows) = await otherWindowsFilter(display: display) else {
    fail("could not list the windows")
}
let scale = CGFloat(outputScale ?? Double(filter.pointPixelScale))
let margin: CGFloat = withShadow ? 60 : 0 // room for the shadow around the window
let sourceRect = window.frame.insetBy(dx: -margin, dy: -margin)
    .offsetBy(dx: -display.frame.minX, dy: -display.frame.minY) // both in points, top-left origin

// the capture is scaled to this size by ScreenCaptureKit, even dimensions keep the encoders happy
let configuration = SCStreamConfiguration()
configuration.sourceRect = sourceRect
configuration.width = Int(sourceRect.width * scale) / 2 * 2
configuration.height = Int(sourceRect.height * scale) / 2 * 2
configuration.pixelFormat = kCVPixelFormatType_32BGRA
configuration.shouldBeOpaque = false
configuration.ignoreShadowsDisplay = !withShadow
configuration.backgroundColor = .clear
configuration.showsCursor = true
configuration.minimumFrameInterval = CMTime(value: 1, timescale: fps)
configuration.queueDepth = 8

let recorder: Recorder
do {
    recorder = try Recorder(output: URL(fileURLWithPath: output), width: configuration.width, height: configuration.height)
    try await recorder.start(filter: filter, configuration: configuration)
} catch {
    fail("could not start the recording: \(error.localizedDescription)")
}
print("Recording \(configuration.width)x\(configuration.height) to \(output)")

var signalSources: [DispatchSourceSignal] = [] // have to be kept alive
for sig in [SIGINT, SIGTERM] {
    signal(sig, SIG_IGN)
    let source = DispatchSource.makeSignalSource(signal: sig, queue: .main)
    source.setEventHandler { recorder.stop() }
    source.resume()
    signalSources.append(source)
}

// windows of other processes opened after the start (notifications, dialogs, ...) are excluded as well.
// The top-level code is async (it already drives the main queue), so this loop runs until stop() exits the process
// (dispatchMain() would trap here)
while true {
    try? await Task.sleep(nanoseconds: 500_000_000)
    if let (updated, windows) = await otherWindowsFilter(display: display), !windows.isSubset(of: excludedWindows) {
        excludedWindows = windows
        await recorder.update(filter: updated)
    }
}
