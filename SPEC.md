# plx-caregiver Specification & Living Development Tracker

**Version:** 1.3 (Local-First + Native iOS Capabilities)
**Last Updated:** 2026-10-29
**Owner:** PrimaLux Advisory (Adrian L. Rodriguez)
**Repo:** https://github.com/arod1972/plx-caregiver
**Purpose:** This document is the single source of truth and living tracker for the build agent. Reference it for every step. Update status after each completed PR/merge to prevent drift.

## 1. Overview & Vision

**plx-caregiver** is a privacy-first, parent-friendly family caregiving coordination app for families supporting an aging parent (or similar care recipient). It reduces the mental load of coordination by providing a single, secure hub for calendar, tasks, medication reminders, and family updates.

**Architecture Principle (v1.2+):** Local-first. Primary data lives on-device. Shared coordination works among authorized devices without maintaining a central coordination server for the core shared state. Sync between authorized devices is peer-to-peer or CRDT/mergeable (eventual consistency). Optional minimal signaling/relay only for discovery, invites, or NAT traversal — not as the source of truth. Incorporates patterns researched for Response-Cell (local SQLite + MESH sync with signed append-only packages, heartbeat pull/push, QR/JSON invites with keys, optional introducer) and Grant-Studio (local-first workstation).

**Initial Version (MVP) Focus:** Shared care calendar, task assignments, medication list/reminders with taken logging, and secure family updates/messaging. Emphasize simplicity, consent controls, and large-text/voice-friendly design for the parent. Offline-first by default.

**v1.3 Additions (Must-Have):** Basic HealthKit integration, camera-based medication label scanning to identify and mark doses, and Siri/App Intents for hands-off operation. Full normal UI remains primary; Siri is additive for tech-savvy users.

**Future phases** (post-MVP interviews): health notes, emergency info, secure document storage, optional location/check-in (with explicit consent), multilingual support, AI summaries.

## 2. Market Research Summary (Feasibility Green)

- **Market Size:** Global Elderly Care Apps ~$6.2B (2025) projected to $23.4B by 2035 (14.2% CAGR, Emergen Research). Digital Caregiver Platforms ~$640M (2026) to $3.05B (2036, 16.9% CAGR, Fact.MR). Family/individual users ~50%+ of market. US strong growth driven by aging population, caregiver shortage, preference for aging-in-place.
- **Key Competitors & Gaps:**
  - Caring Village: All-in-one (calendar, tasks, meds, docs, AI). Freemium/paid. Gaps: complexity for seniors, limited free tier.
  - Lotsa Helping Hands: Free volunteer calendar/tasks. Gaps: weak on meds/privacy/docs.
  - CaringBridge: Free updates/journaling. Gaps: poor for operational coordination.
  - Medisafe: Strong meds tracking. Gaps: not a full hub.
  - Others (CircleOf, ianacare, etc.): Fragmented.
- **Pain Points Addressed:** Coordination time sink (meds, appointments, refills), fragmented information across texts/emails, sibling assumption gaps, low senior adoption of complex apps, privacy/trust concerns.
- **Feasibility:** High. Local-first stack is standard and privacy-enhancing. Pure consumer family app does not trigger full HIPAA (no covered entity), but design to privacy-by-design standards: local encryption, RBAC via shared keys/roles, parent consent/revocation, local audit logs. Parent-friendly UX is critical differentiator.

**Conclusion:** Market supports and is feasible. Proceed with MVP on local-first architecture.

## 3. MVP Scope

### Core Features (Must-Have for v1)
1. **Shared Care Calendar**
   - Appointments, medication times, visits, important dates.
   - Viewable/editable by authorized family members (synced across devices).
   - Recurring events, local notifications.

2. **Task Coordination**
   - Assign errands, rides, meals, follow-ups to family members.
   - Status: Open / Assigned / In Progress / Done.
   - Local notifications on assignment/completion.

3. **Medication List & Reminders**
   - Dosage, schedule, refill tracking.
   - Record when dose was taken (by parent or caregiver).
   - Local reminders (push via OS + optional SMS if needed).
   - **v1.3:** Camera scan of medication labels to identify and help mark taken/not taken.

4. **Secure Family Updates / Messaging**
   - Organized care-related communication in one place (threaded updates or simple chat).
   - Visible only to authorized members; synced across authorized devices.

