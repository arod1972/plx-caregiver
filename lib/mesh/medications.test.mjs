import assert from "node:assert/strict";
import test from "node:test";
import { listUpcoming } from "./calendar.mjs";
import { deleteMedication, listMedications, medicationOccurrences, saveMedication } from "./medications.mjs";
import { acceptPayload, createInvite, createUpdates, ensureDevice, listCollection, setRoleAccess } from "./repository.mjs";
import { createMemoryStore } from "./store.mjs";

async function pair(left, right) {
  const invite = await createInvite(left);
  const accepted = await acceptPayload(right, invite.text);
  await acceptPayload(left, accepted.text);
}

test("medication times stay on the calendar and sync", async () => {
  const ada = createMemoryStore();
  const ben = createMemoryStore();
  await ensureDevice(ada, "Ada");
  await ensureDevice(ben, "Ben");
  const saved = await saveMedication(ada, { name: "Lisinopril", time: "08:00", dosage: "10 mg", refillOn: "2026-12-01" });
  const renamed = await saveMedication(ada, { ...saved, name: "Morning lisinopril" });
  assert.equal(renamed.id, saved.id);
  const listed = await listMedications(ada);
  assert.equal(listed.length, 1);
  assert.equal(listed[0].time, "08:00");
  assert.equal(listed[0].dosage, "10 mg");
  assert.equal(listed[0].refillOn, "2026-12-01");

  const now = new Date(2026, 9, 29, 15, 0, 0);
  const hits = (await listUpcoming(ada, now)).filter((item) => item.kind === "med");
  assert.ok(hits.length >= 14);
  assert.equal(hits[0].title, "Morning lisinopril");
  assert.equal(hits[1].occursAt - hits[0].occursAt, 24 * 60 * 60 * 1000);
  assert.equal(medicationOccurrences({ time: "08:00" }, Date.parse("2026-11-01T00:00:00"), Date.parse("2026-11-04T00:00:00")).length >= 2, true);

  await pair(ada, ben);
  const synced = await acceptPayload(ben, (await createUpdates(ada)).text);
  assert.equal(synced.status, "synced");
  assert.equal((await listCollection(ben, "medication"))[0].name, "Morning lisinopril");
  assert.equal((await listCollection(ben, "medication"))[0].dosage, "10 mg");
  assert.equal((await listCollection(ben, "medication"))[0].refill_on, "2026-12-01");
  const benHits = (await listUpcoming(ben, now)).filter((item) => item.kind === "med");
  assert.equal(benHits[0].title, "Morning lisinopril");

  await deleteMedication(ada, saved.id);
  assert.equal((await listMedications(ada)).length, 0);
});

test("a device without access cannot change or see medications", async () => {
  const ada = createMemoryStore();
  await ensureDevice(ada, "Ada");
  await assert.rejects(() => saveMedication(ada, { name: "No dose", time: "09:00" }), /dosage/);
  await saveMedication(ada, { name: "Evening dose", time: "20:00", dosage: "5 mg" });
  await setRoleAccess(ada, "caregiver", "none");
  assert.deepEqual(await listMedications(ada), []);
  assert.deepEqual(await listUpcoming(ada, new Date(2026, 9, 29, 12, 0, 0)), []);
  await assert.rejects(() => saveMedication(ada, { name: "Another", time: "09:00", dosage: "5 mg" }), /medications/);
});
