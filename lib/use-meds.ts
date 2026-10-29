import { useCallback, useEffect, useState } from "react";
import { careStore } from "@/lib/care-store";
import { deleteMedication, listMedications, saveMedication } from "@/lib/mesh/medications.mjs";
import { ensureDevice, readDevice, readSharing, resolveAccess } from "@/lib/mesh/repository.mjs";

export type MedicationItem = { id: string; name: string; time: string };

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
    setCanEdit(access.edit);
    setCanView(access.view || access.edit);
    setItems(await listMedications(db));
    setPhase("ready");
  }, []);

  useEffect(() => {
    refresh().catch((error: unknown) => {
      setPhase("error");
      setMessage(error instanceof Error ? error.message : "Medications could not be opened.");
    });
  }, [refresh]);

  const save = useCallback(
    async (input: { id?: string; name: string; time: string }) => {
      const db = await careStore();
      await saveMedication(db, input);
      setNotice("Saved on this device. It is on the calendar.");
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      const db = await careStore();
      await deleteMedication(db, id);
      setNotice("Removed from this device.");
      await refresh();
    },
    [refresh],
  );

  return { phase, message, items, canEdit, canView, notice, save, remove };
}
