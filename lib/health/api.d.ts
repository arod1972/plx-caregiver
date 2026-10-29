declare module "@/lib/health/summary.mjs" {
  export type HealthSnapshot = {
    day: string;
    steps: number | null;
    heartRate: number | null;
    sleepMinutes: number | null;
    readAt: string;
  };
  export function summarizeHealth(input: {
    steps?: { value?: number }[];
    heart?: { value?: number; end?: string }[];
    sleep?: { value?: number; start?: string; end?: string }[];
    now?: Date;
  }): HealthSnapshot;
  export function formatSteps(value: number | null): string;
  export function formatHeart(value: number | null): string;
  export function formatSleep(value: number | null): string;
  export function assertPulse(value: string): number;
  export function cleanSnapshot(snapshot: HealthSnapshot): HealthSnapshot;
}

declare module "@/lib/health/local.mjs" {
  import type { HealthSnapshot } from "@/lib/health/summary.mjs";
  export type HealthConsent = "unknown" | "allowed" | "declined";
  export type HealthState = { consent: HealthConsent; share: boolean; cache: HealthSnapshot | null };
  export function readHealthState(store: unknown): Promise<HealthState>;
  export function setHealthConsent(store: unknown, consent: "allowed" | "declined"): Promise<void>;
  export function rememberReading(store: unknown, snapshot: HealthSnapshot): Promise<HealthSnapshot>;
  export function setHealthShare(store: unknown, on: boolean): Promise<void>;
}
