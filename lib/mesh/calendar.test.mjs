import assert from "node:assert/strict";
import test from "node:test";
import { deleteEvent, listUpcoming, localStarts, occursBetween, saveEvent } from "./calendar.mjs";
import { createMemoryStore } from "./store.mjs";
import { acceptPayload, createInvite, createUpdates, ensureDevice, listCollection, setRoleAccess } from "./repository.mjs";

async function pair(left, right) {
  const invite = await createInvite(left);
  const accepted = await acceptPayload(right, invite.text);
  await acceptPayload(left, accepted.text);
}

test("events stay local, repeat, and sync to a paired device", async () => {
  const ada = createMemoryStore();
  const ben = createMemoryStore();
  await ensureDevice(ada, "Ada");
  await ensureDevice(ben, "Ben");
  const startsAt = localStarts("2026-11-03", "09:30");
  const saved = await saveEvent(ada, { title: "Clinic visit", kind: "visit", startsAt, repeat: "weekly", notes: "Bring the list" });
  assert.equal(saved.title, "Clinic visit");
  const renamed = await saveEvent(ada, { ...saved, title: "Clinic follow-up" });
  assert.equal(renamed.id, saved.id);
  const times = occursBetween(renamed, Date.parse("2026-11-01"), Date.parse("2026-12-01"));
  assert.equal(times.length, 4);
  assert.equal(times[1] - times[0], 7 * 24 * 60 * 60 * 1000);

  await pair(ada, ben);
  const synced = await acceptPayload(ben, (await createUpdates(ada)).text);
  assert.equal(synced.status, "synced");
  const rows = await listCollection(ben, "event");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, "Clinic follow-up");

  await deleteEvent(ada, saved.id);
  assert.equal((await listCollection(ada, "event")).length, 0);
});

test("a device without access cannot change or see the calendar", async () => {
  const ada = createMemoryStore();
  await ensureDevice(ada, "Ada");
  const startsAt = localStarts("2026-11-04", "15:00");
  await saveEvent(ada, { title: "Birthday", kind: "date", startsAt, repeat: "none" });
  await setRoleAccess(ada, "caregiver", "none");
  const hidden = await listUpcoming(ada, new Date("2026-11-04T12:00:00"));
  assert.deepEqual(hidden, []);
  await assert.rejects(
    () => saveEvent(ada, { title: "Another", kind: "appointment", startsAt, repeat: "none" }),
    /calendar/,
  );
});
