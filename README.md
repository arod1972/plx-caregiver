# plx-caregiver

PrimaLux Care is a private family hub for coordinating care: calendar, tasks, medications, and updates.

This repository is the Expo app. Care data stays on the device: SQLite is the store, changes are signed append-only packages, and family devices pair with a QR or JSON invite. The phone that starts a care circle assigns roles (Parent, Caregiver, Family, Viewer) and chooses who can view or change care details. The calendar is stored on the device and can remind you locally. Medication times are on the Meds tab and on the calendar. There is no central care-data server.

```bash
npm install
npx expo start
```

Web: `npx expo start --web`

Product decisions live in [SPEC.md](./SPEC.md).
