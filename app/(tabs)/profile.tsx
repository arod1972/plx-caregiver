import { router } from "expo-router";

import { ThisDevice } from "@/components/ThisDevice";
import { useTheme } from "@/components/theme";
import { ActionButton, AppText, Card, ChoiceGroup, Masthead, Screen, textSizeOptions } from "@/components/ui";

export default function ProfileScreen() {
  const { preference, setPreference, textSize, setTextSize, parentMode, setParentMode, space } = useTheme();

  return (
    <Screen>
      <Masthead
        title="Profile"
        lede={parentMode ? "Large text is on. Each screen can be read aloud." : "Appearance, text size, and this device."}
      />
      <Card>
        <AppText variant="label">Privacy</AppText>
        <AppText>Care stays on this device. Nothing is sold.</AppText>
      </Card>
      <AppText variant="caption" tone="faint">
        Works offline. Sync when you exchange updates.
      </AppText>
      <ThisDevice />
      <Card style={{ gap: space[4] }}>
        <AppText variant="heading">Apple Health</AppText>
        <AppText tone="muted">Steps, heart rate, and sleep. Only after you allow it, and only on this iPhone.</AppText>
        <ActionButton label="Apple Health" emphasis="quiet" onPress={() => router.push("/health")} />
      </Card>
      <Card style={{ gap: space[4] }}>
        <AppText variant="heading">Hands-off</AppText>
        <AppText tone="muted">On iPhone, Siri can mark a dose, check the next medication, or give a short status. The screens do the same things.</AppText>
        <ActionButton label="Hands-off" emphasis="quiet" onPress={() => router.push("/hands-off")} />
      </Card>
      <Card style={{ gap: space[6] }}>
        <ChoiceGroup
          label="Parent mode"
          value={parentMode ? "on" : "off"}
          onChange={(next) => setParentMode(next === "on")}
          options={[
            { value: "off", label: "Off" },
            { value: "on", label: "On" },
          ]}
        />
        <ChoiceGroup
          label="Appearance"
          value={preference}
          onChange={setPreference}
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
        <ChoiceGroup label="Text size" value={textSize} onChange={setTextSize} options={textSizeOptions()} />
      </Card>
      <Card>
        <AppText variant="caption" tone="faint">
          Reading sample
        </AppText>
        <AppText>This is how a reminder will read. One tablet with breakfast.</AppText>
      </Card>
    </Screen>
  );
}
