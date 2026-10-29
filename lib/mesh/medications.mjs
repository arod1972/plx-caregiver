import { randomId } from "./codec.mjs";
import { listCollection, putFields, readDevice, readSharing, removeRecord, resolveAccess } from "./repository.mjs";

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

async function rights(store) {
  const device = await readDevice(store);
  if (!device) throw new Error("This device is not ready");
  return resolveAccess(await readSharing(store), device.role, device.id);
}

export function medicationOccurrences(med, fromMs, untilMs) {
  const match = TIME.exec(med?.time ?? med?.at_time ?? "");
  if (!match) return [];
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const times = [];
  const cursor = new Date(fromMs);
  cursor.setHours(0, 0, 0, 0);
  let guard = 0;
  while (cursor.getTime() < untilMs && times.length < 60 && guard < 70) {
    const at = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), hours, minutes, 0, 0).getTime();
    if (at >= fromMs && at < untilMs) times.push(at);
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return times;
}

export async function saveMedication(store, input) {
  if (!(await rights(store)).edit) throw new Error("You can't change medications from this device");
  const name = String(input?.name ?? "").trim();
  if (!name || name.length > 80) throw new Error("Use a name of 1 to 80 characters");
  const time = String(input?.time ?? "");
  if (!TIME.test(time)) throw new Error("Use a time like 08:00");
  const id = typeof input?.id === "string" && input.id.length >= 8 ? input.id : randomId();
  await putFields(store, "medication", id, { name, at_time: time });
  return { id, name, time };
}

export async function deleteMedication(store, id) {
  if (!(await rights(store)).edit) throw new Error("You can't change medications from this device");
  if (typeof id !== "string" || id.length < 8) throw new Error("That medication is not valid");
  await removeRecord(store, "medication", id);
}

export async function listMedications(store) {
  const access = await rights(store);
  if (!access.view && !access.edit) return [];
  const rows = [];
  for (const row of await listCollection(store, "medication")) {
    const name = String(row.name ?? "").trim();
    const time = String(row.at_time ?? "");
    if (!name || !TIME.test(time)) continue;
    rows.push({ id: row.id, name, time });
  }
  rows.sort((a, b) => a.time.localeCompare(b.time) || a.name.localeCompare(b.name));
  return rows;
}
