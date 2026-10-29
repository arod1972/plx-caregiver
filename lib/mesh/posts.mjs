import { randomId } from "./codec.mjs";
import { listCollection, putFields, readDevice, readSharing, resolveAccess } from "./repository.mjs";

async function rights(store) {
  const device = await readDevice(store);
  if (!device) throw new Error("This device is not ready");
  return { device, access: resolveAccess(await readSharing(store), device.role, device.id) };
}

export async function listPosts(store) {
  const { access } = await rights(store);
  if (!access.view && !access.edit) return [];
  const rows = [];
  for (const row of await listCollection(store, "post")) {
    const body = String(row.body ?? "").trim();
    if (!body) continue;
    rows.push({
      id: row.id,
      body,
      authorId: String(row.author_id ?? ""),
      authorName: String(row.author_name ?? "Someone in the circle"),
      sentAt: String(row.sent_at ?? ""),
    });
  }
  rows.sort((a, b) => a.sentAt.localeCompare(b.sentAt) || a.id.localeCompare(b.id));
  return rows;
}

export async function addPost(store, body) {
  const { device, access } = await rights(store);
  if (!access.view && !access.edit) throw new Error("You can't post from this device");
  const text = String(body ?? "").trim();
  if (!text || text.length > 500) throw new Error("Use a note of 1 to 500 characters");
  const id = randomId();
  const sentAt = new Date().toISOString();
  await putFields(store, "post", id, {
    body: text,
    author_id: device.id,
    author_name: device.name,
    sent_at: sentAt,
  });
  return { id, body: text, authorId: device.id, authorName: device.name, sentAt };
}
