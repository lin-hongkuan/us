import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * 启动时默认落地的视角：
 * - 'last': 跟随上次打开的视角（默认）
 * - 'her' / 'him': 每次都固定落在对应的视角
 */
export type DefaultLandingTab = 'last' | 'her' | 'him';

interface PreferencesContextValue {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  starEffectsEnabled: boolean;
  setStarEffectsEnabled: (enabled: boolean) => void;
  presenceEnabled: boolean;
  setPresenceEnabled: (enabled: boolean) => void;
  reducedMotionEnabled: boolean;
  setReducedMotionEnabled: (enabled: boolean) => void;
  defaultLandingTab: DefaultLandingTab;
  setDefaultLandingTab: (value: DefaultLandingTab) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

const preferenceKeys = {
  soundEnabled: 'preference_sound_enabled',
  starEffectsEnabled: 'preference_star_effects_enabled',
  presenceEnabled: 'preference_presence_enabled',
  reducedMotionEnabled: 'preference_reduced_motion_enabled',
  defaultLandingTab: 'preference_default_landing_tab',
} as const;

const readBooleanPreference = (key: string, fallback: boolean): boolean => {
  if (typeof window === 'undefined') return fallback;
  const stored = window.localStorage.getItem(key);
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  return fallback;
};

const useStoredBooleanPreference = (key: string, fallback: boolean) => {
  const [value, setValue] = useState<boolean>(() => readBooleanPreference(key, fallback));

  useEffect(() => {
    window.localStorage.setItem(key, String(value));
  }, [key, value]);

  return [value, setValue] as const;
};

const readLandingTabPreference = (key: string): DefaultLandingTab => {
  if (typeof window === 'undefined') return 'last';
  const stored = window.localStorage.getItem(key);
  if (stored === 'her' || stored === 'him' || stored === 'last') return stored;
  return 'last';
};

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [soundEnabled, setSoundEnabled] = useStoredBooleanPreference(preferenceKeys.soundEnabled, true);
  const [starEffectsEnabled, setStarEffectsEnabled] = useStoredBooleanPreference(preferenceKeys.starEffectsEnabled, true);
  const [presenceEnabled, setPresenceEnabled] = useStoredBooleanPreference(preferenceKeys.presenceEnabled, true);
  const [reducedMotionEnabled, setReducedMotionEnabled] = useStoredBooleanPreference(preferenceKeys.reducedMotionEnabled, false);
  const [defaultLandingTab, setDefaultLandingTabState] = useState<DefaultLandingTab>(() =>
    readLandingTabPreference(preferenceKeys.defaultLandingTab),
  );

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reducedMotionEnabled);
  }, [reducedMotionEnabled]);

  useEffect(() => {
    window.localStorage.setItem(preferenceKeys.defaultLandingTab, defaultLandingTab);
  }, [defaultLandingTab]);

  const setDefaultLandingTab = useCallback((value: DefaultLandingTab) => {
    setDefaultLandingTabState(value);
  }, []);

  const value = useMemo(() => ({
    soundEnabled,
    setSoundEnabled,
    starEffectsEnabled,
    setStarEffectsEnabled,
    presenceEnabled,
    setPresenceEnabled,
    reducedMotionEnabled,
    setReducedMotionEnabled,
    defaultLandingTab,
    setDefaultLandingTab,
  }), [
    defaultLandingTab,
    presenceEnabled,
    reducedMotionEnabled,
    setDefaultLandingTab,
    setPresenceEnabled,
    setReducedMotionEnabled,
    setSoundEnabled,
    setStarEffectsEnabled,
    soundEnabled,
    starEffectsEnabled,
  ]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

export const usePreferencesContext = () => {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferencesContext must be used within a PreferencesProvider');
  return context;
};
