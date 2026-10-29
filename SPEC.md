# plx-caregiver Specification & Living Development Tracker

**Version:** 1.0 (MVP Kickoff)
**Last Updated:** 2026-10-29
**Owner:** PrimaLux Advisory (Adrian L. Rodriguez)
**Repo:** https://github.com/arod1972/plx-caregiver
**Purpose:** This document is the single source of truth and living tracker for the build agent. Reference it for every step. Update status after each completed PR/merge to prevent drift.

## 1. Overview & Vision

**plx-caregiver** is a privacy-first, parent-friendly family caregiving coordination app for families supporting an aging parent (or similar care recipient). It reduces the mental load of coordination by providing a single, secure hub for calendar, tasks, medication reminders, and family updates.

**Initial Version (MVP) Focus:** Shared care calendar, task assignments, medication list/reminders with taken logging, and secure family updates/messaging. Emphasize simplicity, consent controls, and large-text/voice-friendly design for the parent.

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
- **Feasibility:** High. Standard tech stack. Pure consumer family app does not trigger full HIPAA (no covered entity), but design to privacy-by-design standards: encryption, RBAC, parent consent/revocation, audit logs. Parent-friendly UX is critical differentiator.

**Conclusion:** Market supports and is feasible. Proceed with MVP.

## 3. MVP Scope

### Core Features (Must-Have for v1)
1. **Shared Care Calendar**
   - Appointments, medication times, visits, important dates.
   - Viewable/editable by authorized family members.
   - Recurring events, notifications.

2. **Task Coordination**
   - Assign errands, rides, meals, follow-ups to family members.
   - Status: Open / Assigned / In Progress / Done.
   - Notifications on assignment/completion.

3. **Medication List & Reminders**
   - Dosage, schedule, refill tracking.
   - Record when dose was taken (by parent or caregiver).
   - Reminders (push + optional SMS).

4. **Secure Family Updates / Messaging**
   - Organized care-related communication in one place (threaded updates or simple chat).
   - Visible only to authorized members.

### Supporting Features
- **Privacy & Consent Controls:** Parent (or primary) decides who can view/change information. Easy permission updates. Role-based (Parent, Primary Caregiver, Family Member, Viewer).
- **Parent-Friendly Design:** Large text, high contrast, simple navigation, voice/audio options (e.g., read-aloud), minimal steps.
- **Auth & Security:** Secure login (email/password + optional social/magic link), encryption in transit/at rest, audit of access.

**Out of Scope for MVP:** Full document storage, location tracking, EHR integration, advanced AI, multi-language (beyond English), professional caregiver marketplace.

## 4. Tech Stack Recommendations

- **Mobile/Web:** React Native with Expo (cross-platform iOS/Android + web). Parent mode with accessibility (large fonts, voice).
- **Backend:** Node.js + Express or NestJS. Or Supabase for faster MVP (Postgres + Auth + Realtime).
- **Database:** PostgreSQL (encrypted).
- **Auth:** Supabase Auth or Clerk.
- **Notifications:** Expo Push + optional Twilio SMS for seniors.
- **Hosting:** Vercel/Railway/Supabase (privacy-focused configs).
- **Encryption:** TLS 1.3+, AES-256 at rest, app-level for sensitive fields if needed.

**Rationale:** Fast iteration, strong privacy options, accessibility support, cost-effective for family consumer app.

## 5. Data Models (High-Level)

- **User:** id, name, email, role, preferences (font size, voice), consent flags.
- **CareCircle / Family:** id, parent_id, members[] with roles/permissions.
- **Event/CalendarItem:** id, title, type (appointment/med/visit), datetime, recurrence, assignees, notes.
- **Task:** id, title, description, assignee_id, status, due_date, completed_by, completed_at.
- **Medication:** id, name, dosage, schedule (times), refill_date, taken_logs[].
- **Update/Message:** id, author_id, content, timestamp, attachments?, visible_to_roles.
- **AuditLog:** action, user_id, timestamp, resource.

