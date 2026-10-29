import { useCallback, useEffect, useState } from "react";

import { careStore } from "@/lib/care-store";
import { healthBridge } from "@/lib/health/native";
import { readHealthState, rememberReading, setHealthConsent, setHealthShare, type HealthConsent } from "@/lib/health/local.mjs";
import type { HealthSnapshot } from "@/lib/health/summary.mjs";
import { ensureDevice, readSharing, resolveAccess } from "@/lib/mesh/repository.mjs";

export type HealthPhase =
  | { phase: "loading" }
  | {
      phase: "ready";
      available: boolean;
      consent: HealthConsent;
      share: boolean;
      canEdit: boolean;
      cache: HealthSnapshot | null;
      notice: string | null;
    }
  | { phase: "error"; message: string };

export function useHealth() {
  const [status, setStatus] = useState<HealthPhase>({ phase: "loading" });

  const refresh = useCallback(async (notice?: string | null) => {
    const db = await careStore();
    const device = await ensureDevice(db);
    const access = resolveAccess(await readSharing(db), device.role, device.id);
    const state = await readHealthState(db);
    setStatus({
      phase: "ready",
      available: healthBridge.available,
      consent: state.consent,
      share: state.share,
      canEdit: access.edit,
      cache: state.cache,
      notice: notice ?? null,
    });
  }, []);

  useEffect(() => {
    refresh().catch((error: unknown) => {
      setStatus({ phase: "error", message: error instanceof Error ? error.message : "Apple Health could not be opened." });
    });
  }, [refresh]);

  const allow = useCallback(async () => {
    const db = await careStore();
    if (!healthBridge.available) {
      await refresh("Apple Health is on the iPhone app. This browser cannot read it.");
      return;
    }
    const granted = await healthBridge.requestAccess();
    await setHealthConsent(db, granted ? "allowed" : "declined");
    if (!granted) {
      await refresh("Apple Health was not allowed. You can allow it later.");
      return;
    }
    const reading = await healthBridge.readToday();
    await rememberReading(db, reading);
    await refresh("Read on this iPhone. Nothing is shared unless you turn sharing on.");
  }, [refresh]);

  const decline = useCallback(async () => {
    const db = await careStore();
    await setHealthConsent(db, "declined");
    await refresh("Apple Health stays off. Any summary already sent remains in copies that were exchanged.");
  }, [refresh]);

  const readNow = useCallback(async () => {
    const db = await careStore();
    if (!healthBridge.available) {
      await refresh("Apple Health is on the iPhone app. This browser cannot read it.");
      return;
    }
    const reading = await healthBridge.readToday();
    await rememberReading(db, reading);
    await refresh("Read on this iPhone. Nothing is shared unless you turn sharing on.");
  }, [refresh]);

  const share = useCallback(
    async (on: boolean) => {
      const db = await careStore();
      await setHealthShare(db, on);
      await refresh(on ? "Today's summary can be copied with the circle updates." : "Sharing is off. The summary is removed from the current circle view.");
    },
    [refresh],
  );

  const savePulse = useCallback(
    async (bpm: number) => {
      await healthBridge.savePulse(bpm, new Date());
      await refresh("The pulse was saved to Apple Health on this iPhone. It was not shared.");
    },
    [refresh],
  );

  return { status, allow, decline, readNow, share, savePulse };
}
