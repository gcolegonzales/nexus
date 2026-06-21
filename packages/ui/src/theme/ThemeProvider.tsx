"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyTheme,
  getStoredTheme,
  resolveDarkMode,
  storeTheme,
  type ThemeMode,
} from "./theme";

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleDarkMode: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [isDark, setIsDark] = useState(false);

  const syncTheme = useCallback((nextMode: ThemeMode) => {
    applyTheme(nextMode);
    setIsDark(resolveDarkMode(nextMode));
  }, []);

  useEffect(() => {
    const stored = getStoredTheme();
    setModeState(stored);
    syncTheme(stored);
  }, [syncTheme]);

  useEffect(() => {
    if (mode !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function handleChange() {
      syncTheme("system");
    }

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [mode, syncTheme]);

  const setMode = useCallback(
    (nextMode: ThemeMode) => {
      storeTheme(nextMode);
      setModeState(nextMode);
      syncTheme(nextMode);
    },
    [syncTheme],
  );

  const toggleDarkMode = useCallback(() => {
    setMode(isDark ? "light" : "dark");
  }, [isDark, setMode]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      toggleDarkMode,
      isDark,
    }),
    [mode, setMode, toggleDarkMode, isDark],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
