import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { ReactNode } from "react";
import { Platform, Pressable, ScrollView, Text, TextInput, View, type TextStyle, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/components/theme";
import type { TextSize } from "@/constants/tokens";

type Tone = "ink" | "muted" | "faint" | "accent" | "accentInk";
type Variant = "title" | "heading" | "body" | "label" | "caption";
type EmptyIcon = "calendar" | "check-square" | "pill" | "message-circle" | "eye-off";

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
          paddingTop: insets.top + space[3],
          paddingBottom: space[10],
          gap: space[5],
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
  const textStyle: TextStyle = {
    color,
    fontFamily,
    fontSize,
    lineHeight: Math.round(fontSize * (variant === "title" ? 1.12 : variant === "heading" ? 1.25 : variant === "caption" ? 1.4 : 1.5)),
    fontWeight: variant === "title" ? "700" : variant === "body" || variant === "caption" ? "400" : "600",
    letterSpacing: variant === "title" ? -0.6 : variant === "heading" ? -0.3 : 0,
  };

  return (
    <Text accessibilityRole={variant === "title" ? "header" : undefined} style={[textStyle, style]}>
      {children}
    </Text>
  );
}

export function useChrome(pad: "roomy" | "snug" = "roomy"): ViewStyle {
  const { colors, radius, space, scheme } = useTheme();
  const lift: ViewStyle =
    scheme === "light"
      ? Platform.OS === "web"
        ? ({ boxShadow: "0 1px 2px rgba(36, 32, 28, 0.05)" } as ViewStyle)
        : {
            shadowColor: "#24201C",
            shadowOpacity: 0.05,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 1 },
            elevation: 1,
          }
      : {};

  return {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: pad === "roomy" ? space[6] : space[4],
    gap: space[2],
    ...lift,
  };
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const chrome = useChrome("roomy");
  return <View style={[chrome, style]}>{children}</View>;
}

export function EmptyState({ title, body, icon }: { title: string; body: string; icon: EmptyIcon }) {
  const { colors, space } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space[4], paddingVertical: space[2] }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.accentSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon === "pill" ? (
          <MaterialCommunityIcons name="pill" size={20} color={colors.accent} />
        ) : (
          <Feather name={icon} size={20} color={colors.accent} />
        )}
      </View>
      <View style={{ flex: 1, gap: space[1] }}>
        <AppText variant="heading">{title}</AppText>
        <AppText tone="muted">{body}</AppText>
      </View>
    </View>
  );
}

export function PageHeader({
  eyebrow,
  title,
  lede,
  onAdd,
  addLabel,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  onAdd?: () => void;
  addLabel?: string;
}) {
  const { space } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: space[4] }}>
      <View style={{ flex: 1, gap: space[1] }}>
        {eyebrow ? <AppText variant="caption" tone="muted">{eyebrow}</AppText> : null}
        <AppText variant="title">{title}</AppText>
        {lede ? <AppText tone="muted">{lede}</AppText> : null}
      </View>
      {onAdd ? <IconButton label={addLabel ?? `Add to ${title}`} onPress={onAdd} /> : null}
    </View>
  );
}

export function IconButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.accent,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.88 : 1,
        },
        webPointer,
      ]}
    >
      <Feather name="plus" size={22} color={colors.accentInk} />
    </Pressable>
  );
}

export function Group({ children }: { children: ReactNode }) {
  const chrome = useChrome("roomy");
  return <View style={[chrome, { padding: 0, gap: 0, overflow: "hidden" }]}>{children}</View>;
}

export function Row({
  children,
  last,
  onPress,
  label,
}: {
  children: ReactNode;
  last?: boolean;
  onPress?: () => void;
  label?: string;
}) {
  const { colors, space } = useTheme();
  const body = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space[3],
        paddingHorizontal: space[4],
        paddingVertical: space[4],
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.line,
      }}
    >
      {children}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.86 : 1 }, webPointer]}
    >
      {body}
    </Pressable>
  );
}

export function Mark({ done, label, onPress }: { done: boolean; label: string; onPress?: () => void }) {
  const { colors } = useTheme();
  const disc = (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: colors.accent,
        backgroundColor: done ? colors.accent : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {done ? <Feather name="check" size={16} color={colors.accentInk} /> : null}
    </View>
  );
  if (!onPress) return <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>{disc}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ checked: done }}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        { width: 44, height: 44, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.8 : 1 },
        webPointer,
      ]}
    >
      {disc}
    </Pressable>
  );
}

export function Masthead({ date, title, lede }: { date?: string; title: string; lede?: string }) {
  const { space } = useTheme();
  return (
    <View style={{ gap: space[1] }}>
      {date ? <AppText variant="caption" tone="muted">{date}</AppText> : null}
      <AppText variant="title">{title}</AppText>
      {lede ? <AppText tone="muted">{lede}</AppText> : null}
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <AppText variant="caption" tone="faint" style={{ letterSpacing: 0.8, fontWeight: "600", textTransform: "uppercase" }}>
      {children}
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
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: selected ? colors.accent : colors.line,
                  backgroundColor: selected ? colors.accentSoft : colors.bg,
                  opacity: pressed ? 0.88 : 1,
                },
                webPointer,
              ]}
            >
              <Text
                style={{
                  color: selected ? colors.accent : colors.ink,
                  fontFamily,
                  fontSize: type.caption,
                  lineHeight: Math.round(type.caption * 1.4),
                  fontWeight: selected ? "600" : "400",
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
          minHeight: multiline ? 96 : 44,
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: radius.md,
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
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: primary ? colors.sheen : colors.line,
          backgroundColor: primary ? colors.accent : "transparent",
          opacity: pressed ? 0.88 : 1,
        },
        webPointer,
      ]}
    >
      <Text
        style={{
          color: primary ? colors.accentInk : colors.ink,
          fontFamily,
          fontSize: type.label,
          lineHeight: Math.round(type.label * 1.3),
          fontWeight: "600",
          letterSpacing: 0.15,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
