import { randomId } from "./codec.mjs";
import { listCollection, listPeers, putFields, readDevice, readSharing, removeRecord, resolveAccess } from "./repository.mjs";

const STATUSES = new Set(["open", "assigned", "done"]);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

async function rights(store) {
  const device = await readDevice(store);
  if (!device) throw new Error("This device is not ready");
  return { device, access: resolveAccess(await readSharing(store), device.role, device.id) };
}

async function people(store, device) {
  const names = new Map([[device.id, device.name]]);
  for (const peer of await listPeers(store)) names.set(peer.deviceId, peer.name);
  return names;
}

function mapTask(row, names) {
  const status = STATUSES.has(row.status) ? row.status : "open";
  const assignee = String(row.assignee ?? "");
  return {
    id: row.id,
    title: String(row.title ?? ""),
    notes: String(row.notes ?? ""),
    assignee,
    assigneeName: assignee ? names.get(assignee) || "Someone in the circle" : "",
    status,
    dueOn: DATE.test(row.due_on ?? "") ? row.due_on : "",
    completedAt: String(row.completed_at ?? ""),
    completedBy: String(row.completed_by ?? ""),
    assignedAt: String(row.assigned_at ?? ""),
  };
}

export async function listCircle(store) {
  const device = await readDevice(store);
  if (!device) return [];
  const peers = await listPeers(store);
  return [{ id: device.id, name: device.name }, ...peers.map((peer) => ({ id: peer.deviceId, name: peer.name }))];
}

export async function listTasks(store) {
  const { device, access } = await rights(store);
  if (!access.view && !access.edit) return [];
  const names = await people(store, device);
  const rows = [];
  for (const row of await listCollection(store, "task")) {
    const title = String(row.title ?? "").trim();
    if (!title) continue;
    rows.push(mapTask({ ...row, title }, names));
  }
  rows.sort((a, b) => {
    const rank = (task) => (task.status === "done" ? 1 : 0);
    const byRank = rank(a) - rank(b);
    if (byRank) return byRank;
    if (a.status === "done") return (b.completedAt || "").localeCompare(a.completedAt || "") || a.title.localeCompare(b.title);
    const due = (a.dueOn || "9999-99-99").localeCompare(b.dueOn || "9999-99-99");
    if (due) return due;
    return a.title.localeCompare(b.title);
  });
  return rows;
}

export async function saveTask(store, input) {
  const { device, access } = await rights(store);
  if (!access.edit) throw new Error("You can't change tasks from this device");
  const title = String(input?.title ?? "").trim();
  if (!title || title.length > 80) throw new Error("Use a title of 1 to 80 characters");
  const notes = String(input?.notes ?? "").trim().slice(0, 280);
  const dueOn = String(input?.dueOn ?? "").trim();
  if (dueOn && !DATE.test(dueOn)) throw new Error("Use a date like 2026-11-03 or leave it blank");
  const assignee = String(input?.assignee ?? "").trim();
  const names = await people(store, device);
  if (assignee && !names.has(assignee)) throw new Error("Choose someone in the circle");
  const id = typeof input?.id === "string" && input.id.length >= 8 ? input.id : randomId();
  const existing = (await listCollection(store, "task")).find((row) => row.id === id);
  const wasDone = existing?.status === "done";
  const status = wasDone ? "done" : assignee ? "assigned" : "open";
  const now = new Date().toISOString();
  const assignedAt = status !== "assigned" ? "" : existing?.assignee === assignee && existing?.assigned_at ? existing.assigned_at : now;
  await putFields(store, "task", id, {
    title,
    notes,
    assignee: status === "open" ? "" : assignee,
    status,
    due_on: dueOn,
    completed_at: wasDone ? String(existing?.completed_at ?? "") : "",
    completed_by: wasDone ? String(existing?.completed_by ?? "") : "",
    assigned_at: assignedAt,
  });
  const saved = (await listTasks(store)).find((row) => row.id === id);
  return saved;
}

async function loadTask(store, id) {
  if (typeof id !== "string" || id.length < 8) throw new Error("That task is not valid");
  const row = (await listCollection(store, "task")).find((item) => item.id === id);
  if (!row) throw new Error("That task is not here");
  return row;
}

export async function completeTask(store, id) {
  const { device, access } = await rights(store);
  if (!access.view && !access.edit) throw new Error("You can't change tasks from this device");
  const row = await loadTask(store, id);
  const assignee = String(row.assignee ?? "");
  if (!access.edit && assignee !== device.id) throw new Error("You can't change tasks from this device");
  if (row.status === "done") return (await listTasks(store)).find((item) => item.id === id);
  const now = new Date().toISOString();
  await putFields(store, "task", id, { status: "done", completed_at: now, completed_by: device.id });
  return (await listTasks(store)).find((item) => item.id === id);
}

export async function reopenTask(store, id) {
  const { access } = await rights(store);
  if (!access.edit) throw new Error("You can't change tasks from this device");
  await loadTask(store, id);
  await putFields(store, "task", id, {
    status: "open",
    assignee: "",
    assigned_at: "",
    completed_at: "",
    completed_by: "",
  });
  return (await listTasks(store)).find((item) => item.id === id);
}

export async function removeTask(store, id) {
  const { access } = await rights(store);
  if (!access.edit) throw new Error("You can't change tasks from this device");
  const row = await loadTask(store, id);
  if (row.status === "done") throw new Error("Done tasks stay in the history");
  await removeRecord(store, "task", id);
}
