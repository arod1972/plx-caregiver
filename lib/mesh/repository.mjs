import { canonicalJson, randomId } from "./codec.mjs";
import { applyOp, materialize } from "./crdt.mjs";
import { createExchangeKeys, createSigningKeys, deriveSharedSecret, signJson, verifyJson } from "./crypto.mjs";

const INVITE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PACKAGE_CHARS = 64_000;
const COLLECTION = /^[a-z][a-z0-9_]{0,31}$/;

export async function ensureDevice(store, name = "This device") {
  const existing = await store.getMeta("device.id");
  if (existing) return readDevice(store);
  const keys = createSigningKeys();
  const now = new Date().toISOString();
  await store.setMeta("device.id", randomId());
  await store.setMeta("device.name", name.trim() || "This device");
  await store.setMeta("device.publicKey", keys.publicKey);
  await store.setMeta("device.secretKey", keys.secretKey);
  await store.setMeta("device.circleId", randomId());
  await store.setMeta("device.lamport", "0");
  await store.setMeta("device.createdAt", now);
  const device = await readDevice(store);
  await putFields(store, "device_profile", device.id, { name: device.name });
  return readDevice(store);
}

export async function readDevice(store) {
  const id = await store.getMeta("device.id");
  if (!id) return null;
  return {
    id,
    name: (await store.getMeta("device.name")) ?? "This device",
    publicKey: await store.getMeta("device.publicKey"),
    secretKey: await store.getMeta("device.secretKey"),
    circleId: await store.getMeta("device.circleId"),
    createdAt: await store.getMeta("device.createdAt"),
  };
}

export function publicDevice(device) {
  if (!device) return null;
  return {
    id: device.id,
    name: device.name,
    publicKey: device.publicKey,
    circleId: device.circleId,
    createdAt: device.createdAt,
  };
}

async function nextLamport(store) {
  const current = Number((await store.getMeta("device.lamport")) ?? "0");
  const next = current + 1;
  await store.setMeta("device.lamport", String(next));
  return next;
}

function assertOp(op, authorId) {
  if (!op || typeof op !== "object") throw new Error("Invalid change");
  if (!COLLECTION.test(op.collection)) throw new Error("Invalid collection");
  if (typeof op.recordId !== "string" || op.recordId.length < 8) throw new Error("Invalid record");
  if (op.field !== "_deleted" && !/^[a-z][a-z0-9_]{0,63}$/.test(op.field)) throw new Error("Invalid field");
  if (!Number.isInteger(op.lamport) || op.lamport < 1) throw new Error("Invalid clock");
  if (op.deviceId !== authorId) throw new Error("Author mismatch");
  if (op.collection === "device_profile" && op.recordId !== authorId) throw new Error("A device can only name itself");
}

async function applyAndStore(store, op) {
  const existing = await store.getRecord(op.recordId);
  const next = applyOp(existing, op);
  await store.putRecord(next);
  if (op.collection === "device_profile" && op.recordId === op.deviceId && op.field === "name" && typeof op.value === "string") {
    const self = await store.getMeta("device.id");
    if (self === op.deviceId) await store.setMeta("device.name", op.value);
  }
}

async function appendOps(store, device, ops) {
  const seq = (await store.maxSeq(device.id)) + 1;
  const pkg = {
    v: 1,
    id: randomId(),
    seq,
    deviceId: device.id,
    publicKey: device.publicKey,
    createdAt: new Date().toISOString(),
    ops,
  };
  const signature = signJson(pkg, device.secretKey);
  const envelope = { package: pkg, signature };
  if (canonicalJson(envelope).length > MAX_PACKAGE_CHARS) throw new Error("Change is too large");
  await store.putPackage({ id: pkg.id, deviceId: device.id, seq, envelope });
  for (const op of ops) await applyAndStore(store, op);
  return envelope;
}

export async function putFields(store, collection, id, fields) {
  const device = await readDevice(store);
  if (!device) throw new Error("This device is not ready");
  const ops = [];
  const at = new Date().toISOString();
  for (const [field, value] of Object.entries(fields)) {
    const op = {
      opId: randomId(),
      collection,
      recordId: id,
      field,
      value,
      lamport: await nextLamport(store),
      deviceId: device.id,
      at,
    };
    assertOp(op, device.id);
    ops.push(op);
  }
  if (ops.length === 0) return null;
  return appendOps(store, device, ops);
}

export async function renameDevice(store, name) {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 40) throw new Error("Use a name of 1 to 40 characters");
  const device = await ensureDevice(store);
  if (device.name === trimmed) return publicDevice(device);
  await putFields(store, "device_profile", device.id, { name: trimmed });
  return publicDevice(await readDevice(store));
}

export async function listCollection(store, collection) {
  const rows = await store.listRecords(collection);
  return rows.map(materialize).filter(Boolean);
}

export async function removeRecord(store, collection, id) {
  return putFields(store, collection, id, { _deleted: true });
}

export async function createInvite(store) {
  const device = await ensureDevice(store);
  const exchange = createExchangeKeys();
  const invite = {
    v: 1,
    kind: "plx-caregiver-invite",
    id: randomId(),
    circleId: device.circleId,
    from: { deviceId: device.id, name: device.name, publicKey: device.publicKey },
    exchangePublicKey: exchange.publicKey,
    expiresAt: new Date(Date.now() + INVITE_MS).toISOString(),
  };
  await store.putInvite({
    id: invite.id,
    exchangeSecret: exchange.secretKey,
    exchangePublic: exchange.publicKey,
    expiresAt: invite.expiresAt,
    circleId: device.circleId,
  });
  return { invite, text: JSON.stringify(invite) };
}

