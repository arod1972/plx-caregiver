import { useCallback, useEffect, useState } from "react";
import { openSqliteStore } from "@/lib/db/sqlite";
import { acceptPayload, createInvite, ensureDevice, listPeers, renameDevice } from "@/lib/mesh/repository.mjs";

export type LocalPeer = { deviceId: string; name: string; pairedAt: string };

type Status =
  | { phase: "loading" }
  | { phase: "ready"; name: string; deviceId: string; peers: LocalPeer[] }
  | { phase: "error"; message: string };

let storePromise: ReturnType<typeof openSqliteStore> | null = null;

function store() {
  storePromise ??= openSqliteStore();
  return storePromise;
}

export function useLocalCare() {
  const [status, setStatus] = useState<Status>({ phase: "loading" });
  const [inviteText, setInviteText] = useState<string | null>(null);
  const [confirmationText, setConfirmationText] = useState<string | null>(null);
  const [notice, setNotice] = useState("Saved on this device. Nothing is sent to a server.");

  const refresh = useCallback(async () => {
    const db = await store();
    const device = await ensureDevice(db);
    const peers = await listPeers(db);
    setStatus({ phase: "ready", name: device.name, deviceId: device.id, peers });
  }, []);

  useEffect(() => {
    refresh().catch((error: unknown) => {
      setStatus({ phase: "error", message: error instanceof Error ? error.message : "This device could not be opened." });
    });
  }, [refresh]);

  const saveName = useCallback(
    async (name: string) => {
      const db = await store();
      await renameDevice(db, name);
      setNotice("Saved on this device. Nothing is sent to a server.");
      await refresh();
    },
    [refresh],
  );

  const makeInvite = useCallback(async () => {
    const db = await store();
    const created = await createInvite(db);
    setInviteText(created.text);
    setConfirmationText(null);
    setNotice("Invite ready. It expires in 7 days. Share it only with family.");
  }, []);

  const pair = useCallback(
    async (text: string) => {
      const db = await store();
      const result = await acceptPayload(db, text);
      setNotice(
        result.status === "paired"
          ? `Paired with ${result.peer.name}. Send the confirmation back so both devices finish.`
          : `Paired with ${result.peer.name}.`,
      );
      setConfirmationText(result.text ?? null);
      if (result.status === "confirmed") setInviteText(null);
      await refresh();
    },
    [refresh],
  );

  return { status, notice, inviteText, confirmationText, saveName, makeInvite, pair };
}
