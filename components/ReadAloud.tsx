import * as Speech from "expo-speech";

import { useTheme } from "@/components/theme";
import { ActionButton } from "@/components/ui";

export function ReadAloud({ text }: { text: string }) {
  const { parentMode } = useTheme();
  if (!parentMode || !text.trim()) return null;
  return (
    <ActionButton
      label="Read this aloud"
      emphasis="quiet"
      onPress={() => {
        Speech.stop();
        Speech.speak(text, { language: "en-US", rate: 0.92 });
      }}
    />
  );
}
