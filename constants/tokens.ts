export const schemeNames = ["light", "dark"] as const;
export type Scheme = (typeof schemeNames)[number];

export const colorPreferences = ["system", "light", "dark"] as const;
export type ColorPreference = (typeof colorPreferences)[number];

export const textSizes = ["standard", "large", "extra"] as const;
export type TextSize = (typeof textSizes)[number];

export const textSizeLabel: Record<TextSize, string> = {
  standard: "Standard",
  large: "Large",
  extra: "Extra large",
};

const typeScale = {
  standard: { title: 26, heading: 20, body: 17, label: 15, caption: 13, tab: 12 },
  large: { title: 30, heading: 23, body: 20, label: 17, caption: 15, tab: 13 },
  extra: { title: 34, heading: 26, body: 22, label: 18, caption: 16, tab: 14 },
} as const;

export const tokens = {
  color: {
    light: {
      canvas: "#E7E1D8",
      bg: "#F4F1EB",
      surface: "#FBF9F6",
      ink: "#24302B",
      muted: "#4E5A54",
      faint: "#6E7872",
      line: "#E3DCD2",
      accent: "#3D6B5A",
      accentInk: "#F7FBF8",
      accentSoft: "#E4EFE8",
    },
    dark: {
      canvas: "#101412",
      bg: "#171D1A",
      surface: "#1E2622",
      ink: "#F3EFE8",
      muted: "#C5D0C9",
      faint: "#8E9A93",
      line: "#33403A",
      accent: "#9DCFBA",
      accentInk: "#14211C",
      accentSoft: "#243830",
    },
  },
  space: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
  },
  typeScale,
} as const;

export type ColorTokens = (typeof tokens.color)[Scheme];
export type TypeTokens = (typeof typeScale)[TextSize];
