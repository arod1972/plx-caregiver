import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Appearance, Platform } from "react-native";

import {
  tokens,
  type ColorPreference,
  type ColorTokens,
  type Scheme,
  type TextSize,
  type TypeTokens,
} from "@/constants/tokens";

const SCHEME_KEY = "plx-caregiver.color-scheme";
const TEXT_KEY = "plx-caregiver.text-size";
const PARENT_KEY = "plx-caregiver.parent-mode";

const fontFamily = Platform.select({
  web: "Source Sans 3, Segoe UI, system-ui, sans-serif",
  default: undefined,
});

type ThemeValue = {
  scheme: Scheme;
  preference: ColorPreference;
  setPreference: (next: ColorPreference) => void;
  textSize: TextSize;
  setTextSize: (next: TextSize) => void;
  parentMode: boolean;
  setParentMode: (next: boolean) => void;
  colors: ColorTokens;
  type: TypeTokens;
  space: typeof tokens.space;
  radius: typeof tokens.radius;
  fontFamily: string | undefined;
};

const ThemeContext = createContext<ThemeValue | null>(null);

function isPreference(value: string | null): value is ColorPreference {
  return value === "system" || value === "light" || value === "dark";
}

function isTextSize(value: string | null): value is TextSize {
  return value === "standard" || value === "large" || value === "extra";
}

function systemScheme(): Scheme {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return Appearance.getColorScheme() === "dark" ? "dark" : "light";
}

function readWebPrefs(): { preference: ColorPreference; textSize: TextSize; parentMode: boolean } | null {
  if (Platform.OS !== "web" || typeof localStorage === "undefined") return null;
  try {
    const preference = localStorage.getItem(SCHEME_KEY);
    const textSize = localStorage.getItem(TEXT_KEY);
    return {
      preference: isPreference(preference) ? preference : "system",
      textSize: isTextSize(textSize) ? textSize : "standard",
      parentMode: localStorage.getItem(PARENT_KEY) === "1",
    };
  } catch {
    return null;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const webPrefs = readWebPrefs();
  const [preference, setPreferenceState] = useState<ColorPreference>(webPrefs?.preference ?? "system");
  const [textSize, setTextSizeState] = useState<TextSize>(webPrefs?.parentMode ? "extra" : (webPrefs?.textSize ?? "standard"));
  const [parentMode, setParentModeState] = useState(webPrefs?.parentMode ?? false);
  const [system, setSystem] = useState<Scheme>(systemScheme);

  useEffect(() => {
    let alive = true;
    AsyncStorage.multiGet([SCHEME_KEY, TEXT_KEY, PARENT_KEY])
      .then((pairs) => {
        if (!alive) return;
        const storedPreference = pairs[0]?.[1] ?? null;
        const storedText = pairs[1]?.[1] ?? null;
        const storedParent = pairs[2]?.[1] === "1";
        if (isPreference(storedPreference)) setPreferenceState(storedPreference);
        if (storedParent) {
          setParentModeState(true);
          setTextSizeState("extra");
        } else if (isTextSize(storedText)) {
          setTextSizeState(storedText);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystem(colorScheme === "dark" ? "dark" : "light");
    });
    if (Platform.OS === "web" && typeof window !== "undefined" && window.matchMedia) {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = () => setSystem(media.matches ? "dark" : "light");
      media.addEventListener("change", onChange);
      return () => {
        sub.remove();
        media.removeEventListener("change", onChange);
      };
    }
    return () => sub.remove();
  }, []);

  const setPreference = useCallback((next: ColorPreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(SCHEME_KEY, next).catch(() => undefined);
  }, []);

  const setTextSize = useCallback((next: TextSize) => {
    setTextSizeState(next);
    AsyncStorage.setItem(TEXT_KEY, next).catch(() => undefined);
  }, []);

  const setParentMode = useCallback((next: boolean) => {
    const size: TextSize = next ? "extra" : "standard";
    setParentModeState(next);
    setTextSizeState(size);
    AsyncStorage.multiSet([
      [PARENT_KEY, next ? "1" : "0"],
      [TEXT_KEY, size],
    ]).catch(() => undefined);
  }, []);

  const scheme: Scheme = preference === "system" ? system : preference;

  const value = useMemo<ThemeValue>(
    () => ({
      scheme,
      preference,
      setPreference,
      textSize,
      setTextSize,
      parentMode,
      setParentMode,
      colors: tokens.color[scheme],
      type: tokens.typeScale[textSize],
      space: tokens.space,
      radius: tokens.radius,
      fontFamily,
    }),
    [parentMode, preference, scheme, setParentMode, setPreference, setTextSize, textSize],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}
