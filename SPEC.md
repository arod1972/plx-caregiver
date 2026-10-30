# plx-caregiver Specification & Living Development Tracker

**Version:** 1.4 (Pure SwiftUI / Apple Native)
**Last Updated:** 2026-10-29
**Owner:** PrimaLux Advisory (Adrian L. Rodriguez)
**Repo:** https://github.com/arod1972/plx-caregiver
**Purpose:** This document is the single source of truth and living tracker for the build agent. Reference it for every step. Update status after each completed PR/merge to prevent drift.

## 1. Overview & Vision

**plx-caregiver** is a privacy-first, parent-friendly family caregiving coordination app for families supporting an aging parent (or similar care recipient). It reduces the mental load of coordination by providing a single, secure hub for calendar, tasks, medication reminders, and family updates.

**Architecture Principle (v1.4):** Local-first, pure Apple native. Primary data lives on-device in SwiftData or SQLite. Shared coordination works among authorized devices without a central coordination server for core shared state. Sync between authorized devices is peer-to-peer or CRDT/mergeable. Optional minimal signaling only for discovery or NAT traversal — not as the source of truth.

**Platform:** iOS (iPhone and iPad) only for the initial native release. Built with SwiftUI and Xcode. No React Native, no Expo, no Node.js toolchain required for development or deployment.

**MVP Focus:** Shared care calendar, task assignments, medication list/reminders with taken logging, and secure family updates. Emphasize simplicity, consent controls, and large-text/voice-friendly design for the parent. Offline-first by default.

**Required native capabilities:**
- Basic HealthKit (steps, heart rate, sleep, blood pressure, medication-related where available) with explicit consent.
- Camera + Vision framework OCR to scan medication labels and help identify / mark doses taken or not taken.
- Siri / App Intents for hands-off actions while the full SwiftUI interface remains the primary experience.

**Future phases:** health notes, emergency info, secure document storage, optional location/check-in (with explicit consent), multilingual support.

## 2. Market Research Summary (Feasibility Green)

- **Market Size:** Global Elderly Care Apps ~$6.2B (2025) projected to $23.4B by 2035 (14.2% CAGR, Emergen Research). Digital Caregiver Platforms ~$640M (2026) to $3.05B (2036, 16.9% CAGR, Fact.MR). Family/individual users ~50%+ of market. US strong growth driven by aging population, caregiver shortage, preference for aging-in-place.
- **Key Competitors & Gaps:** Caring Village, Lotsa Helping Hands, CaringBridge, Medisafe, and others remain fragmented or complex for seniors. Opportunity for a calm, privacy-first, parent-friendly native experience.
- **Feasibility:** High. Pure consumer family app does not trigger full HIPAA. Design to privacy-by-design standards: local encryption, RBAC via shared keys/roles, parent consent/revocation, local audit logs.

## 3. MVP Scope

### Core Features (Must-Have)
1. **Shared Care Calendar** — appointments, medication times, visits, important dates; recurring; local notifications; synced across authorized devices.
2. **Task Coordination** — assign errands, rides, meals, follow-ups; status tracking; local notifications.
3. **Medication List & Reminders** — dosage, schedule, refill tracking, taken logging. Camera scan of labels to identify and mark doses.
4. **Secure Family Updates** — organized care-related communication visible only to authorized members.

### Supporting Features
- Privacy & consent controls (parent decides who can view/change information).
- Parent-friendly design: large text, high contrast, simple navigation, voice/read-aloud.
- Device pairing via QR or invite with key exchange.
- Local encryption at rest and end-to-end encrypted sync payloads.
- Basic HealthKit integration.
- Siri / App Intents for common actions.

**Out of Scope for MVP:** Full document storage, continuous location tracking, EHR integration, advanced AI, multi-language (beyond English), professional caregiver marketplace, central coordination server for care data.

## 4. Tech Stack (Pure Apple Native)

