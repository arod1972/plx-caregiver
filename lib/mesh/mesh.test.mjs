import assert from "node:assert/strict";
import test from "node:test";
import { createMemoryStore } from "./store.mjs";
import {
  acceptPayload,
  createInvite,
  createUpdates,
  ensureDevice,
  heartbeatExchange,
  listCollection,
  listPeers,
  putFields,
  readDevice,
  readSharing,
  renameCircle,
  renameDevice,
  resolveAccess,
  setMemberAccess,
  setMemberRole,
  setRoleAccess,
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

test("circle roles are assigned locally and sync to the paired device", async () => {
  const ada = createMemoryStore();
  const ben = createMemoryStore();
  const adaDevice = await ensureDevice(ada, "Ada");
  await ensureDevice(ben, "Ben");
  assert.equal(adaDevice.role, "caregiver");
  assert.equal(adaDevice.primary, true);
  await renameCircle(ada, "Rodriguez care");

  const invite = await createInvite(ada, "parent");
  const accepted = await acceptPayload(ben, invite.text);
  assert.equal(accepted.peer.role, "caregiver");
  const confirmed = await acceptPayload(ada, accepted.text);
  assert.equal(confirmed.peer.role, "parent");
  assert.equal((await readDevice(ben)).role, "parent");
  assert.equal((await readDevice(ben)).circleName, "Rodriguez care");
  await assert.rejects(() => setMemberRole(ben, adaDevice.id, "viewer"), /created the circle/);

  await setMemberRole(ada, (await readDevice(ben)).id, "family");
  const updates = await createUpdates(ada);
  const synced = await acceptPayload(ben, updates.text);
  assert.equal(synced.status, "synced");
  assert.equal((await readDevice(ben)).role, "family");
  const peers = await listPeers(ada);
  assert.equal(peers[0].role, "family");
});

test("sharing choices sync and stay with the parent", async () => {
  const ada = createMemoryStore();
  const ben = createMemoryStore();
  await ensureDevice(ada, "Ada");
  const benDevice = await ensureDevice(ben, "Ben");
  await pair(ada, ben);
  await setRoleAccess(ada, "family", "edit");
  await setRoleAccess(ada, "viewer", "none");
  await setMemberAccess(ada, benDevice.id, "view");
  const updates = await createUpdates(ada);
  const synced = await acceptPayload(ben, updates.text);
  assert.equal(synced.status, "synced");
  const shared = await readSharing(ben);
  assert.equal(shared.roles.family.edit, true);
  assert.equal(shared.roles.family.view, true);
  assert.deepEqual(shared.roles.viewer, { view: false, edit: false });
  assert.equal(shared.members[benDevice.id], "view");
  assert.deepEqual(resolveAccess(shared, "family", benDevice.id), { view: true, edit: false });
  assert.deepEqual(resolveAccess(shared, "viewer", "someone-else"), { view: false, edit: false });
  await assert.rejects(() => setRoleAccess(ben, "family", "none"), /sharing/);
});
