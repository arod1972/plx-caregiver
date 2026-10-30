import { useCallback, useEffect, useState } from "react";
import { careStore } from "@/lib/care-store";
import { adherence, clearTaken, deleteMedication, nextDoseAt, saveMedication, markTaken } from "@/lib/mesh/medications.mjs";
import { ensureDevice, readDevice, readSharing, resolveAccess } from "@/lib/mesh/repository.mjs";
import { clearDoseReminder, remindDose } from "@/lib/remind";

export type MedicationItem = {
  id: string;
  name: string;
  time: string;
  dosage: string;
  refillOn: string;
  taken: boolean;
  takenAt: string;
  weekTaken: number;
  weekDays: number;
};

type Phase = "loading" | "ready" | "error";

export function useMeds() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<MedicationItem[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [canView, setCanView] = useState(true);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    const db = await careStore();
    await ensureDevice(db);
    const device = await readDevice(db);
    if (!device) throw new Error("This device is not ready");
    const access = resolveAccess(await readSharing(db), device.role, device.id);
    const rows = access.view || access.edit ? await adherence(db) : [];
    setCanEdit(access.edit);
    setCanView(access.view || access.edit);
    setItems(rows);
    setPhase("ready");
    const upcoming = rows
      .map((item) => ({ id: item.id, name: item.name, at: nextDoseAt(item.time) }))
      .filter((item): item is { id: string; name: string; at: number } => typeof item.at === "number");
    if (upcoming.length) {
      void Promise.race([
        Promise.all(upcoming.map((item) => remindDose(item))),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    }
  }, []);

  useEffect(() => {
    refresh().catch((error: unknown) => {
      setPhase("error");
      setMessage(error instanceof Error ? error.message : "Medications could not be opened.");
    });
  }, [refresh]);

  const save = useCallback(
    async (input: { id?: string; name: string; time: string; dosage: string; refillOn: string }) => {
      const db = await careStore();
      await saveMedication(db, input);
      setNotice("Saved on this device. A reminder is set for the next dose.");
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      const db = await careStore();
      await deleteMedication(db, id);
      await clearDoseReminder(id);
      setNotice("Removed from this device.");
      await refresh();
    },
    [refresh],
  );

  const take = useCallback(
    async (id: string) => {
      const db = await careStore();
      await markTaken(db, id);
      setNotice("Marked taken on this device.");
      await refresh();
    },
    [refresh],
  );

  const untake = useCallback(
    async (id: string) => {
      const db = await careStore();
      await clearTaken(db, id);
      setNotice("Marked not taken on this device.");
      await refresh();
    },
    [refresh],
  );

  return { phase, message, items, canEdit, canView, notice, save, remove, take, untake };
}
