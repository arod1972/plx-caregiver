import assert from "node:assert/strict";
import test from "node:test";
import { acceptPayload, createInvite, createUpdates, ensureDevice, listCollection, readDevice, setRoleAccess } from "./repository.mjs";
import { createMemoryStore } from "./store.mjs";
import { completeTask, listTasks, removeTask, reopenTask, saveTask } from "./tasks.mjs";

async function pair(left, right) {
  const invite = await createInvite(left);
  const accepted = await acceptPayload(right, invite.text);
  await acceptPayload(left, accepted.text);
}

test("tasks assign, complete, and sync with history kept", async () => {
  const ada = createMemoryStore();
  const ben = createMemoryStore();
  await ensureDevice(ada, "Ada");
  await ensureDevice(ben, "Ben");
  await pair(ada, ben);
  const benId = (await readDevice(ben)).id;
  const open = await saveTask(ada, { title: "Pick up the prescription", notes: "Pharmacy on Main", dueOn: "2026-11-03" });
  assert.equal(open.status, "open");
  assert.equal(open.assignee, "");
  const assigned = await saveTask(ada, { ...open, assignee: benId });
  assert.equal(assigned.id, open.id);
  assert.equal(assigned.status, "assigned");
  assert.equal(assigned.assigneeName, "Ben");

  const synced = await acceptPayload(ben, (await createUpdates(ada)).text);
  assert.equal(synced.status, "synced");
  const onBen = await listTasks(ben);
  assert.equal(onBen.length, 1);
  assert.equal(onBen[0].title, "Pick up the prescription");
  assert.equal(onBen[0].assignee, benId);

  await setRoleAccess(ada, "family", "view");
  await acceptPayload(ben, (await createUpdates(ada)).text);
  await assert.rejects(() => saveTask(ben, { title: "Another" }), /tasks/);
  const done = await completeTask(ben, assigned.id);
  assert.equal(done.status, "done");
  assert.ok(done.completedAt);
  await acceptPayload(ada, (await createUpdates(ben)).text);
  const history = await listTasks(ada);
  assert.equal(history.length, 1);
  assert.equal(history[0].status, "done");
  await assert.rejects(() => removeTask(ada, assigned.id), /history/);
  const again = await reopenTask(ada, assigned.id);
  assert.equal(again.status, "open");
});

test("a device without access cannot see tasks", async () => {
  const ada = createMemoryStore();
  await ensureDevice(ada, "Ada");
  await saveTask(ada, { title: "Call the clinic" });
  await setRoleAccess(ada, "caregiver", "none");
  assert.deepEqual(await listTasks(ada), []);
  await assert.rejects(() => saveTask(ada, { title: "Another" }), /tasks/);
});
