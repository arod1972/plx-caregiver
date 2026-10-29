import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useState, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, Text, TextInput, View, type TextStyle, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/components/theme";
import type { TextSize } from "@/constants/tokens";

type Tone = "ink" | "muted" | "faint" | "accent" | "accentInk";
type Variant = "title" | "heading" | "body" | "label" | "caption";
type EmptyMark = "calendar" | "tasks" | "meds" | "updates" | "locked";

const webPointer = Platform.OS === "web" ? ({ cursor: "pointer" } as TextStyle) : undefined;

export function Screen({ children }: { children: ReactNode }) {
  const { colors, space } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          width: "100%",
          maxWidth: 520,
          alignSelf: "center",
          paddingHorizontal: space[6],
          paddingTop: insets.top + space[8],
          paddingBottom: space[12],
          gap: space[8],
        }}
      >
        {children}
      </ScrollView>
    </View>
  );
}

function typeStyle(variant: Variant, fontSize: number): TextStyle {
  if (variant === "title") {
    return { fontWeight: "600", letterSpacing: -0.6, lineHeight: Math.round(fontSize * 1.12) };
  }
  if (variant === "heading") {
    return { fontWeight: "600", letterSpacing: -0.25, lineHeight: Math.round(fontSize * 1.25) };
  }
  if (variant === "label") {
    return { fontWeight: "600", letterSpacing: 0.1, lineHeight: Math.round(fontSize * 1.3) };
  }
  if (variant === "caption") {
    return { fontWeight: "500", letterSpacing: 0.12, lineHeight: Math.round(fontSize * 1.4) };
  }
  return { fontWeight: "400", letterSpacing: 0, lineHeight: Math.round(fontSize * 1.5) };
}

