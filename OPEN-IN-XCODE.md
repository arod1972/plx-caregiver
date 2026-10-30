# Open this in Xcode

The iPhone app is native SwiftUI. Do not use npm, Expo, or CocoaPods.

1. Open `PrimaLuxCare.xcodeproj`.
2. If Xcode asks for a team, select your Personal Team once. The simulator usually does not need it. A physical iPhone does.
3. Select an iPhone simulator and press Run.

The first launch creates this phone’s key, a family circle, two morning doses, a clinic visit, a task, and a note. Profile holds the invite, permissions, Apple Health, and the on-device log. Medications can scan a label. Siri phrases are Mark taken, Today’s care, and Add a task.

Apple Health needs the HealthKit capability, which is already in the entitlements file. If signing fails, pick the team under Signing & Capabilities and leave HealthKit on.
