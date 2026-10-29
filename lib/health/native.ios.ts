import {
  CategoryType,
  QuantityType,
  Unit,
  isAvailable,
  queryCategorySamples,
  queryQuantitySamples,
  requestAuthorization,
  saveQuantitySample,
} from "@appeeky/expo-healthkit";

import { summarizeHealth, type HealthSnapshot } from "@/lib/health/summary.mjs";
import type { HealthBridge } from "@/lib/health/native";

const READ = [QuantityType.stepCount, QuantityType.heartRate, CategoryType.sleepAnalysis] as const;
const WRITE = [QuantityType.heartRate] as const;

function ready() {
  try {
    return isAvailable();
  } catch {
    return false;
  }
}

function startOfToday(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function sleepWindow(now: Date) {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 18, 0, 0, 0);
  const noon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  return { from, to: noon < now ? noon : now };
}

export const healthBridge: HealthBridge = {
  get available() {
    return ready();
  },
  async requestAccess() {
    if (!ready()) return false;
    return requestAuthorization({ toRead: [...READ], toShare: [...WRITE] });
  },
  async readToday(now = new Date()): Promise<HealthSnapshot> {
    if (!ready()) throw new Error("Apple Health is only available on the iPhone app.");
    const sleep = sleepWindow(now);
    const [steps, heart, sleepSamples] = await Promise.all([
      queryQuantitySamples({ type: QuantityType.stepCount, unit: Unit.count, from: startOfToday(now), to: now, ascending: true }),
      queryQuantitySamples({
        type: QuantityType.heartRate,
        unit: Unit.countPerMinute,
        from: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        to: now,
        limit: 20,
        ascending: false,
      }),
      queryCategorySamples({ type: CategoryType.sleepAnalysis, from: sleep.from, to: sleep.to, ascending: true }),
    ]);
    return summarizeHealth({
      steps: steps.map((sample) => ({ value: sample.value })),
      heart: heart.map((sample) => ({ value: sample.value, end: sample.endDate.toISOString() })),
      sleep: sleepSamples.map((sample) => ({
        value: sample.value,
        start: sample.startDate.toISOString(),
        end: sample.endDate.toISOString(),
      })),
      now,
    });
  },
  async savePulse(bpm, at) {
    if (!ready()) throw new Error("Apple Health is only available on the iPhone app.");
    await saveQuantitySample({
      type: QuantityType.heartRate,
      unit: Unit.countPerMinute,
      value: bpm,
      startDate: at,
      endDate: at,
    });
  },
};
