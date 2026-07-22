"use client";

/**
 * ThemeProvider component
 * Manages dark mode + color palette state with localStorage persistence and
 * system preference detection. Dark mode toggles the `.dark` class; the
 * palette sets `data-palette` on <html> (see app/themes.css).
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

export type Palette =
  | "default"
  | "warm"
  | "tech"
  | "war"
  | "ocean"
  | "steam"
  | "social"
  | "spotify"
  | "discord"
  | "facebook"
  | "instagram"
  | "youtube"
  | "chatgpt"
  | "elegant";

export interface PaletteOption {
  id: Palette;
  label: string;
  /** Swatch preview: the load-gauge gradient stops (cool → mid → crest). */
  swatches: readonly [string, string, string];
}

/** Selectable palettes; swatches mirror each palette's gauge gradient. */
export const PALETTE_OPTIONS: readonly PaletteOption[] = [
  {
    id: "default",
    label: "Fresh (default)",
    swatches: [
      "oklch(0.6 0.118 184.7)",
      "oklch(0.52 0.15 262)",
      "oklch(0.68 0.18 45)",
    ],
  },
  {
    id: "warm",
    label: "Warm Ember",
    swatches: [
      "oklch(0.78 0.14 85)",
      "oklch(0.62 0.19 40)",
      "oklch(0.68 0.24 33)",
    ],
  },
  {
    id: "tech",
    label: "Tech Neon",
    swatches: [
      "oklch(0.68 0.14 215)",
      "oklch(0.52 0.21 285)",
      "oklch(0.62 0.23 335)",
    ],
  },
  {
    id: "war",
    label: "War Camo",
    swatches: [
      "oklch(0.6 0.09 120)",
      "oklch(0.5 0.09 85)",
      "oklch(0.54 0.19 28)",
    ],
  },
  {
    id: "ocean",
    label: "Ocean Tide",
    swatches: [
      "oklch(0.68 0.12 195)",
      "oklch(0.52 0.15 245)",
      "oklch(0.68 0.17 35)",
    ],
  },
  {
    id: "steam",
    label: "Steam Deck",
    swatches: [
      "oklch(0.7 0.11 235)",
      "oklch(0.5 0.12 250)",
      "oklch(0.7 0.18 125)",
    ],
  },
  {
    id: "social",
    label: "Social Pop",
    swatches: [
      "oklch(0.7 0.13 230)",
      "oklch(0.55 0.21 310)",
      "oklch(0.72 0.17 55)",
    ],
  },
  {
    id: "spotify",
    label: "Spotify Green",
    swatches: [
      "oklch(0.75 0.13 160)",
      "oklch(0.58 0.16 152)",
      "oklch(0.78 0.2 135)",
    ],
  },
  {
    id: "discord",
    label: "Discord Blurple",
    swatches: [
      "oklch(0.7 0.12 250)",
      "oklch(0.55 0.2 280)",
      "oklch(0.65 0.2 350)",
    ],
  },
  {
    id: "facebook",
    label: "Facebook Blue",
    swatches: [
      "oklch(0.7 0.13 235)",
      "oklch(0.52 0.19 262)",
      "oklch(0.7 0.19 140)",
    ],
  },
  {
    id: "instagram",
    label: "Instagram Sunset",
    swatches: [
      "oklch(0.55 0.17 275)",
      "oklch(0.55 0.21 330)",
      "oklch(0.75 0.15 70)",
    ],
  },
  {
    id: "youtube",
    label: "YouTube Red",
    swatches: [
      "oklch(0.6 0.04 250)",
      "oklch(0.55 0.18 30)",
      "oklch(0.63 0.25 29)",
    ],
  },
  {
    id: "chatgpt",
    label: "ChatGPT Teal",
    swatches: [
      "oklch(0.7 0.1 190)",
      "oklch(0.55 0.11 172)",
      "oklch(0.7 0.14 160)",
    ],
  },
  {
    id: "elegant",
    label: "Elegant Noir",
    swatches: [
      "oklch(0.62 0.06 325)",
      "oklch(0.46 0.11 325)",
      "oklch(0.7 0.13 85)",
    ],
  },
] as const;

const PALETTE_IDS = PALETTE_OPTIONS.map((option) => option.id);

function isPalette(value: string | null): value is Palette {
  return value !== null && (PALETTE_IDS as string[]).includes(value);
}

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  palette: Palette;
  setPalette: (palette: Palette) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "theme";
const PALETTE_STORAGE_KEY = "palette";

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
 * Get the initial palette from localStorage
 */
function getInitialPalette(): Palette {
  if (typeof window === "undefined") {
    return "default";
  }

  const stored = localStorage.getItem(PALETTE_STORAGE_KEY);
  return isPalette(stored) ? stored : "default";
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

/**
 * Apply palette to document — default palette means no attribute so the base
 * tokens in globals.css apply untouched.
 */
function applyPalette(palette: Palette): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  if (palette === "default") {
    delete root.dataset.palette;
  } else {
    root.dataset.palette = palette;
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

  const palette = useSyncExternalStore<Palette>(
    subscribeToTheme,
    getInitialPalette,
    () => "default"
  );

  // Sync the resolved theme + palette to the DOM whenever they change.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    applyPalette(palette);
  }, [palette]);

  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);
    notifyThemeChange();
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  const setPalette = useCallback((newPalette: Palette) => {
    localStorage.setItem(PALETTE_STORAGE_KEY, newPalette);
    applyPalette(newPalette);
    notifyThemeChange();
  }, []);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      setTheme,
      palette,
      setPalette,
    }),
    [theme, toggleTheme, setTheme, palette, setPalette]
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
