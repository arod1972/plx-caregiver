import { randomId } from "./codec.mjs";
import { listCollection, putFields, readDevice, readSharing, removeRecord, resolveAccess } from "./repository.mjs";
import { listMedications, medicationOccurrences } from "./medications.mjs";

const KINDS = new Set(["appointment", "visit", "date"]);
const REPEATS = new Set(["none", "weekly", "monthly"]);

async function rights(store) {
  const device = await readDevice(store);
  if (!device) throw new Error("This device is not ready");
  const sharing = await readSharing(store);
  return resolveAccess(sharing, device.role, device.id);
}

export function localStarts(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) throw new Error("Use a date like 2026-11-03");
  const clock = time || "09:00";
  if (!/^\d{2}:\d{2}$/.test(clock)) throw new Error("Use a time like 09:00");
  const parsed = new Date(`${date}T${clock}`);
  if (Number.isNaN(parsed.getTime())) throw new Error("Choose a date and time");
  return parsed.toISOString();
}

export async function saveEvent(store, input) {
  if (!(await rights(store)).edit) throw new Error("You can't change the calendar from this device");
  const title = String(input?.title ?? "").trim();
  if (!title || title.length > 80) throw new Error("Use a title of 1 to 80 characters");
  if (!KINDS.has(input?.kind)) throw new Error("Choose what kind of event this is");
  const repeat = input?.repeat ?? "none";
  if (!REPEATS.has(repeat)) throw new Error("Choose how often it repeats");
  const starts = new Date(input?.startsAt);
  if (Number.isNaN(starts.getTime())) throw new Error("Choose a date and time");
  const id = typeof input?.id === "string" && input.id.length >= 8 ? input.id : randomId();
  const notes = String(input?.notes ?? "").trim().slice(0, 280);
  await putFields(store, "event", id, {
    title,
    kind: input.kind,
    starts_at: starts.toISOString(),
    repeat,
    notes,
    all_day: input.kind === "date",
  });
  return { id, title, kind: input.kind, startsAt: starts.toISOString(), repeat, notes, allDay: input.kind === "date" };
}

export async function deleteEvent(store, id) {
  if (!(await rights(store)).edit) throw new Error("You can't change the calendar from this device");
  if (typeof id !== "string" || id.length < 8) throw new Error("That event is not valid");
  await removeRecord(store, "event", id);
}

function addDays(ms, days) {
  const date = new Date(ms);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

function addMonth(ms, originalMs) {
  const original = new Date(originalMs);
  const current = new Date(ms);
  const next = new Date(current.getFullYear(), current.getMonth() + 1, 1, original.getHours(), original.getMinutes(), 0, 0);
  const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(original.getDate(), last));
  return next.getTime();
}

export function occursBetween(event, fromMs, untilMs) {
  const start = Date.parse(event.startsAt ?? event.starts_at);
  if (Number.isNaN(start)) return [];
  const repeat = event.repeat || "none";
  if (repeat === "none") return start >= fromMs && start < untilMs ? [start] : [];
  const times = [];
  let cursor = start;
  let guard = 0;
  while (cursor < fromMs && guard < 520) {
    cursor = repeat === "weekly" ? addDays(cursor, 7) : addMonth(cursor, start);
    guard += 1;
  }
  while (cursor < untilMs && times.length < 12 && guard < 560) {
    if (cursor >= fromMs) times.push(cursor);
    const next = repeat === "weekly" ? addDays(cursor, 7) : addMonth(cursor, start);
    if (next <= cursor) break;
    cursor = next;
    guard += 1;
  }
  return times;
}

export function upcomingWindow(now = new Date()) {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return { from, until: addDays(from, 60) };
}

export async function listUpcoming(store, now = new Date()) {
  const access = await rights(store);
  if (!access.view && !access.edit) return [];
  const { from, until } = upcomingWindow(now);
  const items = [];
  for (const row of await listCollection(store, "event")) {
    const event = {
      id: row.id,
      title: String(row.title ?? ""),
      kind: row.kind === "visit" || row.kind === "date" ? row.kind : "appointment",
      startsAt: row.starts_at,
      repeat: row.repeat === "weekly" || row.repeat === "monthly" ? row.repeat : "none",
      notes: String(row.notes ?? ""),
      allDay: Boolean(row.all_day),
    };
    for (const occursAt of occursBetween(event, from, until)) items.push({ ...event, occursAt });
  }
  for (const med of await listMedications(store)) {
    for (const occursAt of medicationOccurrences(med, from, until)) {
      items.push({
        id: med.id,
        title: med.name,
        kind: "med",
        startsAt: new Date(occursAt).toISOString(),
        repeat: "daily",
        notes: "",
        allDay: false,
        occursAt,
      });
    }
  }
  items.sort((a, b) => a.occursAt - b.occursAt || a.title.localeCompare(b.title));
  return items;
}

export function nextReminderAt(event, now = Date.now()) {
  const start = Date.parse(event.startsAt ?? event.starts_at);
  if (Number.isNaN(start)) return null;
  if ((event.repeat || "none") === "none") return start > now ? start : null;
  return occursBetween(event, now + 1, addDays(now, 120))[0] ?? null;
}
