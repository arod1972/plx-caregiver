import assert from "node:assert/strict";
import test from "node:test";
import { createMemoryStore } from "./store.mjs";
import {
  acceptPayload,
  createInvite,
  ensureDevice,
  heartbeatExchange,
  listCollection,
  putFields,
  readDevice,
  renameDevice,
} from "./repository.mjs";

async function pair(left, right) {
  const invite = await createInvite(left);
  const accepted = await acceptPayload(right, invite.text);
  await acceptPayload(left, accepted.text);
}

test("device identity and offline rename stay local", async () => {
  const store = createMemoryStore();
  const device = await ensureDevice(store, "Ada's phone");
  assert.equal(device.name, "Ada's phone");
  assert.equal(device.secretKey.length, 64);
  const renamed = await renameDevice(store, "Ada");
  assert.equal(renamed.name, "Ada");
  const profiles = await listCollection(store, "device_profile");
  assert.equal(profiles[0].name, "Ada");
  assert.equal(JSON.stringify(await createInvite(store)).includes(device.secretKey), false);
});

test("invite exchange derives the same secret and rejects self", async () => {
  const ada = createMemoryStore();
  const ben = createMemoryStore();
  await ensureDevice(ada, "Ada");
  await ensureDevice(ben, "Ben");
  const invite = await createInvite(ada);
  await assert.rejects(() => acceptPayload(ada, invite.text), /this device/);
  const accepted = await acceptPayload(ben, invite.text);
  const confirmed = await acceptPayload(ada, accepted.text);
  assert.equal(confirmed.status, "confirmed");
  const adaPeer = await ada.getPeer((await readDevice(ben)).id);
  const benPeer = await ben.getPeer((await readDevice(ada)).id);
  assert.equal(adaPeer.sharedSecret, benPeer.sharedSecret);
  assert.equal(adaPeer.sharedSecret.length, 64);
});

test("signed packages converge and reject tamper, replay, and unpaired devices", async () => {
  const ada = createMemoryStore();
  const ben = createMemoryStore();
  await ensureDevice(ada, "Ada");
  await ensureDevice(ben, "Ben");
  await putFields(ada, "notes", "note-note-note-0001", { body: "Ada's note" });
  const early = await heartbeatExchange(ada, ben);
  assert.ok(early.right.rejected.length > 0);

  await pair(ada, ben);
  await putFields(ada, "notes", "note-note-note-0001", { body: "Call the clinic" });
  await putFields(ben, "notes", "note-note-note-0001", { title: "Tuesday" });
  const synced = await heartbeatExchange(ada, ben);
  assert.deepEqual(synced.left.rejected, []);
  assert.deepEqual(synced.right.rejected, []);
  const left = await listCollection(ada, "notes");
  const right = await listCollection(ben, "notes");
  assert.deepEqual(left, right);
  assert.equal(left[0].body, "Call the clinic");
  assert.equal(left[0].title, "Tuesday");

  const again = await heartbeatExchange(ada, ben);
  assert.equal(again.left.accepted.length, 0);

  const [envelope] = await (async () => {
    const { exportSince } = await import("./repository.mjs");
    return exportSince(ada, {});
  })();
  const tampered = structuredClone(envelope);
  tampered.package.ops[0].value = "changed";
  const stranger = createMemoryStore();
  await ensureDevice(stranger, "Stranger");
  await pair(ada, stranger);
  const rejected = await heartbeatExchange(ada, stranger);
  assert.ok(rejected.right.accepted.length >= 1);
  const bad = await (await import("./repository.mjs")).ingestMany(stranger, [tampered]);
  assert.equal(bad.rejected[0].reason, "Bad signature");
});
