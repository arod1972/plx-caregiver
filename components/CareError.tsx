import { Pressable, Text, View } from "react-native";

import { tokens } from "@/constants/tokens";

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  const colors = tokens.color.light;
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <View style={{ width: "100%", maxWidth: 420, gap: 16 }}>
        <Text style={{ color: colors.ink, fontSize: 26, fontWeight: "600" }}>Something went wrong</Text>
        <Text style={{ color: colors.muted, fontSize: 17, lineHeight: 24 }}>{error.message || "This screen could not be opened."}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={() => {
            void retry();
          }}
          style={{
            minHeight: 48,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 14,
            backgroundColor: colors.accent,
          }}
        >
          <Text style={{ color: colors.accentInk, fontSize: 17, fontWeight: "600" }}>Try again</Text>
        </Pressable>
      </View>
    </View>
  );
}
