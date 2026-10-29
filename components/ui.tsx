import type { ReactNode } from "react";
import { Platform, Pressable, ScrollView, Text, TextInput, View, type TextStyle, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/components/theme";
import type { TextSize } from "@/constants/tokens";

type Tone = "ink" | "muted" | "accent" | "accentInk";
type Variant = "title" | "heading" | "body" | "label" | "caption";

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
          paddingHorizontal: space[5],
          paddingTop: insets.top + space[6],
          paddingBottom: space[12],
          gap: space[6],
        }}
      >
        {children}
      </ScrollView>
    </View>
  );
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
    tone === "muted" ? colors.muted : tone === "accent" ? colors.accent : tone === "accentInk" ? colors.accentInk : colors.ink;
  const fontSize = type[variant];
  const textStyle: TextStyle = {
    color,
    fontFamily,
    fontSize,
    lineHeight: Math.round(fontSize * (variant === "title" || variant === "heading" ? 1.25 : 1.45)),
    fontWeight: variant === "body" ? "400" : "600",
    letterSpacing: variant === "title" ? -0.3 : variant === "caption" ? 0.2 : 0,
  };

  return (
    <Text accessibilityRole={variant === "title" ? "header" : undefined} style={[textStyle, style]}>
      {children}
    </Text>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { colors, radius, space } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          borderWidth: 1,
          borderRadius: radius.md,
          padding: space[5],
          gap: space[2],
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <AppText variant="heading">{title}</AppText>
      <AppText tone="muted">{body}</AppText>
    </Card>
  );
}

export function Wordmark() {
  return (
    <AppText variant="caption" tone="accent" style={{ letterSpacing: 1.6, textTransform: "uppercase" }}>
      PrimaLux Care
    </AppText>
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
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ gap: space[3] }}>
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
                  minHeight: 48,
                  alignItems: "flex-start",
                  justifyContent: "center",
                  paddingHorizontal: space[4],
                  paddingVertical: space[3],
                  borderRadius: radius.sm,
                  borderWidth: 1,
                  borderColor: selected ? colors.accent : colors.line,
                  backgroundColor: selected ? colors.accentSoft : colors.bg,
                  opacity: pressed ? 0.72 : 1,
                },
                webPointer,
              ]}
            >
              <Text
                style={{
                  color: selected ? colors.accent : colors.ink,
                  fontFamily,
                  fontSize: type.caption,
                  lineHeight: Math.round(type.caption * 1.3),
                  fontWeight: "600",
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
  return (
    <View style={{ gap: space[2] }}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        multiline={multiline}
        editable={editable}
        autoCapitalize="sentences"
        autoCorrect={false}
        style={{
          minHeight: multiline ? 96 : 48,
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: radius.sm,
          backgroundColor: colors.bg,
          color: colors.ink,
          fontFamily,
          fontSize: type.body,
          lineHeight: Math.round(type.body * 1.4),
          paddingHorizontal: space[4],
          paddingVertical: space[3],
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
          minHeight: 48,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: space[4],
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: primary ? colors.accent : colors.line,
          backgroundColor: primary ? colors.accent : colors.surface,
          opacity: pressed ? 0.75 : 1,
        },
        webPointer,
      ]}
    >
      <Text
        style={{
          color: primary ? colors.accentInk : colors.ink,
          fontFamily,
          fontSize: type.label,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

