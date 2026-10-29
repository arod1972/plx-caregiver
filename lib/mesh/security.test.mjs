import assert from "node:assert/strict";
import test from "node:test";
import { saveEvent, localStarts } from "./calendar.mjs";
import { openJson, randomVaultKey, sealJson } from "./seal.mjs";
import { acceptPayload, createInvite, createUpdates, ensureDevice } from "./repository.mjs";
import { createMemoryStore, createPersistedStore } from "./store.mjs";

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  };
}

async function pair(left, right) {
  const invite = await createInvite(left);
  const accepted = await acceptPayload(right, invite.text);
  await acceptPayload(left, accepted.text);
}

test("sealed bytes hide the care text and open again", () => {
  const key = randomVaultKey();
  const sealed = sealJson({ title: "Clinic visit" }, key);
  const raw = JSON.stringify(sealed);
  assert.equal(raw.includes("Clinic"), false);
  assert.equal(openJson(sealed, key).title, "Clinic visit");
  const broken = { ...sealed, data: `${sealed.data.slice(0, -2)}00` };
  assert.throws(() => openJson(broken, key));
});

test("the device copy is encrypted and the audit log keeps no care text", async () => {
  const storage = memoryStorage();
  const store = createPersistedStore(storage, "plx-caregiver.local.v1");
  await ensureDevice(store, "Ada");
  await saveEvent(store, { title: "Clinic visit", kind: "visit", startsAt: localStarts("2026-11-03", "09:30"), repeat: "none" });
  const raw = storage.getItem("plx-caregiver.local.v1");
  assert.equal(raw.includes("Clinic"), false);
  assert.equal(raw.includes("secretKey"), false);
  const opened = createPersistedStore(storage, "plx-caregiver.local.v1");
  const audit = await opened.listAudit();
  assert.ok(audit.some((entry) => entry.collection === "event" && entry.action === "edit"));
  assert.equal(JSON.stringify(audit).includes("Clinic"), false);
  const ada = createMemoryStore();
  const ben = createMemoryStore();
  await ensureDevice(ada, "Ada");
  await ensureDevice(ben, "Ben");
  await saveEvent(ada, { title: "Clinic visit", kind: "visit", startsAt: localStarts("2026-11-03", "09:30"), repeat: "none" });
  await pair(ada, ben);
  const updates = await createUpdates(ada);
  assert.equal(updates.text.includes("Clinic"), false);
  const synced = await acceptPayload(ben, updates.text);
  assert.equal(synced.status, "synced");
  assert.equal((await ben.listAudit()).some((entry) => entry.collection === "event"), true);
  assert.equal(JSON.stringify(await ben.listAudit()).includes("Clinic"), false);
});
