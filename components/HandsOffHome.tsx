import * as Speech from "expo-speech";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { ReadAloud } from "@/components/ReadAloud";
import { useTheme } from "@/components/theme";
import { ActionButton, AppText, Card, Masthead, Screen } from "@/components/ui";
import { careStore } from "@/lib/care-store";
import { handsOffPhrases, runIntent } from "@/lib/intents/actions.mjs";
import { readIntentLine, subscribeIntentLine } from "@/lib/intents/notice";

export function HandsOffHome() {
  const { parentMode, space } = useTheme();
  const [line, setLine] = useState(readIntentLine);
  const [busy, setBusy] = useState(false);
  const spoken = line || "Hands-off phrases are available on iPhone. The screens still do every action.";

  useEffect(() => subscribeIntentLine(setLine), []);

  const run = (name: string) => {
    if (busy) return;
    setBusy(true);
    careStore()
      .then((db) => runIntent(db, name, {}))
      .then((result) => {
        setLine(result.spoken);
        Speech.speak(result.spoken, { language: "en-US" });
      })
      .catch((error: unknown) => setLine(error instanceof Error ? error.message : "That action could not be finished."))
      .finally(() => setBusy(false));
  };

  return (
    <Screen>
      <Masthead
        title="Hands-off"
        lede={parentMode ? "Say it on iPhone, or use the buttons." : "Siri can run these on iPhone. The rest of the app works without it."}
      />
      <ReadAloud text={spoken} />
      <ActionButton label="Back" emphasis="quiet" onPress={() => router.back()} />
      <Card style={{ gap: space[3] }}>
        <AppText variant="heading">Phrases</AppText>
        <AppText tone="muted">Each phrase includes the app name, which iOS requires.</AppText>
        <View style={{ gap: space[2] }}>
          {handsOffPhrases.map((phrase) => (
            <AppText key={phrase}>{phrase}</AppText>
          ))}
        </View>
      </Card>
      <Card style={{ gap: space[4] }}>
        <AppText variant="heading">Same actions</AppText>
        <AppText tone="muted">{busy ? "Working on this device." : "These buttons use the same actions Siri uses."}</AppText>
        {line ? <AppText>{line}</AppText> : null}
        <ActionButton label="Mark the next dose taken" onPress={() => run("markDoseTaken")} />
        <ActionButton label="Next medication" emphasis="quiet" onPress={() => run("nextMedication")} />
        <ActionButton label="Care status" emphasis="quiet" onPress={() => run("careStatus")} />
      </Card>
    </Screen>
  );
}
