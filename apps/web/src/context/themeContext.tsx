import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  darkMode: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const THEME_MODE_KEY = 'theme_mode';
const LEGACY_DARK_MODE_KEY = 'dark_mode';

const getSystemDarkMode = (): boolean => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const readInitialThemeMode = (): ThemeMode => {
  if (typeof window === 'undefined') return 'system';
  const storedMode = window.localStorage.getItem(THEME_MODE_KEY);
  if (storedMode === 'system' || storedMode === 'light' || storedMode === 'dark') {
    return storedMode;
  }

  const legacyDarkMode = window.localStorage.getItem(LEGACY_DARK_MODE_KEY);
  if (legacyDarkMode === 'true') return 'dark';
  if (legacyDarkMode === 'false') return 'light';
  return 'system';
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>(readInitialThemeMode);
  const [systemDarkMode, setSystemDarkMode] = useState<boolean>(getSystemDarkMode);
  const darkMode = themeMode === 'system' ? systemDarkMode : themeMode === 'dark';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    window.localStorage.setItem(THEME_MODE_KEY, themeMode);
    window.localStorage.setItem(LEGACY_DARK_MODE_KEY, String(darkMode));
  }, [darkMode, themeMode]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => setSystemDarkMode(event.matches);

    setSystemDarkMode(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setThemeMode(darkMode ? 'light' : 'dark');
  }, [darkMode]);

  const value = useMemo(() => ({ darkMode, themeMode, setThemeMode, toggleDarkMode }), [
    darkMode,
    themeMode,
    toggleDarkMode,
  ]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useThemeContext must be used within a ThemeProvider');
  return context;
};
