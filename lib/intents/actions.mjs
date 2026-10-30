import { adherence, markTaken } from "../mesh/medications.mjs";
import { matchLabel } from "../scan/match.mjs";

export const handsOffPhrases = [
  "Mark the medication taken in PrimaLux Care",
  "Mark Lisinopril taken in PrimaLux Care",
  "What is the next medication in PrimaLux Care",
  "What is the care status in PrimaLux Care",
];

export function clockLabel(time) {
  const [hours, minutes] = String(time ?? "").split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return String(time ?? "");
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(2026, 0, 1, hours, minutes));
}

export function pickNext(items, now = new Date()) {
  if (!items?.length) return null;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const sorted = [...items].sort((a, b) => a.time.localeCompare(b.time) || a.name.localeCompare(b.name));
  return (
    sorted.find((item) => !item.taken && minutes(item.time) >= nowMinutes) ??
    sorted.find((item) => !item.taken) ??
    sorted.find((item) => minutes(item.time) >= nowMinutes) ??
    sorted[0]
  );
}

export async function runIntent(store, name, params = {}, now = new Date()) {
  const items = await adherence(store, now);
  if (name === "markDoseTaken") return markDose(store, items, params, now);
  if (name === "nextMedication") return { spoken: describeNext(items, now) };
  if (name === "careStatus") return { spoken: describeStatus(items, now) };
  return { spoken: "That action is not available." };
}

async function markDose(store, items, params, now) {
  const spokenName = typeof params?.medication === "string" ? params.medication.trim() : "";
  const target = spokenName ? matchNamed(items, spokenName) : pickNext(items.filter((item) => !item.taken), now);
  if (!target) return { spoken: spokenName ? "No saved medication matches that name." : "There is no medication to mark." };
  if (!target.taken) {
    try {
      await markTaken(store, target.id, now);
    } catch (error) {
      return { spoken: error instanceof Error ? error.message : "The dose could not be marked." };
    }
  }
  return { spoken: `${target.name} is marked taken.`, id: target.id };
}

function matchNamed(items, spokenName) {
  const hit = matchLabel(spokenName, items);
  return hit ? items.find((item) => item.id === hit.id) ?? null : null;
}

function describeNext(items, now) {
  const next = pickNext(items, now);
  if (!next) return "No medications are saved.";
  const dose = next.dosage ? `${next.dosage}, ` : "";
  const state = next.taken ? "Taken today." : "Not taken yet.";
  return `Next is ${next.name}, ${dose}at ${clockLabel(next.time)}. ${state}`;
}

function describeStatus(items, now) {
  if (!items.length) return "No medications are saved.";
  const waiting = items.filter((item) => !item.taken);
  if (!waiting.length) return "Today's medications are taken.";
  const next = pickNext(waiting, now) ?? waiting[0];
  const count = waiting.length === 1 ? "1 medication is not taken yet." : `${waiting.length} medications are not taken yet.`;
  return `${count} Next is ${next.name} at ${clockLabel(next.time)}.`;
}

function minutes(time) {
  const [hours, mins] = String(time ?? "").split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(mins)) return 0;
  return hours * 60 + mins;
}