## 6. User Flows (Key)

1. Parent or primary creates Care Circle, invites family via email/link.
2. Parent sets permissions (who can edit calendar, see meds, etc.).
3. Add calendar events / assign tasks / log meds.
4. Parent or family marks dose taken or task complete.
5. Post secure update; authorized members notified.
6. Parent can revoke access anytime.

## 7. Privacy, Consent & Security Requirements

- Explicit consent from parent for data sharing within circle.
- Role-based access control (RBAC).
- Encryption in transit (TLS) and at rest.
- No sale of data; clear privacy policy.
- Easy permission management and data export/deletion.
- Audit logs for sensitive actions.
- Optional: parent-only mode with simplified view.

## 8. Design Principles (Parent-Friendly)

- Large text (adjustable), high contrast, large touch targets.
- Simple navigation (bottom tabs: Calendar, Tasks, Meds, Updates, Profile).
- Voice/audio support (read reminders, voice input where possible).
- Minimal cognitive load: clear icons + text, progressive disclosure.
- Support for different languages (future).

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
| 0.1 | Setup | Initialize Expo React Native project structure, basic navigation, theming for large text/accessibility | App launches, bottom tabs present, font scaling works, dark/light mode | Not Started | - | - |
| 0.2 | Setup | Set up backend (Supabase or Node/Postgres), auth (email/password + magic link), basic user model | Users can sign up/login, session persists | Not Started | - | - |
| 1.1 | Auth & Circle | Care Circle creation, invite members, role assignment (Parent, Caregiver, Family, Viewer) | Primary can create circle, invite by email, assign roles, members see only permitted data | Not Started | - | - |
| 1.2 | Auth & Circle | Parent consent controls & permission management UI | Parent can toggle view/edit per role or member, changes take effect immediately | Not Started | - | - |
| 2.1 | Calendar | Shared calendar: create/view/edit events (appointments, visits, important dates), recurrence | Events visible to authorized, notifications on create/update | Not Started | - | - |
| 2.2 | Calendar | Medication times as calendar events + dedicated med view | Med schedules appear on calendar | Not Started | - | - |
| 3.1 | Tasks | Task list: create, assign to members, status updates (Open/Assigned/Done), notifications | Assignee notified, can mark complete, history visible | Not Started | - | - |
| 4.1 | Medications | Medication list: add name, dosage, schedule, refill date | List shared per permissions | Not Started | - | - |
| 4.2 | Medications | Reminders (push) + log "taken" (by parent or caregiver), adherence view | Reminder fires, taken log updates status, family can see if taken | Not Started | - | - |
| 5.1 | Updates | Secure family updates/messaging: post updates, view thread, notifications | Only authorized members see posts, real-time or near-real-time | Not Started | - | - |
| 6.1 | UX | Parent-friendly mode: large text toggle, simplified views, voice read-aloud for key screens | Parent can enable large text; key info readable aloud | Not Started | - | - |
| 7.1 | Security | Encryption, basic audit log for access/changes to sensitive data | Data encrypted at rest/transit; audit entries for meds/calendar edits | Not Started | - | - |
| 8.1 | Polish | Basic error handling, offline awareness note, privacy policy stub, app icon/branding (PrimaLux) | App handles common errors gracefully; privacy note present | Not Started | - | - |

**Status Values:** Not Started | In Progress | Done | Blocked

## 10. Next Steps After MVP Tracker Complete

- Conduct interviews with 3-5 families and older adults.
- Iterate based on feedback (add health notes, emergency contacts, document storage, etc.).
- Consider optional location/check-in with informed consent.
- Explore freemium model (free core, paid for advanced features/storage).

---

**Build Agent Kickoff Note:** This SPEC.md is your tracker. Start with task 0.1. Update this file after every merge. Reference task IDs in all PRs. Do not expand scope without updating the document.

**Market & Feasibility sources:** Emergen Research, Fact.MR, competitor sites (CaringVillage, etc.), caregiver surveys (e.g., Caregiver Action Network 2026).