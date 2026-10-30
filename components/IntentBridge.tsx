import * as AppIntents from "expo-app-intents";
import * as Speech from "expo-speech";
import { router } from "expo-router";

import { careStore } from "@/lib/care-store";
import { runIntent } from "@/lib/intents/actions.mjs";
import { publishIntentLine } from "@/lib/intents/notice";

export function IntentBridge() {
  AppIntents.useAppIntents(async (pending) => {
    if (!pending.length) return;
    const db = await careStore();
    let spoken = "";
    for (const invocation of pending) {
      try {
        const result = await runIntent(db, invocation.name, invocation.params ?? {});
        spoken = result.spoken;
      } catch (error) {
        spoken = error instanceof Error ? error.message : "That action could not be finished.";
      }
      await AppIntents.removePendingInvocationAsync(invocation.id);
    }
    if (!spoken) return;
    publishIntentLine(spoken);
    Speech.speak(spoken, { language: "en-US" });
    router.push("/hands-off");
  });

  return null;
}
