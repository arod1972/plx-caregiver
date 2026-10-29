import { cleanSnapshot } from "./summary.mjs";
import { ensureDevice, putFields, readSharing, resolveAccess } from "../mesh/repository.mjs";

const CONSENT = "health.consent";
const SHARE = "health.share";
const CACHE = "health.cache";

export async function readHealthState(store) {
  const consent = await store.getMeta(CONSENT);
  const raw = await store.getMeta(CACHE);
  return {
    consent: consent === "allowed" || consent === "declined" ? consent : "unknown",
    share: (await store.getMeta(SHARE)) === "1",
    cache: parseCache(raw),
  };
}

export async function setHealthConsent(store, consent) {
  if (consent !== "allowed" && consent !== "declined") throw new Error("Choose whether to allow Apple Health");
  await ensureDevice(store);
  await store.setMeta(CONSENT, consent);
  if (consent === "declined") {
    await store.setMeta(CACHE, "");
    await store.setMeta(SHARE, "0");
    await retractSummary(store);
  }
}

export async function rememberReading(store, snapshot) {
  if ((await store.getMeta(CONSENT)) !== "allowed") throw new Error("Apple Health is not allowed on this device");
  const clean = cleanSnapshot(snapshot);
  await store.setMeta(CACHE, JSON.stringify(clean));
  if ((await store.getMeta(SHARE)) === "1") await publishSummary(store, clean);
  return clean;
}

export async function setHealthShare(store, on) {
  await ensureDevice(store);
  if (on) {
    const device = await ensureDevice(store);
    const access = resolveAccess(await readSharing(store), device.role, device.id);
    if (!access.edit) throw new Error("You can't share Apple Health from this device");
    const cache = parseCache(await store.getMeta(CACHE));
    if (!cache) throw new Error("Read Apple Health before sharing a summary");
    await store.setMeta(SHARE, "1");
    await publishSummary(store, cache);
    return;
  }
  await store.setMeta(SHARE, "0");
  await retractSummary(store);
}

async function publishSummary(store, snapshot) {
  const device = await ensureDevice(store);
  const access = resolveAccess(await readSharing(store), device.role, device.id);
  if (!access.edit) throw new Error("You can't share Apple Health from this device");
  await putFields(store, "health_summary", summaryId(device.id), {
    day: snapshot.day,
    steps: snapshot.steps,
    heart_rate: snapshot.heartRate,
    sleep_minutes: snapshot.sleepMinutes,
    read_at: snapshot.readAt,
  });
}

async function retractSummary(store) {
  const device = await ensureDevice(store);
  const id = summaryId(device.id);
  const existing = await store.getRecord(id);
  if (!existing || existing.deleted) return;
  await putFields(store, "health_summary", id, { _deleted: true });
}

function summaryId(deviceId) {
  return `health-${deviceId}`;
}

function parseCache(raw) {
  if (!raw) return null;
  try {
    return cleanSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}
