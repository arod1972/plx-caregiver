import { Stack, ThemeProvider as NavigationThemeProvider, DarkTheme, DefaultTheme } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ThemeProvider, useTheme } from "@/components/theme";

export { ErrorBoundary } from "expo-router";

function NavigationShell() {
  const { scheme, colors } = useTheme();
  const navigationTheme = scheme === "dark" ? DarkTheme : DefaultTheme;
  const themed = {
    ...navigationTheme,
    colors: {
      ...navigationTheme.colors,
      primary: colors.accent,
      background: colors.bg,
      card: colors.surface,
      text: colors.ink,
      border: colors.line,
    },
  };

  return (
    <NavigationThemeProvider value={themed}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <View style={{ flex: 1, backgroundColor: colors.canvas, alignItems: "center" }}>
        <View style={{ flex: 1, width: "100%", maxWidth: 480, backgroundColor: colors.bg }}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false, title: "PrimaLux Care" }} />
          </Stack>
        </View>
      </View>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationShell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
