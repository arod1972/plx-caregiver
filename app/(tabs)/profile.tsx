import { ThisDevice } from "@/components/ThisDevice";
import { useTheme } from "@/components/theme";
import { AppText, Card, ChoiceGroup, PageHeader, Screen, textSizeOptions } from "@/components/ui";

export default function ProfileScreen() {
  const { preference, setPreference, textSize, setTextSize, parentMode, setParentMode, space } = useTheme();

  return (
    <Screen>
      <PageHeader
        title="Profile"
        subtitle={parentMode ? "Large text is on. Screens can be read aloud." : "Text, color, and this device."}
      />
      <AppText>
        Care records stay on this device. There is no account, no central store, and nothing is sold. This circle works offline.
      </AppText>
      <ThisDevice />
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
        <AppText variant="label" tone="muted">
          Reading sample
        </AppText>
        <AppText>This is how a reminder will read. One tablet with breakfast.</AppText>
      </Card>
    </Screen>
  );
}
