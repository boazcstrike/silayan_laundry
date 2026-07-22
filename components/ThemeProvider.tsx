"use client";

/**
 * ThemeProvider component
 * Manages dark mode state with localStorage persistence and system preference detection
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  useCallback,
  useMemo,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "theme";

/**
 * Get the initial theme from localStorage or system preference
 */
function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  // Check localStorage first
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  // Fall back to system preference
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
}

/**
 * Apply theme to document
 */
function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

// In-tab subscribers to theme changes. The native `storage` event only fires
// in *other* tabs, so same-tab writes (setTheme/toggleTheme) notify manually.
const themeListeners = new Set<() => void>();

function notifyThemeChange(): void {
  themeListeners.forEach((listener) => listener());
}

/**
 * Subscribe to every source that can change the resolved theme: same-tab
 * writes, cross-tab `storage` events, and system preference changes.
 */
function subscribeToTheme(callback: () => void): () => void {
  themeListeners.add(callback);
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener("storage", callback);
  mediaQuery.addEventListener("change", callback);

  return () => {
    themeListeners.delete(callback);
    window.removeEventListener("storage", callback);
    mediaQuery.removeEventListener("change", callback);
  };
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // useSyncExternalStore reads "light" on the server (getServerSnapshot) and
  // the real value on the client, reconciling after hydration without a
  // mismatch — no `mounted` guard or setState-in-effect needed.
  const theme = useSyncExternalStore<Theme>(
    subscribeToTheme,
    getInitialTheme,
    () => "light"
  );

  // Sync the resolved theme to the DOM whenever it changes.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);
    notifyThemeChange();
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      setTheme,
    }),
    [theme, toggleTheme, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
