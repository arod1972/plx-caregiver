import assert from "node:assert/strict";
import test from "node:test";
import { adherence, saveMedication } from "../mesh/medications.mjs";
import { acceptPayload, createInvite, createUpdates, ensureDevice } from "../mesh/repository.mjs";
import { createMemoryStore } from "../mesh/store.mjs";
import { pickNext, runIntent } from "./actions.mjs";

const now = new Date(2026, 9, 29, 9, 30, 0);

test("the next medication is the next one not taken", () => {
  const items = [
    { id: "morning", name: "Lisinopril", time: "08:00", dosage: "10 mg", taken: false },
    { id: "night", name: "Metformin", time: "20:00", dosage: "500 mg", taken: false },
  ];
  assert.equal(pickNext(items, now)?.id, "night");
  items[1].taken = true;
  assert.equal(pickNext(items, now)?.id, "morning");
});

test("a hands-off phrase marks a dose and syncs it", async () => {
  const ada = createMemoryStore();
  const ben = createMemoryStore();
  await ensureDevice(ada, "Ada");
  await ensureDevice(ben, "Ben");
  await saveMedication(ada, { name: "Lisinopril", time: "08:00", dosage: "10 mg" });
  await saveMedication(ada, { name: "Metformin", time: "20:00", dosage: "500 mg" });
  const marked = await runIntent(ada, "markDoseTaken", { medication: "lisinopril" }, now);
  assert.equal(marked.spoken, "Lisinopril is marked taken.");
  assert.equal((await adherence(ada, now)).find((item) => item.name === "Lisinopril")?.taken, true);
  const invite = await createInvite(ada);
  const accepted = await acceptPayload(ben, invite.text);
  await acceptPayload(ada, accepted.text);
  await acceptPayload(ben, (await createUpdates(ada)).text);
  assert.equal((await adherence(ben, now)).find((item) => item.name === "Lisinopril")?.taken, true);
  const status = await runIntent(ada, "careStatus", {}, now);
  assert.match(status.spoken, /1 medication is not taken yet/);
  assert.match(status.spoken, /Metformin/);
  const next = await runIntent(ada, "nextMedication", {}, now);
  assert.match(next.spoken, /Metformin/);
  assert.match(next.spoken, /8:00 PM/);
});

test("an unknown phrase does not change medications", async () => {
  const store = createMemoryStore();
  await ensureDevice(store, "Ada");
  await saveMedication(store, { name: "Lisinopril", time: "08:00", dosage: "10 mg" });
  const result = await runIntent(store, "somethingElse", {}, now);
  assert.equal(result.spoken, "That action is not available.");
  assert.equal((await adherence(store, now))[0].taken, false);
  const missing = await runIntent(store, "markDoseTaken", { medication: "aspirin" }, now);
  assert.equal(missing.spoken, "No saved medication matches that name.");
});
