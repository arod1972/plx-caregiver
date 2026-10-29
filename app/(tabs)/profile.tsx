import { ThisDevice } from "@/components/ThisDevice";
import { useTheme } from "@/components/theme";
import { AppText, Card, ChoiceGroup, Screen, Wordmark, textSizeOptions } from "@/components/ui";

export default function ProfileScreen() {
  const { preference, setPreference, textSize, setTextSize, parentMode, setParentMode } = useTheme();

  return (
    <Screen>
      <Wordmark />
      <AppText variant="title">Profile</AppText>
      {parentMode ? (
        <AppText>Large text is on. Calendar, tasks, medications, and updates can be read aloud.</AppText>
      ) : (
        <AppText tone="muted">Text size, color, and this device's keys stay here.</AppText>
      )}
      <Card>
        <AppText variant="label">Privacy</AppText>
        <AppText>Care records stay on this device. There is no account, no central store, and nothing is sold.</AppText>
      </Card>
      <AppText variant="caption" tone="muted">
        This circle works offline. Sync when you exchange updates.
      </AppText>
      <ThisDevice />
      <Card style={{ gap: 20 }}>
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
        <AppText variant="label" tone="muted">
          Reading sample
        </AppText>
        <AppText>This is how a reminder will read. One tablet with breakfast.</AppText>
      </Card>
    </Screen>
  );
}
