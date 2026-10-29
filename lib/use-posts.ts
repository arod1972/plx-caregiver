import { useCallback, useEffect, useState } from "react";
import { careStore } from "@/lib/care-store";
import { addPost, listPosts } from "@/lib/mesh/posts.mjs";
import { ensureDevice, readDevice, readSharing, resolveAccess } from "@/lib/mesh/repository.mjs";
import { notifyPost } from "@/lib/remind";

export type PostItem = { id: string; body: string; authorId: string; authorName: string; sentAt: string };

type Phase = "loading" | "ready" | "error";

export function usePosts() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<PostItem[]>([]);
  const [me, setMe] = useState("");
  const [canRead, setCanRead] = useState(true);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    const db = await careStore();
    await ensureDevice(db);
    const device = await readDevice(db);
    if (!device) throw new Error("This device is not ready");
    const access = resolveAccess(await readSharing(db), device.role, device.id);
    const posts = access.view || access.edit ? await listPosts(db) : [];
    setMe(device.id);
    setCanRead(access.view || access.edit);
    setItems(posts);
    setPhase("ready");
    const incoming = posts.filter((post) => post.authorId && post.authorId !== device.id);
    if (incoming.length) {
      void Promise.race([
        Promise.all(incoming.map((post) => notifyPost({ id: post.id, title: post.authorName, body: post.body }))),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    }
  }, []);

  useEffect(() => {
    refresh().catch((error: unknown) => {
      setPhase("error");
      setMessage(error instanceof Error ? error.message : "Updates could not be opened.");
    });
  }, [refresh]);

  const send = useCallback(
    async (body: string) => {
      const db = await careStore();
      await addPost(db, body);
      setNotice("Posted on this device.");
      await refresh();
    },
    [refresh],
  );

  return { phase, message, items, me, canRead, notice, send };
}
