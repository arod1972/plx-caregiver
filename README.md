# plx-caregiver

PrimaLux Care is a private family hub for coordinating care: calendar, tasks, medications, and updates.

This repository is the Expo app. Care data stays on the device: SQLite is the store, changes are signed append-only packages, and family devices pair with a QR or JSON invite. The phone that starts a care circle assigns roles (Parent, Caregiver, Family, Viewer) and chooses who can view or change care details. Apple Health (steps, heart rate, and sleep) is separate: it is read only on the iPhone after you allow it, kept on that device, and shared only if you turn on a daily summary. A medication label can be read with the camera or a photo you choose; the picture stays on the device, is matched to a saved medication, and can mark that dose taken or not taken. On iPhone, Siri can mark a dose, ask for the next medication, or ask for a short status. Those phrases are listed under Hands-off, and the same actions stay on the screen. The calendar is stored on the device and can remind you locally. Medication times are on the Meds tab and on the calendar, with a dosage, a refill date, a daily reminder, and a taken log. Tasks can be assigned in the circle, and the assignee is notified on their device. Family updates stay in the circle and sync with a signed update bundle. Parent mode uses extra-large text, shorter screens, and a read-aloud button on the calendar, tasks, medications, and updates. The on-device copy is encrypted, and the updates a family copies are sealed so only a paired device can read them. Medication and calendar edits are written to a local audit log. Profile includes a privacy note: care stays on the device, nothing is sold, and the circle still works offline. There is no central care-data server.

```bash
npm install
npx expo start
```

Web: `npx expo start --web`

Product decisions live in [SPEC.md](./SPEC.md).
