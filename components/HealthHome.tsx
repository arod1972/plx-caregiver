import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { ReadAloud } from "@/components/ReadAloud";
import { useTheme } from "@/components/theme";
import { ActionButton, AppText, Card, ChoiceGroup, Field, Masthead, Screen } from "@/components/ui";
import { assertPulse, formatHeart, formatSleep, formatSteps } from "@/lib/health/summary.mjs";
import { useHealth } from "@/lib/use-health";

export function HealthHome() {
  const health = useHealth();
  const { parentMode, space } = useTheme();
  const [pulse, setPulse] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const ready = health.status.phase === "ready" ? health.status : null;
  const steps = ready?.consent === "allowed" ? formatSteps(ready.cache?.steps ?? null) : "Not read";
  const heart = ready?.consent === "allowed" ? formatHeart(ready.cache?.heartRate ?? null) : "Not read";
  const sleep = ready?.consent === "allowed" ? formatSleep(ready.cache?.sleepMinutes ?? null) : "Not read";
  const spoken = `Apple Health. Steps, ${steps}. Heart rate, ${heart}. Sleep, ${sleep}. Readings stay on this iPhone unless you share a daily summary.`;

  const savePulse = () => {
    setFormError(null);
    try {
      const bpm = assertPulse(pulse);
      health
        .savePulse(bpm)
        .then(() => setPulse(""))
        .catch((error: unknown) => setFormError(error instanceof Error ? error.message : "The pulse could not be saved."));
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : "Use a pulse between 30 and 220.");
    }
  };

  return (
    <Screen>
      <Masthead
        title="Apple Health"
        lede={parentMode ? "Only if you allow it." : "Steps, heart rate, and sleep. Read on this iPhone, and only after you allow it."}
      />
      <ReadAloud text={spoken} />
      <ActionButton label="Back" emphasis="quiet" onPress={() => router.back()} />
      {health.status.phase === "loading" ? <AppText tone="muted">Opening Apple Health.</AppText> : null}
      {health.status.phase === "error" ? (
        <Card>
          <AppText>{health.status.message}</AppText>
        </Card>
      ) : null}
      {ready ? (
        <View style={{ gap: space[6] }}>
          <Card style={{ gap: space[4] }}>
            <AppText variant="heading">On this iPhone</AppText>
            <AppText tone="muted">
              {ready.available
                ? "Allowing opens the Apple Health prompt. Readings stay on this device."
                : "Apple Health is on the iPhone app. This browser cannot read it."}
            </AppText>
            <Reading label="Steps" value={steps} />
            <Reading label="Heart rate" value={heart} />
            <Reading label="Sleep" value={sleep} />
            {ready.consent !== "allowed" ? (
              <AppText tone="muted">Nothing is read until you allow it.</AppText>
            ) : (
              <AppText tone="muted">{ready.share ? "A daily summary can go with circle updates." : "Not shared with the circle."}</AppText>
            )}
            {ready.notice ? <AppText>{ready.notice}</AppText> : null}
            {formError ? <AppText>{formError}</AppText> : null}
            {ready.consent !== "allowed" ? <ActionButton label="Allow Apple Health" onPress={() => health.allow().catch(show(setFormError))} /> : null}
            {ready.consent === "unknown" ? (
              <ActionButton label="Not now" emphasis="quiet" onPress={() => health.decline().catch(show(setFormError))} />
            ) : null}
            {ready.consent === "allowed" && ready.available ? (
              <ActionButton label="Read again" emphasis="quiet" onPress={() => health.readNow().catch(show(setFormError))} />
            ) : null}
            {ready.consent === "allowed" ? (
              <ActionButton label="Stop reading" emphasis="quiet" onPress={() => health.decline().catch(show(setFormError))} />
            ) : null}
          </Card>
          {ready.consent === "allowed" && ready.canEdit ? (
            <Card style={{ gap: space[4] }}>
              <ChoiceGroup
                label="Share today's summary"
                value={ready.share ? "on" : "off"}
                onChange={(next) => health.share(next === "on").catch(show(setFormError))}
                options={[
                  { value: "off", label: "Off" },
                  { value: "on", label: "On" },
                ]}
              />
              <AppText tone="muted">Off is the default. On sends only today's steps, heart rate, and sleep with the circle updates.</AppText>
            </Card>
          ) : null}
          {ready.consent === "allowed" && ready.available ? (
            <Card style={{ gap: space[4] }}>
              <AppText variant="heading">Save a pulse</AppText>
              <AppText tone="muted">A number you type is written to Apple Health. It is not shared.</AppText>
              <Field label="Beats per minute" value={pulse} onChangeText={setPulse} placeholder="72" />
              <ActionButton label="Save pulse" emphasis="quiet" onPress={savePulse} />
            </Card>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

function Reading({ label, value }: { label: string; value: string }) {
  const { space } = useTheme();
  return (
    <View style={{ gap: space[1] }}>
      <AppText variant="label">{label}</AppText>
      <AppText>{value}</AppText>
    </View>
  );
}

function show(setFormError: (message: string) => void) {
  return (error: unknown) => {
    setFormError(error instanceof Error ? error.message : "Apple Health could not be updated.");
  };
}
