import assert from "node:assert/strict";
import test from "node:test";
import { acceptPayload, createInvite, createUpdates, ensureDevice, setRoleAccess } from "./repository.mjs";
import { createMemoryStore } from "./store.mjs";
import { addPost, listPosts } from "./posts.mjs";

async function pair(left, right) {
  const invite = await createInvite(left);
  const accepted = await acceptPayload(right, invite.text);
  await acceptPayload(left, accepted.text);
}

test("family updates sync and stay inside the circle", async () => {
  const ada = createMemoryStore();
  const ben = createMemoryStore();
  await ensureDevice(ada, "Ada");
  await ensureDevice(ben, "Ben");
  await pair(ada, ben);
  const post = await addPost(ada, "Clinic went well. Next visit is Thursday.");
  assert.equal(post.authorName, "Ada");
  await acceptPayload(ben, (await createUpdates(ada)).text);
  const seen = await listPosts(ben);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].body, "Clinic went well. Next visit is Thursday.");
  const reply = await addPost(ben, "I can drive.");
  await acceptPayload(ada, (await createUpdates(ben)).text);
  const thread = await listPosts(ada);
  assert.equal(thread.length, 2);
  assert.equal(thread[1].body, "I can drive.");
  assert.equal(reply.authorName, "Ben");
});

test("a device without access cannot read or post updates", async () => {
  const ada = createMemoryStore();
  await ensureDevice(ada, "Ada");
  await addPost(ada, "Private note");
  await setRoleAccess(ada, "caregiver", "none");
  assert.deepEqual(await listPosts(ada), []);
  await assert.rejects(() => addPost(ada, "Another"), /post/);
});
