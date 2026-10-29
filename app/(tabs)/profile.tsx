import { AppText, Card, ChoiceGroup, Screen, Wordmark, textSizeOptions } from "@/components/ui";
import { useTheme } from "@/components/theme";

export default function ProfileScreen() {
  const { preference, setPreference, textSize, setTextSize } = useTheme();

  return (
    <Screen>
      <Wordmark />
      <AppText variant="title">Profile</AppText>
      <AppText tone="muted">Text size and color stay on this device. Nothing is shared yet.</AppText>
      <Card style={{ gap: 20 }}>
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