function parsePayload(text) {
  if (typeof text !== "string" || text.length > 8000) throw new Error("That invite is not valid");
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("That invite is not valid");
  }
  return value;
}

export async function acceptPayload(store, text) {
  const device = await ensureDevice(store);
  const payload = parsePayload(text);
  if (payload?.kind === "plx-caregiver-invite") return acceptInvite(store, device, payload);
  if (payload?.kind === "plx-caregiver-accept") return completeAccept(store, device, payload);
  throw new Error("That invite is not valid");
}

async function acceptInvite(store, device, invite) {
  if (invite.v !== 1 || invite.from?.deviceId === device.id) throw new Error("That invite is from this device");
  if (!invite.from?.publicKey || !invite.exchangePublicKey || !invite.id) throw new Error("That invite is not valid");
  if (Date.parse(invite.expiresAt) < Date.now()) throw new Error("That invite has expired");
  const exchange = createExchangeKeys();
  const sharedSecret = deriveSharedSecret(exchange.secretKey, invite.exchangePublicKey);
  const peer = {
    deviceId: invite.from.deviceId,
    name: String(invite.from.name || "Family device").slice(0, 40),
    publicKey: invite.from.publicKey,
    sharedSecret,
    pairedAt: new Date().toISOString(),
    circleId: invite.circleId,
  };
  await store.putPeer(peer);
  const confirmation = {
    v: 1,
    kind: "plx-caregiver-accept",
    inviteId: invite.id,
    from: { deviceId: device.id, name: device.name, publicKey: device.publicKey },
    exchangePublicKey: exchange.publicKey,
  };
  return { status: "paired", peer: publicPeer(peer), confirmation, text: JSON.stringify(confirmation) };
}

async function completeAccept(store, device, accept) {
  const invite = await store.getInvite(accept.inviteId);
  if (!invite || !accept.from?.deviceId || !accept.exchangePublicKey) throw new Error("That confirmation is not valid");
  if (accept.from.deviceId === device.id) throw new Error("That confirmation is from this device");
  if (Date.parse(invite.expiresAt) < Date.now()) throw new Error("That invite has expired");
  const sharedSecret = deriveSharedSecret(invite.exchangeSecret, accept.exchangePublicKey);
  const peer = {
    deviceId: accept.from.deviceId,
    name: String(accept.from.name || "Family device").slice(0, 40),
    publicKey: accept.from.publicKey,
    sharedSecret,
    pairedAt: new Date().toISOString(),
    circleId: invite.circleId,
  };
  await store.putPeer(peer);
  return { status: "confirmed", peer: publicPeer(peer) };
}

function publicPeer(peer) {
  return { deviceId: peer.deviceId, name: peer.name, pairedAt: peer.pairedAt };
}

export async function listPeers(store) {
  return (await store.listPeers()).map(publicPeer);
}

export async function signHeartbeat(store) {
  const device = await ensureDevice(store);
  const heartbeat = {
    v: 1,
    deviceId: device.id,
    publicKey: device.publicKey,
    heads: await store.heads(),
    at: new Date().toISOString(),
  };
  return { heartbeat, signature: signJson(heartbeat, device.secretKey) };
}

export function verifyHeartbeat(signed) {
  if (!signed?.heartbeat?.publicKey) return false;
  return verifyJson(signed.heartbeat, signed.signature, signed.heartbeat.publicKey);
}

export async function exportSince(store, heads) {
  const rows = await store.packagesAfter(heads ?? {});
  return rows.map((row) => row.envelope);
}

export async function ingestMany(store, envelopes) {
  const accepted = [];
  const rejected = [];
  for (const envelope of envelopes) {
    try {
      await ingestOne(store, envelope);
      accepted.push(envelope.package.id);
    } catch (error) {
      rejected.push({ id: envelope?.package?.id ?? null, reason: error instanceof Error ? error.message : "Rejected" });
    }
  }
  return { accepted, rejected };
}

async function ingestOne(store, envelope) {
  const pkg = envelope?.package;
  if (!pkg || pkg.v !== 1) throw new Error("Invalid package");
  if (!verifyJson(pkg, envelope.signature, pkg.publicKey)) throw new Error("Bad signature");
  if (canonicalJson(envelope).length > MAX_PACKAGE_CHARS) throw new Error("Package is too large");
  const self = await store.getMeta("device.id");
  if (pkg.deviceId !== self) {
    const peer = await store.getPeer(pkg.deviceId);
    if (!peer || peer.publicKey !== pkg.publicKey) throw new Error("Device is not paired");
  } else if (pkg.publicKey !== (await store.getMeta("device.publicKey"))) {
    throw new Error("Key mismatch");
  }
  if (await store.hasPackage(pkg.id)) throw new Error("Replay");
  const expected = (await store.maxSeq(pkg.deviceId)) + 1;
  if (pkg.seq !== expected) throw new Error(pkg.seq < expected ? "Replay" : "Gap");
  if (!Array.isArray(pkg.ops) || pkg.ops.length === 0) throw new Error("Empty package");
  for (const op of pkg.ops) assertOp(op, pkg.deviceId);
  await store.putPackage({ id: pkg.id, deviceId: pkg.deviceId, seq: pkg.seq, envelope });
  for (const op of pkg.ops) await applyAndStore(store, op);
}

export async function heartbeatExchange(left, right) {
  const leftHeads = await left.heads();
  const rightHeads = await right.heads();
  const toRight = await exportSince(left, rightHeads);
  const toLeft = await exportSince(right, leftHeads);
  return {
    right: await ingestMany(right, toRight),
    left: await ingestMany(left, toLeft),
  };
}
