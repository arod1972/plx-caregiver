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
        <Text style={{ color: colors.ink, fontSize: 28, lineHeight: 32, fontWeight: "700", letterSpacing: -0.6 }}>
          Something went wrong
        </Text>
        <Text style={{ color: colors.muted, fontSize: 17, lineHeight: 26 }}>{error.message || "This screen could not be opened."}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={() => {
            void retry();
          }}
          style={{
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.sheen,
            backgroundColor: colors.accent,
          }}
        >
          <Text style={{ color: colors.accentInk, fontSize: 15, fontWeight: "600", letterSpacing: 0.15 }}>Try again</Text>
        </Pressable>
      </View>
    </View>
  );
}