### Supporting Features
- **Privacy & Consent Controls:** Parent (or primary) decides who can view/change information. Easy permission updates. Role-based (Parent, Primary Caregiver, Family Member, Viewer) enforced locally via shared keys/roles.
- **Parent-Friendly Design:** Large text, high contrast, simple navigation, voice/audio options (e.g., read-aloud), minimal steps.
- **Auth & Security:** Device pairing / invite codes (QR or link), local encryption at rest, end-to-end encrypted sync between authorized devices. No central account required for core function (optional for recovery).
- **v1.3 Native iOS Capabilities (Must-Have):**
  - Basic HealthKit read/write (steps, heart rate, sleep, and medication-related where available).
  - Camera for medication label scanning (OCR + matching to existing list).
  - Siri / App Intents for hands-off actions (e.g., mark dose taken, check next med, log simple update) while full UI remains primary.

**Out of Scope for MVP:** Full document storage, location tracking, EHR integration, advanced AI, multi-language (beyond English), professional caregiver marketplace, always-on central coordination server for shared data.

## 4. Tech Stack Recommendations (Local-First)

- **Mobile/Web:** React Native with Expo (cross-platform iOS/Android + web). Parent mode with accessibility (large fonts, voice). Use Expo development builds (`npx expo run:ios` or EAS) for native capabilities.
- **Primary Data Store:** Local SQLite (expo-sqlite) on each device as the source of truth.
- **Sync / Sharing:** CRDT or mergeable store (e.g., TinyBase with CRDT support, Yjs, or equivalent MESH-style signed append-only packages) for conflict-free sync of shared calendar/tasks/meds/updates between authorized devices. Peer-to-peer (WebRTC / local network) preferred; optional minimal signaling/introducer only for discovery/NAT traversal (not for data storage). Patterns from Response-Cell MESH and Grant-Studio local-first.
- **Device Authorization:** QR code or invite link (JSON with key material) with key exchange for pairing authorized devices. Roles and permissions stored and enforced locally.
- **Notifications:** Local notifications (Expo Notifications / OS). Optional external SMS only if required for seniors without app.
- **Encryption:** AES-256 at rest on device; end-to-end encrypted sync payloads between authorized devices.
- **Native iOS Capabilities (v1.3):**
  - HealthKit via Expo-compatible module (e.g. `apple-health` or `@appeeky/expo-healthkit` or equivalent). Config plugin for entitlements.
  - Camera + OCR for medication labels (Expo Camera + on-device or local OCR library; match against local medication list).
  - Siri / App Intents via `expo-app-intents` or equivalent for basic intents (mark taken, next dose, etc.).
- **Optional Minimal Services:** Only for invite delivery, optional account recovery, or signaling — never the canonical store for care data.

**Rationale:** Maximizes privacy and offline capability. Aligns with local-first principles (data stays on device; authorized devices sync directly). Incorporates Response-Cell (local SQLite + MESH, QR invites, optional introducer) and Grant-Studio local-first patterns. Reduces operational burden (no central coordination server to maintain for shared state). Fast iteration with Expo while enabling native iOS features via development builds.

## 4.1 iOS Deploy Command Batch (Build Agent Must Provide)

Because the development machine has been used primarily with Xcode and Swift, the build agent must include (in README or a dedicated `ios-deploy.md`) a clear, copy-pasteable command batch that produces a deployable iOS app from the Expo project:

```bash
# Prerequisites: Node, Expo CLI, Apple Developer account, Xcode installed
npx expo install
npx expo prebuild --platform ios
# Open in Xcode if needed: open ios/*.xcworkspace
npx expo run:ios
# Or for EAS Build (recommended for distribution):
npx eas build --platform ios --profile production
```

Include notes on enabling HealthKit capability, adding usage descriptions, and signing. The agent must ensure the project can generate a signed IPA or run on device via the above flow.

## 5. Data Models (High-Level, Local)

- **User / Device:** local id, name, device key, role, preferences (font size, voice), consent flags. (No central user table required.)
- **CareCircle / Family:** id, parent_id, authorized_members[] (with roles/permissions and public keys or shared secrets), local copy on each device.
- **Event/CalendarItem:** id, title, type (appointment/med/visit), datetime, recurrence, assignees, notes. (CRDT/mergeable.)
- **Task:** id, title, description, assignee_id, status, due_date, completed_by, completed_at. (CRDT/mergeable.)
- **Medication:** id, name, dosage, schedule (times), refill_date, taken_logs[], label_scan_data? (CRDT/mergeable.)
- **Update/Message:** id, author_id, content, timestamp, attachments?, visible_to_roles. (CRDT/mergeable.)
- **AuditLog:** action, user_id/device_id, timestamp, resource. (Local; optionally synced.)
- **HealthKitSamples (optional local cache):** limited recent samples for display (steps, HR, sleep) with user consent.

