declare module "@/lib/scan/local.mjs" {
  export function readScanConsent(store: unknown): Promise<"unknown" | "allowed" | "declined">;
  export function setScanConsent(store: unknown, consent: "allowed" | "declined"): Promise<void>;
}

declare module "@/lib/scan/match.mjs" {
  export function matchLabel(
    text: string,
    meds: Array<{ id: string; name: string; dosage?: string; time?: string }>,
  ): { id: string; name: string; dosage: string; time: string } | null;
}
