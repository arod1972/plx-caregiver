import { useCallback, useEffect, useState } from "react";
import { careStore } from "@/lib/care-store";
import { ensureDevice, readDevice, readSharing, resolveAccess } from "@/lib/mesh/repository.mjs";
import { completeTask, listCircle, listTasks, removeTask, reopenTask, saveTask } from "@/lib/mesh/tasks.mjs";
import { clearAssignmentNotice, notifyAssignment } from "@/lib/remind";

export type TaskItem = {
  id: string;
  title: string;
  notes: string;
  assignee: string;
  assigneeName: string;
  status: "open" | "assigned" | "done";
  dueOn: string;
  completedAt: string;
  completedBy: string;
  assignedAt: string;
};

type Phase = "loading" | "ready" | "error";

export function useTasks() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<TaskItem[]>([]);
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [me, setMe] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [canView, setCanView] = useState(true);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    const db = await careStore();
    await ensureDevice(db);
    const device = await readDevice(db);
    if (!device) throw new Error("This device is not ready");
    const access = resolveAccess(await readSharing(db), device.role, device.id);
    const tasks = access.view || access.edit ? await listTasks(db) : [];
    setMe(device.id);
    setPeople(await listCircle(db));
    setCanEdit(access.edit);
    setCanView(access.view || access.edit);
    setItems(tasks);
    setPhase("ready");
    const mine = tasks.filter((task) => task.status === "assigned" && task.assignee === device.id && task.assignedAt);
    if (mine.length) {
      void Promise.race([
        Promise.all(mine.map((task) => notifyAssignment({ id: task.id, title: task.title, stamp: task.assignedAt }))),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    }
  }, []);

  useEffect(() => {
    refresh().catch((error: unknown) => {
      setPhase("error");
      setMessage(error instanceof Error ? error.message : "Tasks could not be opened.");
    });
  }, [refresh]);

  const save = useCallback(
    async (input: { id?: string; title: string; notes: string; assignee: string; dueOn: string }) => {
      const db = await careStore();
      await saveTask(db, input);
      setNotice("Saved on this device.");
      await refresh();
    },
    [refresh],
  );

  const complete = useCallback(
    async (id: string) => {
      const db = await careStore();
      await completeTask(db, id);
      await clearAssignmentNotice(id);
      setNotice("Marked done on this device.");
      await refresh();
    },
    [refresh],
  );

  const reopen = useCallback(
    async (id: string) => {
      const db = await careStore();
      await reopenTask(db, id);
      setNotice("Reopened on this device.");
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      const db = await careStore();
      await removeTask(db, id);
      await clearAssignmentNotice(id);
      setNotice("Removed from this device.");
      await refresh();
    },
    [refresh],
  );

  return { phase, message, items, people, me, canEdit, canView, notice, save, complete, reopen, remove };
}