export function AppText({
  children,
  variant = "body",
  tone = "ink",
  style,
}: {
  children: ReactNode;
  variant?: Variant;
  tone?: Tone;
  style?: TextStyle;
}) {
  const { colors, type, fontFamily } = useTheme();
  const color =
    tone === "muted"
      ? colors.muted
      : tone === "faint"
        ? colors.faint
        : tone === "accent"
          ? colors.accent
          : tone === "accentInk"
            ? colors.accentInk
            : colors.ink;
  const fontSize = type[variant];

  return (
    <Text accessibilityRole={variant === "title" ? "header" : undefined} style={[{ color, fontFamily, fontSize }, typeStyle(variant, fontSize), style]}>
      {children}
    </Text>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { colors, radius, scheme, space } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          borderWidth: 1,
          borderRadius: radius.xl,
          padding: space[6],
          gap: space[4],
          shadowColor: scheme === "dark" ? "#000000" : "#24302B",
          shadowOpacity: scheme === "dark" ? 0.28 : 0.05,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function EmptyState({ title, body, mark = "calendar" }: { title: string; body: string; mark?: EmptyMark }) {
  const { colors, space } = useTheme();
  const iconColor = colors.faint;
  return (
    <View style={{ paddingVertical: space[2], gap: space[4], alignItems: "flex-start" }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.metal,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {mark === "meds" ? (
          <MaterialCommunityIcons name="pill" size={18} color={iconColor} />
        ) : (
          <Feather
            name={mark === "tasks" ? "check" : mark === "updates" ? "message-circle" : mark === "locked" ? "lock" : "calendar"}
            size={18}
            color={iconColor}
          />
        )}
      </View>
      <View style={{ gap: space[2] }}>
        <AppText variant="heading">{title}</AppText>
        <AppText tone="muted">{body}</AppText>
      </View>
    </View>
  );
}

export function Wordmark() {
  const { colors, space } = useTheme();
  return (
    <View style={{ gap: space[2], alignItems: "flex-start" }}>
      <AppText variant="caption" tone="faint" style={{ letterSpacing: 1.15, textTransform: "uppercase" }}>
        PrimaLux Care
      </AppText>
      <View style={{ width: 28, height: 1, backgroundColor: colors.metal }} />
    </View>
  );
}

export function PageHeader({ title, kicker, subtitle }: { title: string; kicker?: string; subtitle?: string }) {
  const { space } = useTheme();
  return (
    <View style={{ gap: space[4] }}>
      <Wordmark />
      <View style={{ gap: space[2] }}>
        {kicker ? (
          <AppText variant="caption" tone="faint">
            {kicker}
          </AppText>
        ) : null}
        <AppText variant="title">{title}</AppText>
        {subtitle ? <AppText tone="muted">{subtitle}</AppText> : null}
      </View>
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <AppText variant="caption" tone="faint" style={{ letterSpacing: 0.7, textTransform: "uppercase" }}>
      {children}
    </AppText>
  );
}

export function HairlineRow({ children }: { children: ReactNode }) {
  const { colors, space } = useTheme();
  return (
    <View
      style={{
        gap: space[4],
        paddingVertical: space[4],
        borderTopWidth: 1,
        borderTopColor: colors.line,
      }}
    >
      {children}
    </View>
  );
}

export function ChoiceGroup<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string }[];
}) {
  const { colors, radius, space, type, fontFamily } = useTheme();

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ gap: space[2] }}>
      <AppText variant="label">{label}</AppText>
      <View style={{ gap: space[2] }}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                {
                  minHeight: 44,
                  alignItems: "flex-start",
                  justifyContent: "center",
                  paddingHorizontal: space[4],
                  paddingVertical: space[2],
                  borderRadius: radius.sm,
                  borderWidth: 1,
                  borderColor: colors.line,
                  borderLeftWidth: selected ? 2 : 1,
                  borderLeftColor: selected ? colors.metal : colors.line,
                  backgroundColor: selected ? colors.accentSoft : "transparent",
                  opacity: pressed ? 0.84 : 1,
                },
                webPointer,
              ]}
            >
              <Text
                style={{
                  color: selected ? colors.ink : colors.muted,
                  fontFamily,
                  fontSize: type.label,
                  lineHeight: Math.round(type.label * 1.3),
                  fontWeight: selected ? "600" : "500",
                  textAlign: "left",
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function textSizeOptions(): { value: TextSize; label: string }[] {
  return [
    { value: "standard", label: "Standard" },
    { value: "large", label: "Large" },
    { value: "extra", label: "Extra large" },
  ];
}

export function Field({
  label,
  value,
  onChangeText,
  onBlur,
  multiline,
  placeholder,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  onBlur?: () => void;
  multiline?: boolean;
  placeholder?: string;
  editable?: boolean;
}) {
  const { colors, radius, space, type, fontFamily } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: space[2] }}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        onFocus={() => setFocused(true)}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        multiline={multiline}
        editable={editable}
        autoCapitalize="sentences"
        autoCorrect={false}
        style={{
          minHeight: multiline ? 96 : 44,
          borderWidth: 1,
          borderColor: focused ? colors.accent : colors.line,
          borderRadius: radius.sm,
          backgroundColor: colors.bg,
          color: colors.ink,
          fontFamily,
          fontSize: type.body,
          lineHeight: Math.round(type.body * 1.45),
          paddingHorizontal: space[4],
          paddingVertical: space[2],
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
    </View>
  );
}

export function ActionButton({
  label,
  onPress,
  emphasis = "primary",
}: {
  label: string;
  onPress: () => void;
  emphasis?: "primary" | "quiet";
}) {
  const { colors, radius, space, type, fontFamily } = useTheme();
  const primary = emphasis === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: space[4],
          paddingVertical: space[2],
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: primary ? colors.accent : colors.line,
          backgroundColor: primary ? colors.accent : "transparent",
          opacity: pressed ? 0.84 : 1,
          overflow: "hidden",
        },
        webPointer,
      ]}
    >
      {primary ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 20,
            right: 20,
            height: 1,
            backgroundColor: colors.metalBright,
          }}
        />
      ) : null}
      <Text
        style={{
          color: primary ? colors.accentInk : colors.ink,
          fontFamily,
          fontSize: type.label,
          lineHeight: Math.round(type.label * 1.25),
          fontWeight: "600",
          letterSpacing: 0.15,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
