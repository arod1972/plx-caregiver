import { randomId } from "./codec.mjs";
import { listCollection, putFields, readDevice, readSharing, removeRecord, resolveAccess } from "./repository.mjs";

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

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
  const dosage = String(input?.dosage ?? "").trim();
  if (!dosage || dosage.length > 40) throw new Error("Use a dosage of 1 to 40 characters");
  const refillOn = String(input?.refillOn ?? "").trim();
  if (refillOn && !DATE.test(refillOn)) throw new Error("Use a refill date like 2026-12-01 or leave it blank");
  const id = typeof input?.id === "string" && input.id.length >= 8 ? input.id : randomId();
  await putFields(store, "medication", id, { name, at_time: time, dosage, refill_on: refillOn });
  return { id, name, time, dosage, refillOn };
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
    rows.push({
      id: row.id,
      name,
      time,
      dosage: String(row.dosage ?? "").trim(),
      refillOn: DATE.test(row.refill_on ?? "") ? row.refill_on : "",
    });
  }
  rows.sort((a, b) => a.time.localeCompare(b.time) || a.name.localeCompare(b.name));
  return rows;
}

export function nextDoseAt(time, now = new Date()) {
  const match = TIME.exec(time ?? "");
  if (!match) return null;
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(match[1]), Number(match[2]), 0, 0);
  if (at.getTime() <= now.getTime()) at.setDate(at.getDate() + 1);
  return at.getTime();
}

function dayStamp(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function daysBack(now, count) {
  const days = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    days.push(dayStamp(date));
  }
  return days;
}

function doseId(medId, onDate) {
  return `dose${medId}${onDate.replace(/-/g, "")}`;
}

export async function clearTaken(store, medId, now = new Date()) {
  const access = await rights(store);
  if (!access.edit) throw new Error("You can't change medications from this device");
  const med = (await listMedications(store)).find((item) => item.id === medId);
  if (!med) throw new Error("That medication is not here");
  const id = doseId(medId, dayStamp(now));
  const existing = (await listCollection(store, "dose")).find((dose) => dose.id === id);
  if (existing) await removeRecord(store, "dose", id);
  return adherence(store, now).then((rows) => rows.find((item) => item.id === medId));
}

export async function markTaken(store, medId, now = new Date()) {
  const access = await rights(store);
  if (!access.edit) throw new Error("You can't change medications from this device");
  const med = (await listMedications(store)).find((item) => item.id === medId);
  if (!med) throw new Error("That medication is not here");
  const device = await readDevice(store);
  const onDate = dayStamp(now);
  await putFields(store, "dose", doseId(medId, onDate), {
    med_id: medId,
    on_date: onDate,
    taken_at: now.toISOString(),
    taken_by: device.id,
  });
  return adherence(store, now).then((rows) => rows.find((item) => item.id === medId));
}

export async function adherence(store, now = new Date()) {
  const meds = await listMedications(store);
  const doses = await listCollection(store, "dose");
  const today = dayStamp(now);
  const week = daysBack(now, 7);
  return meds.map((med) => {
    const rows = doses.filter((dose) => dose.med_id === med.id && week.includes(dose.on_date));
    const todayRow = rows.find((dose) => dose.on_date === today);
    return {
      ...med,
      taken: Boolean(todayRow),
      takenAt: String(todayRow?.taken_at ?? ""),
      weekTaken: new Set(rows.map((dose) => dose.on_date)).size,
      weekDays: 7,
    };
  });
}
