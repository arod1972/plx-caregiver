import { useCallback, useEffect, useState } from "react";
import { careStore } from "@/lib/care-store";
import { readScanConsent, setScanConsent } from "@/lib/scan/local.mjs";

type Consent = "unknown" | "allowed" | "declined";
type Phase = "loading" | "ready" | "error";

export function useScanConsent() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState<Consent>("unknown");

  const refresh = useCallback(async () => {
    const db = await careStore();
    setConsent(await readScanConsent(db));
    setPhase("ready");
  }, []);

  useEffect(() => {
    refresh().catch((error: unknown) => {
      setPhase("error");
      setMessage(error instanceof Error ? error.message : "The scanner could not be opened.");
    });
  }, [refresh]);

  const choose = useCallback(async (next: Exclude<Consent, "unknown">) => {
    const db = await careStore();
    await setScanConsent(db, next);
    setConsent(next);
    setPhase("ready");
  }, []);

  return { phase, message, consent, choose };
}
