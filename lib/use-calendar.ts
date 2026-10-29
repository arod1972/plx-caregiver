import { useCallback, useEffect, useState } from "react";
import { careStore } from "@/lib/care-store";
import { deleteEvent, listUpcoming, nextReminderAt, saveEvent } from "@/lib/mesh/calendar.mjs";
import { ensureDevice, readDevice, readSharing, resolveAccess } from "@/lib/mesh/repository.mjs";
import { cancelReminder, remindEvent } from "@/lib/remind";

export type CalendarItem = {
  id: string;
  title: string;
  kind: "appointment" | "visit" | "date" | "med";
  startsAt: string;
  repeat: "none" | "weekly" | "monthly" | "daily";
  notes: string;
  allDay: boolean;
  occursAt: number;
};

type Phase = "loading" | "ready" | "error";

export function useCalendar() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [canView, setCanView] = useState(true);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    const db = await careStore();
    await ensureDevice(db);
    const device = await readDevice(db);
    if (!device) throw new Error("This device is not ready");
    const access = resolveAccess(await readSharing(db), device.role, device.id);
    setCanEdit(access.edit);
    setCanView(access.view || access.edit);
    setItems(access.view || access.edit ? await listUpcoming(db) : []);
    setPhase("ready");
  }, []);

  useEffect(() => {
    refresh().catch((error: unknown) => {
      setPhase("error");
      setMessage(error instanceof Error ? error.message : "The calendar could not be opened.");
    });
  }, [refresh]);

  const save = useCallback(
    async (input: {
      id?: string;
      title: string;
      kind: "appointment" | "visit" | "date";
      startsAt: string;
      repeat: "none" | "weekly" | "monthly";
      notes: string;
    }) => {
      const db = await careStore();
      const saved = await saveEvent(db, input);
      const when = nextReminderAt(saved);
      const reminded = when
        ? await Promise.race([
            remindEvent({ id: saved.id, title: saved.title, kind: saved.kind, at: when }),
            new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2000)),
          ])
        : false;
      setNotice(reminded ? "Saved. A reminder is set on this device." : "Saved on this device.");
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      const db = await careStore();
      await deleteEvent(db, id);
      await cancelReminder(id);
      setNotice("Removed from this device.");
      await refresh();
    },
    [refresh],
  );

  return { phase, message, items, canEdit, canView, notice, save, remove };
}
