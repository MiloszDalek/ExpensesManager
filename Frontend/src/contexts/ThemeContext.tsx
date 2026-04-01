import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeContextType = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const THEME_STORAGE_KEY = "appTheme";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function resolveSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "system";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
    return storedTheme;
  }

  return "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(resolveSystemTheme);
  const resolvedTheme: ResolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => {
      setSystemTheme(mediaQuery.matches ? "dark" : "light");
    };

    updateSystemTheme();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateSystemTheme);
      return () => mediaQuery.removeEventListener("change", updateSystemTheme);
    }

    mediaQuery.addListener(updateSystemTheme);
    return () => mediaQuery.removeListener(updateSystemTheme);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const isDark = resolvedTheme === "dark";

    root.classList.toggle("dark", isDark);
    root.style.colorScheme = resolvedTheme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme, resolvedTheme]);

  const value = useMemo<ThemeContextType>(() => ({
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme: () =>
      setTheme((previous) => {
        const current = previous === "system" ? systemTheme : previous;
        return current === "dark" ? "light" : "dark";
      }),
  }), [theme, resolvedTheme, systemTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