All shared entities use mergeable/CRDT semantics so concurrent offline edits converge deterministically.

## 6. User Flows (Key, Local-First)

1. Parent or primary creates Care Circle locally; generates invite (QR/code/link with key material).
2. Authorized family members pair their devices via invite; receive encrypted copy of shared state.
3. Parent sets permissions (who can edit calendar, see meds, etc.) — enforced locally on all authorized devices.
4. Add calendar events / assign tasks / log meds — written locally immediately; synced to other authorized devices when connected (P2P or via minimal relay).
5. Parent or family marks dose taken or task complete — local write + sync. Optional: scan label with camera to assist identification.
6. Post secure update; authorized members receive via sync and local notification.
7. Parent can revoke access anytime (remove from authorized set; future syncs stop).
8. **v1.3:** Siri phrases (e.g. “Mark morning med taken”) trigger App Intents that update local state and sync.
9. **v1.3:** Optional HealthKit permission flow; basic samples available for display with consent.

## 7. Privacy, Consent & Security Requirements

- Explicit consent from parent for data sharing within circle (recorded locally).
- Role-based access control enforced locally (shared keys/roles).
- Encryption at rest (device) and end-to-end for sync between authorized devices.
- No sale of data; clear privacy policy. No central store of care data.
- Easy permission management and data export/deletion (local).
- Local audit logs for sensitive actions.
- Optional: parent-only mode with simplified view.
- Device pairing requires explicit authorization; no open broadcast of care data.
- HealthKit access requires explicit system permission and clear usage description; only basic types; never stored off-device without consent.

## 8. Design Principles & Premier UI/UX Guidelines (Mandatory)

**Core Aesthetic Direction:** Calm, trustworthy, warm-professional, modern, and pleasant. Not cold clinical, not playful consumer, and definitely not generic AI-generated "slop." Think refined Apple Health / Headspace / Calm crossed with a practical family tool. Premium feel through intentional design, generous whitespace, refined typography, and restraint — not luxury excess or flashy effects.

### Design System Requirements
- **Typography:** System fonts (SF Pro on iOS, Roboto/Material on Android) or a carefully chosen modern sans (e.g., Inter with custom tracking, or a warm alternative). Clear hierarchy. Parent mode: body text 18–22pt+, titles larger. High contrast ratios (WCAG AA minimum).
- **Color Palette:** Warm neutrals (soft off-whites, warm grays) + one primary accent (soft teal, sage green, or muted navy). Support light and dark modes. Avoid pure black/white extremes and generic purple/blue AI gradients.
- **Spacing:** Strict 4/8pt grid. Generous padding and margins. Cards with comfortable internal padding.
- **Components:** Consistent, reusable only. Clean cards with subtle borders or soft shadows (restrained elevation). Large touch targets (minimum 44pt). Iconography: simple line style (Lucide, SF Symbols, or equivalent) — purposeful only, no decorative clutter.
- **Motion:** Subtle, purposeful only (ease-out transitions, gentle feedback). No bouncy defaults, no excessive animations, no glassmorphism overload.

### Explicit Anti-Slop Guardrails (Build Agent Must Follow)
- Do **not** ship default Expo/React Native styling without heavy, intentional customization.
- Prohibit generic "AI app" aesthetic: purple/blue gradients, floating orbs, sparkles, mismatched radii, cluttered density, stock AI illustrations of smiling seniors, emoji overload.
- No one-off styles or inconsistent components. Everything must use the design system.
- Visual hierarchy must be clear; screens must feel spacious and calm, never crowded.
- Empty states and illustrations: minimal, custom or carefully selected; no generic placeholders.
- Branding: Subtle PrimaLux professional modern feel. App icon and accents should feel premium and trustworthy.
- Every screen must pass the test: "Does this look like a polished product a family would trust with sensitive caregiving information?"

### Parent-Friendly Specifics (Still Required)
- Large text (adjustable), high contrast, large touch targets.
- Simple navigation (bottom tabs: Calendar, Tasks, Meds, Updates, Profile).
- Voice/audio support (read reminders, voice input where possible).
- Minimal cognitive load: clear icons + text, progressive disclosure.
- Support for different languages (future).