- **UI:** SwiftUI. Target iOS 18+ (or current stable). Support iPhone and iPad.
- **Data:** SwiftData or SQLite (via GRDB or equivalent) as the on-device source of truth.
- **Sync:** Local-first CRDT or signed append-only packages exchanged peer-to-peer (Multipeer Connectivity, or a minimal open-source signaling library for remote discovery only). No central care-data server.
- **Authorization:** QR code or invite JSON containing one-time token and public key material.
- **Notifications:** UserNotifications framework (local).
- **Encryption:** CryptoKit for at-rest and payload encryption.
- **HealthKit:** Native HealthKit framework. Explicit permission flow; store summaries locally.
- **Camera / OCR:** AVFoundation + Vision framework for on-device text recognition of medication labels. Match against the local medication list.
- **Siri:** App Intents framework. Common actions (mark dose taken, query today’s calendar, add task) available to Siri; full UI remains primary.
- **Build & Deploy:** Xcode project. Open the `.xcodeproj` or `.xcworkspace`, set signing team, run on device or archive for TestFlight/App Store.

**Rationale:** Eliminates the Node/Expo toolchain. Aligns with the development machine already used for Xcode and Swift. Gives direct access to HealthKit, Vision, App Intents, and system design language without intermediate layers.

## 4.1 Build & Deploy (Xcode)

```bash
# Clone
git clone https://github.com/arod1972/plx-caregiver.git
cd plx-caregiver

# Open in Xcode (once the SwiftUI project exists)
open *.xcodeproj
# or
open *.xcworkspace
```

In Xcode:
1. Select your development team under Signing & Capabilities.
2. Choose a connected iPhone or simulator.
3. Press Run, or Product → Archive for distribution.

No Node.js, npm, or Expo is required.

## 5. Data Models (High-Level)

- **Device / Member:** local id, name, device key, role, preferences (font size), consent flags.
- **CareCircle:** id, authorized members with roles and public keys.
- **CalendarItem:** id, title, type, datetime, recurrence, assignees, notes.
- **Task:** id, title, description, assignee, status, due date, completed by/at.
- **Medication:** id, name, dosage, schedule, refill date, taken logs, optional scanned label text.
- **HealthSummary:** type, value, timestamp, source (HealthKit), consent flag.
- **Update / Message:** id, author, content, timestamp, visibility.
- **AuditLog:** action, device id, timestamp, resource (local).

All shared entities use mergeable semantics so concurrent offline edits converge.

## 6. User Flows

1. Parent or primary creates a Care Circle and generates an invite (QR or JSON with key material).
2. Authorized family members pair their devices via the invite.
3. Parent sets permissions; changes are enforced locally on all authorized devices.
4. Events, tasks, and medications are written locally and synced when devices can connect.
5. Doses can be marked taken manually or assisted by a camera scan of the label.
6. Secure updates are posted and appear on authorized devices.
7. Parent can revoke access at any time.
8. HealthKit permission is optional and explicit; basic metrics can be shown locally.
9. Siri can trigger common actions without opening the app.

## 7. Privacy, Consent & Security

- Explicit consent from the parent for sharing within the circle.
- Role-based access enforced locally.
- Encryption at rest and for sync payloads.
- No sale of data. No central store of care data.
- Easy permission changes and local export/deletion.
- Local audit log for sensitive actions.
- HealthKit access requires system permission and a clear usage description; only requested types are accessed.
- Camera is used only when the user initiates a scan; OCR runs on-device.
- App Intents operate on local data only.

## 8. Design Principles & Premier UI/UX Guidelines (Mandatory)

**Core Aesthetic:** Calm, trustworthy, warm-professional, modern, and pleasant. Refined Apple Health / system design language crossed with a practical family tool. Premium feel through intentional design, generous whitespace, refined typography, and restraint.

**Critical note:** The prior Expo/React Native implementation failed to deliver the required visual polish (including metallic highlights and a sleek modern appearance). The SwiftUI rebuild must not repeat that failure.

### Requirements
- Use SF Pro and SF Symbols. Support Dynamic Type.
- Warm neutrals + one primary accent (soft sage or muted teal). Light and dark modes.
- Strict spacing grid. Large touch targets (minimum 44pt).
- Subtle, purposeful motion only.
- **Intentional metallic highlights:** restrained metallic sheen, soft edge highlights, or subtle gradient borders on primary cards, buttons, and selected tab states. Must feel premium and deliberate, not flashy or overdone. Use system materials or carefully tuned SwiftUI gradients / overlays.
- No generic AI aesthetic (heavy purple/blue gradients, floating orbs, sparkles, cluttered density, stock illustrations of smiling seniors, emoji overload).
- Parent mode: extra-large text, simplified views, read-aloud where appropriate.
- Bottom tabs: Calendar, Tasks, Meds, Updates, Profile.
- Empty states must be calm and purposeful, not generic placeholders.

