import { useCallback, useEffect, useState } from "react";
import { openSqliteStore } from "@/lib/db/sqlite";
import { acceptPayload, createInvite, createUpdates, ensureDevice, listPeers, readSharing, renameCircle, renameDevice, resolveAccess, setMemberAccess, setMemberRole, setRoleAccess } from "@/lib/mesh/repository.mjs";

export type CareRole = "parent" | "caregiver" | "family" | "viewer";
export type AccessLevel = "edit" | "view" | "none";
export type MemberAccess = "role" | AccessLevel;
export type LocalPeer = { deviceId: string; name: string; pairedAt: string; role: CareRole };
export type Sharing = {
  roles: Record<CareRole, { view: boolean; edit: boolean }>;
  members: Record<string, MemberAccess>;
};

type Status =
  | { phase: "loading" }
  | {
      phase: "ready";
      name: string;
      deviceId: string;
      circleName: string;
      role: CareRole;
      primary: boolean;
      peers: LocalPeer[];
      sharing: Sharing;
      mine: { view: boolean; edit: boolean };
    }
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
  const [updatesText, setUpdatesText] = useState<string | null>(null);
  const [notice, setNotice] = useState("Saved on this device. Nothing is sent to a server.");

  const refresh = useCallback(async () => {
    const db = await store();
    const device = await ensureDevice(db);
    const peers = await listPeers(db);
    const sharing = await readSharing(db);
    setStatus({
      phase: "ready",
      name: device.name,
      deviceId: device.id,
      circleName: device.circleName,
      role: device.role,
      primary: device.primary,
      peers,
      sharing,
      mine: resolveAccess(sharing, device.role, device.id),
    });
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

  const saveCircle = useCallback(
    async (name: string) => {
      const db = await store();
      await renameCircle(db, name);
      setNotice("Saved on this device. Nothing is sent to a server.");
      await refresh();
    },
    [refresh],
  );

  const saveRole = useCallback(
    async (deviceId: string, role: CareRole) => {
      const db = await store();
      await setMemberRole(db, deviceId, role);
      setNotice("Role saved on this device. Copy updates so the other device can catch up.");
      await refresh();
    },
    [refresh],
  );

  const saveRoleAccess = useCallback(
    async (role: CareRole, level: AccessLevel) => {
      const db = await store();
      await setRoleAccess(db, role, level);
      setNotice("Sharing saved on this device. Copy updates so the other device can catch up.");
      await refresh();
    },
    [refresh],
  );

  const saveMemberAccess = useCallback(
    async (deviceId: string, level: MemberAccess) => {
      const db = await store();
      await setMemberAccess(db, deviceId, level);
      setNotice("Sharing saved on this device. Copy updates so the other device can catch up.");
      await refresh();
    },
    [refresh],
  );

  const makeInvite = useCallback(async (role: CareRole) => {
    const db = await store();
    const created = await createInvite(db, role);
    setInviteText(created.text);
    setConfirmationText(null);
    setUpdatesText(null);
    setNotice("Invite ready. It expires in 7 days. Share it only with family.");
  }, []);

  const shareUpdates = useCallback(async () => {
    const db = await store();
    const updates = await createUpdates(db);
    setUpdatesText(updates.text);
    setNotice("Updates ready to paste on the other device.");
  }, []);

  const pair = useCallback(
    async (text: string) => {
      const db = await store();
      const result = await acceptPayload(db, text);
      if (result.status === "synced") {
        const count = result.accepted ?? 0;
        setNotice(count === 0 ? "Already up to date." : `Brought in ${count} update${count === 1 ? "" : "s"}.`);
        setUpdatesText(null);
      } else {
        setNotice(
          result.status === "paired"
            ? `Paired with ${result.peer.name}. Send the confirmation back so both devices finish.`
            : `Paired with ${result.peer.name}.`,
        );
        setConfirmationText(result.text ?? null);
        if (result.status === "confirmed") setInviteText(null);
      }
      await refresh();
    },
    [refresh],
  );

  return { status, notice, inviteText, confirmationText, updatesText, saveName, saveCircle, saveRole, saveRoleAccess, saveMemberAccess, makeInvite, shareUpdates, pair };
}
