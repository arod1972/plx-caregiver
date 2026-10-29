const ASLEEP = new Set([1, 3, 4, 5]);

export function summarizeHealth({ steps = [], heart = [], sleep = [], now = new Date() }) {
  const stepValues = steps.map((item) => Number(item?.value)).filter((value) => Number.isFinite(value) && value >= 0);
  const latestHeart = [...heart]
    .filter((item) => Number.isFinite(Number(item?.value)) && Number(item.value) >= 0)
    .sort((a, b) => String(b?.end ?? "").localeCompare(String(a?.end ?? "")))[0];
  let sleepMs = 0;
  let asleep = false;
  for (const item of sleep) {
    if (!ASLEEP.has(Number(item?.value))) continue;
    const start = new Date(item.start).getTime();
    const end = new Date(item.end).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    asleep = true;
    sleepMs += end - start;
  }
  return {
    day: dayKey(now),
    steps: stepValues.length ? Math.round(stepValues.reduce((sum, value) => sum + value, 0)) : null,
    heartRate: latestHeart ? Math.round(Number(latestHeart.value)) : null,
    sleepMinutes: asleep ? Math.round(sleepMs / 60000) : null,
    readAt: now.toISOString(),
  };
}

export function dayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatSteps(value) {
  if (value == null) return "Not read";
  const steps = Math.round(value);
  return steps === 1 ? "1 step today" : `${steps.toLocaleString("en-US")} steps today`;
}

export function formatHeart(value) {
  if (value == null) return "Not read";
  return `${Math.round(value)} beats per minute`;
}

export function formatSleep(value) {
  if (value == null) return "Not read";
  const minutes = Math.max(0, Math.round(value));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} minutes asleep`;
  if (rest === 0) return hours === 1 ? "1 hour asleep" : `${hours} hours asleep`;
  return `${hours} hours ${rest} minutes asleep`;
}

export function assertPulse(value) {
  const text = String(value ?? "").trim();
  if (!/^\d{2,3}$/.test(text)) throw new Error("Use a pulse between 30 and 220");
  const pulse = Number(text);
  if (pulse < 30 || pulse > 220) throw new Error("Use a pulse between 30 and 220");
  return pulse;
}

export function cleanSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") throw new Error("That reading is not valid");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshot.day)) throw new Error("That reading is not valid");
  const readAt = new Date(snapshot.readAt);
  if (Number.isNaN(readAt.getTime())) throw new Error("That reading is not valid");
  return {
    day: snapshot.day,
    steps: finiteOrNull(snapshot.steps),
    heartRate: finiteOrNull(snapshot.heartRate),
    sleepMinutes: finiteOrNull(snapshot.sleepMinutes),
    readAt: readAt.toISOString(),
  };
}

function finiteOrNull(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1_000_000) throw new Error("That reading is not valid");
  return Math.round(number);
}
