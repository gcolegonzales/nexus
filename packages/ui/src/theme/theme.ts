export type ThemeMode = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "nexus-theme";

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";

  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }

  return "system";
}

export function resolveDarkMode(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle("dark", resolveDarkMode(mode));
}

export function storeTheme(mode: ThemeMode) {
  localStorage.setItem(THEME_STORAGE_KEY, mode);
}
