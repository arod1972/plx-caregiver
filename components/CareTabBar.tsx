import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { Platform, Pressable, Text, View } from "react-native";

import { useTheme } from "@/components/theme";

const webPointer = Platform.OS === "web" ? ({ cursor: "pointer" } as const) : undefined;

function TabIcon({ name, color, size }: { name: string; color: string; size: number }) {
  if (name === "meds") {
    return <MaterialCommunityIcons name="pill" size={size} color={color} />;
  }
  const glyph =
    name === "tasks" ? "check-square" : name === "updates" ? "message-circle" : name === "profile" ? "user" : "calendar";
  return <Feather name={glyph} size={size} color={color} />;
}

export function CareTabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { colors, type, fontFamily, space, textSize } = useTheme();
  const bottom = Math.max(insets.bottom, space[2]);
  const iconSize = textSize === "extra" ? 22 : 20;

  return (
    <View style={{ backgroundColor: colors.bg, alignItems: "center" }}>
      <View
        accessibilityRole="tablist"
        style={{
          width: "100%",
          maxWidth: 480,
          flexDirection: "row",
          backgroundColor: colors.bg,
          borderTopWidth: 1,
          borderTopColor: colors.line,
          paddingBottom: bottom,
          paddingTop: space[2],
        }}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = typeof options.title === "string" ? options.title : route.name;
          const iconColor = focused ? colors.accent : colors.faint;
          const labelColor = focused ? colors.ink : colors.faint;

          const onPress = () => {
            const event = emitter.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigateToTab(route.key);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={onPress}
              style={({ pressed }) => [
                {
                  flex: 1,
                  minHeight: 48,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  opacity: pressed ? 0.7 : 1,
                },
                webPointer,
              ]}
            >
              <TabIcon name={route.name} color={iconColor} size={iconSize} />
              <Text
                style={{
                  color: labelColor,
                  fontFamily,
                  fontSize: type.tab,
                  lineHeight: Math.round(type.tab * 1.3),
                  fontWeight: focused ? "600" : "400",
                  letterSpacing: 0.1,
                }}
              >
                {label}
              </Text>
              <View
                style={{
                  width: 16,
                  height: 2,
                  borderRadius: 1,
                  backgroundColor: focused ? colors.accent : "transparent",
                }}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
