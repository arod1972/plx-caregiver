import { Link, Stack } from "expo-router";
import { View } from "react-native";

import { useTheme } from "@/components/theme";
import { AppText } from "@/components/ui";

export default function NotFoundScreen() {
  const { colors, space } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: "Not found", headerShown: false }} />
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: "center",
          justifyContent: "center",
          padding: space[6],
          gap: space[4],
        }}
      >
        <AppText variant="title">That page is not here</AppText>
        <Link href="/" style={{ minHeight: 44, justifyContent: "center" }}>
          <AppText tone="accent">Back to calendar</AppText>
        </Link>
      </View>
    </>
  );
}
