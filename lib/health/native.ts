import type { HealthSnapshot } from "@/lib/health/summary.mjs";

export type HealthBridge = {
  available: boolean;
  requestAccess(): Promise<boolean>;
  readToday(now?: Date): Promise<HealthSnapshot>;
  savePulse(bpm: number, at: Date): Promise<void>;
};

const unavailable = "Apple Health is only available on the iPhone app.";

export const healthBridge: HealthBridge = {
  available: false,
  async requestAccess() {
    return false;
  },
  async readToday() {
    throw new Error(unavailable);
  },
  async savePulse() {
    throw new Error(unavailable);
  },
};
