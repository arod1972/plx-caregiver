# iOS deploy

PrimaLux Care is an Expo app. These commands produce a runnable iOS build from a Mac with Xcode. They do not need the generated `ios/` folder to be committed. Native capabilities (Apple Health, the camera, and Siri) are declared in [app.json](./app.json) and `app-intents/`.

## What you need

- A Mac with the current Xcode
- Node.js 22
- An Apple Developer account, for a device or TestFlight build
- CocoaPods (`sudo gem install cocoapods`) if `pod install` is not already available

The app id is `com.primalux.caregiver`.

## Command batch

From the repository root on a Mac:

```bash
npm install
npx expo install
npx expo prebuild --platform ios
open ios/*.xcworkspace
npx expo run:ios
npx eas-cli build --platform ios --profile production
```

`npx expo install` with no package names checks that the Expo modules match the SDK. `npx eas build` is the same as `npx eas-cli build` when the EAS CLI is installed globally. The production profile is in [eas.json](./eas.json).

## Run on a simulator or a plugged-in iPhone

`npm install` also copies the on-device label reader used by the browser. The iPhone app reads labels with Apple Vision instead.

`npx expo run:ios` builds the native app and installs it. Add `--device` to pick a plugged-in iPhone:

```bash
npx expo run:ios --device
```

To open the project in Xcode after prebuild:

```bash
open ios/*.xcworkspace
```

In Xcode, select the PrimaLux Care target, set **Signing & Capabilities** to your team, and run.

## HealthKit, camera, and Siri

Prebuild writes these from `app.json`. You should not add a second copy by hand.

- **HealthKit.** The entitlement `com.apple.developer.healthkit` is on. Usage strings explain that steps, heart rate, and sleep stay on the device unless a daily summary is shared. In the Apple Developer portal, open the app id and turn HealthKit on before you sign a device build.
- **Camera and photos.** The camera is used only to read a medication label. The photo is not saved. The usage strings are `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription`.
- **Siri.** Phrases live in `app-intents/` and are compiled into the app target. `experiments.inlineModules.watchedDirectories` includes `app-intents`. A phrase will not appear in Shortcuts until this native build is installed. Sample phrases are on the Hands-off screen.

If HealthKit signing fails, the portal capability is the usual cause. Clean with `npx expo prebuild --platform ios --clean` after changing `app.json`.

## EAS Build

For a build you can install without a local Xcode archive:

```bash
npm install
npx eas-cli login
npx eas-cli build --platform ios --profile development
npx eas-cli build --platform ios --profile production
```

`development` is an internal build for a device. `production` is the store build. Profiles are in [eas.json](./eas.json). The first production build asks Expo to create or select the Apple credentials. HealthKit still has to be enabled on the app id.

## Checks before you archive

```bash
npm test
npx tsc --noEmit
```

The browser (`npx expo start --web`) runs the same screens. Apple Health, the camera shutter, and Siri itself run only in the native build.