Every screen must feel like a polished product a family would trust with sensitive caregiving information. Visual review (screenshots in light and dark mode) is required in every UI-related PR.

## 9. Living Development Tracker

**Instructions for Build Agent:**
1. Always read the latest SPEC.md first.
2. Identify the next task with Status = "Not Started".
3. Implement the feature according to acceptance criteria.
4. Create a branch, commit, open PR (reference this task in PR description).
5. After PR is submitted/merged, update this table: set Status to "Done", add PR #/link, notes.
6. Commit the updated SPEC.md in the same or follow-up PR.
7. Repeat until all MVP tasks are Done.
8. Do not deviate from MVP scope without updating this spec and getting approval.

**Note:** Prior Expo/React Native work (tasks 0.1–8.1) is deprecated. The project is being rebuilt as a pure SwiftUI app. Preserve useful domain logic and design tokens where practical; do not continue the Expo codebase.

| ID | Phase | Task | Acceptance Criteria | Status | PR Link | Notes |
|----|-------|------|---------------------|--------|---------|-------|
| 10.1 | Setup | Create Xcode SwiftUI project structure, bottom tabs (Calendar, Tasks, Meds, Updates, Profile), design system tokens | App launches in simulator, tabs present, light/dark, Dynamic Type support. | Not Started |  | Pure SwiftUI. No Expo. |
| 10.2 | Data | On-device store (SwiftData or SQLite) + device identity/key generation | Local DB initializes; basic CRUD works offline. | Not Started |  |  |
| 10.3 | Pairing | Care Circle creation, QR/invite pairing, role assignment | Primary can create circle, generate invite, pair devices, assign roles. | Not Started |  |  |
| 10.4 | Consent | Parent permission controls | Parent can set view/edit per role or member; changes propagate. | Not Started |  |  |
| 10.5 | Calendar | Shared calendar (appointments, visits, important dates, recurrence) | Events written locally; local notifications; ready for sync. | Not Started |  |  |
| 10.6 | Tasks | Task list with assignment and status | Assignee can mark complete; local notifications. | Not Started |  |  |
| 10.7 | Meds | Medication list, schedule, taken log, local reminders | Dose reminders fire; taken status recorded and visible. | Not Started |  |  |
| 10.8 | Updates | Secure family updates thread | Authorized members can post and view; local notifications. | Not Started |  |  |
| 10.9 | HealthKit | Basic HealthKit read (steps, HR, sleep, BP) with consent | Permission flow; local summaries displayed. | Not Started |  | Native HealthKit. |
| 10.10 | Camera | Medication label scan (Vision OCR) to identify and mark dose | Camera opens from Meds; on-device OCR; match or suggest; one-tap mark taken. | Not Started |  | AVFoundation + Vision. |
| 10.11 | Siri | App Intents for mark taken, query calendar, add task | Common actions available to Siri; full UI still primary. | Not Started |  | App Intents framework. |
| 10.12 | Security | Encryption at rest, payload encryption, local audit log | Data sealed on device; sensitive actions logged locally. | Not Started |  | CryptoKit. |
| 10.13 | Polish | Error handling, privacy note, app icon, **UI polish against Section 8 including intentional metallic highlights** | App handles errors gracefully. UI is sleek, modern, professional, and pleasant. Metallic highlights are present and restrained. Screenshots in light and dark mode included in PR. | Not Started |  | Previous Expo build failed this requirement. Must be met. |

**Status Values:** Not Started | In Progress | Done | Blocked

## 10. Next Steps After MVP Tracker Complete

- Conduct interviews with 3-5 families and older adults.
- Iterate based on feedback.
- Consider optional location/check-in with informed consent.
- Explore freemium model.

---

**Build Agent Kickoff Note:** This SPEC.md is your tracker. The Expo/React Native path is deprecated. Start with task 10.1 (SwiftUI project structure). Section 8 (including metallic highlights) is mandatory. Update this file after every merge. Reference task IDs in all PRs.
