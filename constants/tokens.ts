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
  standard: { title: 28, heading: 20, body: 17, label: 15, caption: 13, tab: 12 },
  large: { title: 30, heading: 22, body: 19, label: 16, caption: 14, tab: 13 },
  extra: { title: 32, heading: 24, body: 20, label: 17, caption: 15, tab: 13 },
} as const;

export const tokens = {
  color: {
    light: {
      canvas: "#E7E1D8",
      bg: "#F4F1EB",
      surface: "#FBF9F6",
      ink: "#24302B",
      muted: "#6A6158",
      faint: "#746C64",
      line: "#E6DFD6",
      accent: "#3D6B5A",
      accentInk: "#F7FBF8",
      accentSoft: "#E4EFE8",
      metal: "#A4845A",
      sheen: "#E4D3A4",
    },
    dark: {
      canvas: "#101412",
      bg: "#171D1A",
      surface: "#1E2622",
      ink: "#F3EFE8",
      muted: "#B7AFA6",
      faint: "#9C948B",
      line: "#2C3832",
      accent: "#9DCFBA",
      accentInk: "#14211C",
      accentSoft: "#243830",
      metal: "#A89068",
      sheen: "#6E5A3A",
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