**Build Agent Rule:** All UI work must adhere to these guidelines. Include screenshots in PRs for visual review. Deviation requires updating this section first.

## 9. Living Development Tracker (Build Agent Use This)

**Instructions for Build Agent:**
1. Always read the latest SPEC.md first.
2. Identify the next task with Status = "Not Started".
3. Implement the feature according to acceptance criteria.
4. Create a branch, commit, open PR (reference this task in PR description).
5. After PR is submitted/merged, update this table: set Status to "Done", add PR #/link, notes.
6. Commit the updated SPEC.md in the same or follow-up PR.
7. Repeat until all MVP tasks are Done.
8. Do not deviate from MVP scope without updating this spec and getting approval.

| ID | Phase | Task | Acceptance Criteria | Status | PR Link | Notes |
|----|-------|------|---------------------|--------|---------|-------|
| 0.1 | Setup | Initialize Expo React Native project structure, basic navigation, theming for large text/accessibility **and design system tokens (color, type, spacing)** | App launches, bottom tabs present, font scaling works, dark/light mode. Design system tokens implemented and used. | Done | https://github.com/arod1972/plx-caregiver/pull/1 | Expo SDK 58, Expo Router tabs, sage/warm tokens, light/dark/system, text size Standard/Large/Extra large. Screenshots in screenshots/0.1. |
| 0.2 | Setup | Set up local-first data layer: expo-sqlite primary store + CRDT/mergeable/MESH sync layer (signed append-only packages), device identity/key generation | Local DB initializes; basic CRUD works offline; sync primitives ready for authorized devices. No central backend required for core data. | Done | https://github.com/arod1972/plx-caregiver/pull/2 | expo-sqlite store, Ed25519 signed packages, heartbeat exchange, QR/JSON invite with X25519. Device name saved on Profile. Screenshots in screenshots/0.2. Encryption at rest remains task 7.1. |
| 1.1 | Auth & Circle | Care Circle creation, device pairing via QR/invite code, role assignment (Parent, Caregiver, Family, Viewer) | Primary can create circle locally, generate invite, pair authorized devices, assign roles. Shared state syncs to paired devices. | Done | https://github.com/arod1972/plx-caregiver/pull/3 | Circle is created on the first device. Invites carry a role. Signed update bundles sync the circle name and roles. Screenshots in screenshots/1.1. Consent toggles remain task 1.2. |
| 1.2 | Auth & Circle | Parent consent controls & permission management UI | Parent can toggle view/edit per role or member; changes propagate via sync. | Done | https://github.com/arod1972/plx-caregiver/pull/4 | Sharing card on Profile. Circle creator or Parent sets Can change, Can view, or No access per role, plus an exception per paired device. Signed update bundle syncs the choice. Screenshots in screenshots/1.2. |
| 2.1 | Calendar | Shared calendar: create/view/edit events (appointments, visits, important dates), recurrence | Events written locally, visible to authorized devices via sync; local notifications on create/update. | Done | https://github.com/arod1972/plx-caregiver/pull/5 | Appointments, visits, and important dates on the device. Weekly and monthly series for the next 60 days. Signed update bundle syncs them when the device can view the calendar. Saving sets a local reminder for the next occurrence. Screenshots in screenshots/2.1. Medication times remain task 2.2. |
| 2.2 | Calendar | Medication times as calendar events + dedicated med view | Med schedules appear on calendar; synced. | Done | https://github.com/arod1972/plx-caregiver/pull/6 | Name and daily time on the Meds tab, repeated on the calendar for 60 days. Signed update bundle syncs them. Dosage, refill, taken log, and dose reminders remain tasks 4.1 and 4.2. Screenshots in screenshots/2.2. |
| 3.1 | Tasks | Task list: create, assign to members, status updates (Open/Assigned/Done), notifications | Assignee notified locally; can mark complete; history visible; synced across devices. | Done | https://github.com/arod1972/plx-caregiver/pull/7 | Title, notes, and an optional due date. Assign to someone in the circle. Open, Assigned, or Done. The assignee can mark it done and is notified on their device. Done tasks stay in the history. Signed update bundle syncs them. Screenshots in screenshots/3.1. |
| 4.1 | Medications | Medication list: add name, dosage, schedule, refill date | List shared per permissions via sync. | Done | https://github.com/arod1972/plx-caregiver/pull/8 | Name, dosage, daily time, and optional refill date on the Meds tab. The time stays on the calendar, with the dosage under the name. Signed update bundle syncs the list for devices that can view it. Dose reminders and the taken log remain task 4.2. Screenshots in screenshots/4.1. |
| 4.2 | Medications | Local reminders + log "taken" (by parent or caregiver), adherence view | Reminder fires locally; taken log updates status; family can see if taken via sync. | Done | https://github.com/arod1972/plx-caregiver/pull/9 | Next dose is scheduled on the device. A caregiver marks today taken. The card shows Taken and a 7-day count. Signed update bundle syncs it; view-only family can see it but not mark it. Screenshots in screenshots/4.2. |
| 5.1 | Updates | Secure family updates/messaging: post updates, view thread, notifications | Only authorized members see posts; near-real-time or eventual via sync. | Done | https://github.com/arod1972/plx-caregiver/pull/10 | One care thread on the device. View or edit access can post and read. A new note notifies this device. Signed update bundle syncs the thread. Screenshots in screenshots/5.1. |
| 6.1 | UX | Parent-friendly mode: large text toggle, simplified views, voice read-aloud for key screens | Parent can enable large text; key info readable aloud. Full adherence to Section 8 design system. | Done | https://github.com/arod1972/plx-caregiver/pull/11 | Parent mode on Profile sets Extra large text and shortens the calendar, tasks, medications, and updates screens. Those screens can be read aloud. Screenshots in screenshots/6.1. |
| 7.1 | Security | Local encryption at rest, E2E sync encryption, basic local audit log for sensitive actions | Data encrypted on device; sync payloads E2E; local audit entries for meds/calendar edits. | Done | https://github.com/arod1972/plx-caregiver/pull/12 | Device copy and SQLite bodies are sealed with a vault key kept outside the database. Copied updates are sealed; the circle key is wrapped with the pairing secret and is not in the invite. Medication, dose, and calendar edits write a local audit entry without the care text. The audit log is not synced. |
| 8.1 | Polish | Basic error handling, offline awareness note, privacy policy stub, app icon/branding (PrimaLux), **visual polish pass against Section 8** | App handles common errors gracefully; privacy note present. UI looks sleek, professional, modern, and pleasant — no AI slop. | Done | https://github.com/arod1972/plx-caregiver/pull/13 | Profile states that care stays on the device, nothing is sold, and the circle works offline. A screen error offers Try again in the same palette. The icon is a sage ring on warm paper. Screenshots in screenshots/8.1. |
| 9.1 | Native | Basic HealthKit integration (read steps, heart rate, sleep; optional write limited samples) with consent | HealthKit permission flow works on device; basic samples displayed with clear consent; data stays local unless explicitly shared. | Done | https://github.com/arod1972/plx-caregiver/pull/16 | Apple Health is read only after an explicit allow. Steps, heart rate, and sleep stay on the device. A daily summary is shared only if that control is on. The browser says Apple Health is only on the iPhone app. Screenshots in screenshots/9.1. |
| 9.2 | Native | Camera medication label scan to identify and assist marking taken/not taken | Camera opens, OCR extracts text, matches against local medication list, offers one-tap mark taken. Works offline. | Not Started |  | Expo Camera + on-device OCR. Match against existing med records. |
| 9.3 | Native | Siri / App Intents for hands-off use (mark dose taken, check next medication, simple status) | Basic intents registered; Siri phrases trigger local updates that sync. Full UI remains fully usable without Siri. | Not Started |  | Use expo-app-intents or equivalent. Document sample phrases. |
| 9.4 | Deploy | Provide copy-paste iOS deploy command batch + notes for Xcode/EAS | README or ios-deploy.md contains working commands to produce a deployable iOS build from the Expo project. | Not Started |  | Include prebuild, run:ios, EAS options, HealthKit capability notes. |

**Status Values:** Not Started | In Progress | Done | Blocked

## 10. Next Steps After MVP Tracker Complete

- Conduct interviews with 3-5 families and older adults.
- Iterate based on feedback (add health notes, emergency contacts, document storage, etc.).
- Consider optional location/check-in with informed consent.
- Explore freemium model (free core, paid for advanced features/storage).

---

**Build Agent Kickoff Note:** This SPEC.md is your tracker. Start with the next Not Started task (currently 9.1). Update this file after every merge. Reference task IDs in all PRs. For iOS native features, use development builds and include the deploy command batch from Section 4.1.
