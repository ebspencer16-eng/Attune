// A mouse drag, as real CGEvents.
//
// AppleScript's System Events can click but cannot drag: it has no mouse-down,
// mouse-move or mouse-up verbs, so a swipe cannot be expressed in it at all.
// This is the smallest thing that can, and it needs no dependency beyond the
// Swift that ships with Xcode.
//
//   swift drag.swift x1 y1 x2 y2 [steps]
import CoreGraphics
import Foundation

let a = CommandLine.arguments
guard a.count >= 5,
      let x1 = Double(a[1]), let y1 = Double(a[2]),
      let x2 = Double(a[3]), let y2 = Double(a[4]) else {
    FileHandle.standardError.write("usage: drag.swift x1 y1 x2 y2 [steps]\n".data(using: .utf8)!)
    exit(1)
}
let steps = a.count > 5 ? (Int(a[5]) ?? 24) : 24

func post(_ type: CGEventType, _ p: CGPoint) {
    CGEvent(mouseEventSource: nil, mouseType: type, mouseCursorPosition: p, mouseButton: .left)?
        .post(tap: .cghidEventTap)
}

post(.mouseMoved, CGPoint(x: x1, y: y1))
usleep(60_000)
post(.leftMouseDown, CGPoint(x: x1, y: y1))
// steps == 0 is a tap: down then up, with no movement at all. A single
// zero-distance drag event in between is enough for React Native's touch
// handling to treat the gesture as a drag that went nowhere, and a Pressable
// then never fires. That cost an hour of believing the nav pills were dead.
// A touch has to move before a scroll view treats it as a drag rather than a
// tap, and it has to move in more than one step or the gesture recogniser sees
// a teleport and ignores it.
for i in stride(from: 1, through: steps, by: 1) {
    let t = Double(i) / Double(steps)
    post(.leftMouseDragged, CGPoint(x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t))
    usleep(8_000)
}
usleep(40_000)
post(.leftMouseUp, CGPoint(x: x2, y: y2))
