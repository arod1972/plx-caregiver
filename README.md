# plx-caregiver

PrimaLux Care is a private family hub for coordinating care: calendar, tasks, medications, and updates.

This repository is the Expo app. Care data stays on the device (task 0.2): SQLite is the store, changes are signed append-only packages, and family devices pair with a QR or JSON invite. There is no central care-data server.

```bash
npm install
npx expo start
```

Web: `npx expo start --web`

Product decisions live in [SPEC.md](./SPEC.md).
