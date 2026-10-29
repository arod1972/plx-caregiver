import assert from "node:assert/strict";
import test from "node:test";
import { openJson } from "../mesh/seal.mjs";
import { createMemoryStore } from "../mesh/store.mjs";
import { createUpdates, ensureDevice, setMemberRole } from "../mesh/repository.mjs";
import { readHealthState, rememberReading, setHealthConsent, setHealthShare } from "./local.mjs";
import { assertPulse, formatHeart, formatSleep, formatSteps, summarizeHealth } from "./summary.mjs";

const now = new Date(2026, 9, 29, 8, 30, 0);

function reading() {
  return summarizeHealth({
    steps: [{ value: 4000 }, { value: 321 }],
    heart: [
      { value: 80, end: "2026-10-29T11:00:00.000Z" },
      { value: 72, end: "2026-10-29T12:10:00.000Z" },
    ],
    sleep: [
      { value: 0, start: "2026-10-28T23:00:00.000Z", end: "2026-10-29T07:00:00.000Z" },
      { value: 2, start: "2026-10-29T03:00:00.000Z", end: "2026-10-29T03:20:00.000Z" },
      { value: 3, start: "2026-10-28T23:30:00.000Z", end: "2026-10-29T03:00:00.000Z" },
      { value: 4, start: "2026-10-29T03:20:00.000Z", end: "2026-10-29T05:00:00.000Z" },
      { value: 5, start: "2026-10-29T05:00:00.000Z", end: "2026-10-29T06:10:00.000Z" },
    ],
    now,
  });
}

test("steps, latest heart rate, and asleep stages are summarized", () => {
  const snapshot = reading();
  assert.equal(snapshot.day, "2026-10-29");
  assert.equal(snapshot.steps, 4321);
  assert.equal(snapshot.heartRate, 72);
  assert.equal(snapshot.sleepMinutes, 380);
  assert.equal(formatSteps(snapshot.steps), "4,321 steps today");
  assert.equal(formatHeart(snapshot.heartRate), "72 beats per minute");
  assert.equal(formatSleep(snapshot.sleepMinutes), "6 hours 20 minutes asleep");
  assert.equal(formatSteps(null), "Not read");
  assert.equal(assertPulse("68"), 68);
  assert.throws(() => assertPulse("20"));
});

test("a reading stays on the device until a summary is explicitly shared", async () => {
  const store = createMemoryStore();
  await ensureDevice(store, "Ada");
  await assert.rejects(() => rememberReading(store, reading()), /not allowed/);
  await setHealthConsent(store, "allowed");
  await rememberReading(store, reading());
  const cached = await readHealthState(store);
  assert.equal(cached.cache.steps, 4321);
  assert.equal(cached.share, false);
  assert.equal(JSON.stringify(store.dump().packages).includes("4321"), false);
  const before = await createUpdates(store);
  const sealed = JSON.parse(before.text);
  assert.equal(Array.isArray(sealed.packages), false);
  assert.equal(JSON.stringify(await store.listAudit()).includes("4321"), false);

  await setHealthShare(store, true);
  assert.equal(JSON.stringify(store.dump().packages).includes("4321"), true);
  assert.equal(JSON.stringify(store.dump().packages).includes("HKQuantity"), false);
  const key = await store.getMeta("circle.vaultKey");
  const opened = openJson(JSON.parse((await createUpdates(store)).text).packages, key);
  assert.equal(JSON.stringify(opened).includes("4321"), true);
  const audit = await store.listAudit();
  assert.equal(audit.some((entry) => entry.collection === "health_summary"), true);
  assert.equal(JSON.stringify(audit).includes("4321"), false);

  await setHealthShare(store, false);
  assert.equal((await readHealthState(store)).share, false);
  const record = await store.getRecord(`health-${(await store.getMeta("device.id"))}`);
  assert.equal(record.deleted, true);
});

test("a device that cannot change care cannot share Apple Health", async () => {
  const store = createMemoryStore();
  const device = await ensureDevice(store, "Ada");
  await setHealthConsent(store, "allowed");
  await rememberReading(store, reading());
  await setMemberRole(store, device.id, "family");
  await assert.rejects(() => setHealthShare(store, true), /can't share/);
  assert.equal((await readHealthState(store)).share, false);
  assert.equal(JSON.stringify(store.dump().packages).includes("4321"), false);
});

test("stopping Apple Health clears the local reading and retracts a shared summary", async () => {
  const store = createMemoryStore();
  await ensureDevice(store, "Ada");
  await setHealthConsent(store, "allowed");
  await rememberReading(store, reading());
  await setHealthShare(store, true);
  await setHealthConsent(store, "declined");
  const state = await readHealthState(store);
  assert.equal(state.consent, "declined");
  assert.equal(state.share, false);
  assert.equal(state.cache, null);
  const record = await store.getRecord(`health-${(await store.getMeta("device.id"))}`);
  assert.equal(record.deleted, true);
});
