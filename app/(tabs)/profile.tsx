import { router } from "expo-router";
import { View } from "react-native";

import { ThisDevice } from "@/components/ThisDevice";
import { useTheme } from "@/components/theme";
import { AppText, Card, ChoiceGroup, Group, PageHeader, Row, Screen, textSizeOptions } from "@/components/ui";

export default function ProfileScreen() {
  const { preference, setPreference, textSize, setTextSize, parentMode, setParentMode, space } = useTheme();

  return (
    <Screen>
      <PageHeader
        title="Profile"
        lede={parentMode ? "Large text is on. Each screen can be read aloud." : "This phone, appearance, and what stays private."}
      />
      <Card>
        <AppText variant="label">Privacy</AppText>
        <AppText>Care stays on this device. Nothing is sold. The circle works offline.</AppText>
      </Card>
      <ThisDevice />
      <Group>
        <Row label="Apple Health" onPress={() => router.push("/health")}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="heading">Apple Health</AppText>
            <AppText variant="caption" tone="muted">Steps, heart rate, and sleep. Only after you allow it.</AppText>
          </View>
          <AppText tone="accent">Open</AppText>
        </Row>
        <Row last label="Hands-off" onPress={() => router.push("/hands-off")}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="heading">Hands-off</AppText>
            <AppText variant="caption" tone="muted">Siri can mark a dose or read what is next.</AppText>
          </View>
          <AppText tone="accent">Open</AppText>
        </Row>
      </Group>
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
