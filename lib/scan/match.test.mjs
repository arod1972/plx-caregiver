import assert from "node:assert/strict";
import test from "node:test";
import { adherence, clearTaken, markTaken, saveMedication } from "../mesh/medications.mjs";
import { createUpdates, ensureDevice } from "../mesh/repository.mjs";
import { createMemoryStore } from "../mesh/store.mjs";
import { readScanConsent, setScanConsent } from "./local.mjs";
import { matchLabel } from "./match.mjs";

const meds = [
  { id: "lisinopril", name: "Lisinopril", dosage: "10 mg", time: "08:00" },
  { id: "combo", name: "Lisinopril HCTZ", dosage: "10-12.5 mg", time: "08:00" },
  { id: "metformin", name: "Metformin", dosage: "500 mg", time: "20:00" },
];

test("a label matches the saved medication", () => {
  const hit = matchLabel("LISINOPRIL TABLETS\n10 mg", meds);
  assert.equal(hit?.id, "lisinopril");
  assert.equal(matchLabel("lisin0pril 10 mg tablets", meds)?.id, "lisinopril");
  assert.equal(matchLabel("LISINOPRIL HCTZ 10-12.5 MG", meds)?.id, "combo");
});

test("an unrelated label does not match", () => {
  assert.equal(matchLabel("METFORMIN HCL 500 MG", meds)?.id, "metformin");
  assert.equal(matchLabel("ASPIRIN 81 MG", meds), null);
  assert.equal(matchLabel("   ", meds), null);
  assert.equal(matchLabel("lisin", meds), null);
});

test("camera consent stays on the device", async () => {
  const store = createMemoryStore();
  await ensureDevice(store, "Ada");
  assert.equal(await readScanConsent(store), "unknown");
  await setScanConsent(store, "allowed");
  assert.equal(await readScanConsent(store), "allowed");
  const dumped = JSON.stringify(await store.dump());
  assert.equal(dumped.includes("LISINOPRIL"), false);
  const updates = await createUpdates(store);
  assert.equal(updates.text.includes("LISINOPRIL"), false);
  await assert.rejects(() => setScanConsent(store, "later"), /camera/);
});

test("marking a scanned dose taken or not taken syncs the dose only", async () => {
  const ada = createMemoryStore();
  const ben = createMemoryStore();
  await ensureDevice(ada, "Ada");
  await ensureDevice(ben, "Ben");
  const saved = await saveMedication(ada, { name: "Lisinopril", time: "08:00", dosage: "10 mg" });
  const now = new Date(2026, 9, 29, 9, 0, 0);
  const label = "LISINOPRIL TABLETS 10 mg";
  assert.equal(matchLabel(label, [{ ...saved }])?.id, saved.id);
  await markTaken(ada, saved.id, now);
  assert.equal((await adherence(ada, now))[0].taken, true);
  const { acceptPayload, createInvite } = await import("../mesh/repository.mjs");
  const invite = await createInvite(ada);
  const accepted = await acceptPayload(ben, invite.text);
  await acceptPayload(ada, accepted.text);
  await acceptPayload(ben, (await createUpdates(ada)).text);
  assert.equal((await adherence(ben, now))[0].taken, true);
  const cleared = await clearTaken(ada, saved.id, now);
  assert.equal(cleared.taken, false);
  await acceptPayload(ben, (await createUpdates(ada)).text);
  assert.equal((await adherence(ben, now))[0].taken, false);
  assert.equal((await clearTaken(ada, saved.id, now)).taken, false);
  const blob = JSON.stringify(await ada.dump());
  assert.equal(blob.includes(label), false);
});
