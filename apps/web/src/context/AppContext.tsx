import React, { createContext, useContext, useMemo } from 'react';
import { UserType } from '../types';
import { type ConfirmDialogState, type ToastMessage } from '../components/ToastHost';
import { SessionProvider, useSessionContext } from './sessionContext';
import { ThemeProvider, useThemeContext, type ThemeMode } from './themeContext';
import { FeedbackProvider, useFeedbackContext } from './feedbackContext';
import { SoundProvider, useSoundContext, type ClickSoundType } from './audioContext';
import { PreferencesProvider, usePreferencesContext, type DefaultLandingTab } from './preferencesContext';

interface AppContextType {
  currentUser: UserType | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserType | null>>;
  darkMode: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleDarkMode: () => void;
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
  playClickSound: (type?: ClickSoundType) => void;
  playRefreshSound: (progress: number) => void;
  playLoadCompleteSound: () => void;
  playSuccessSound: () => void;
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  requestConfirm: (dialog: Omit<ConfirmDialogState, 'id'>) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const AppContextBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const session = useSessionContext();
  const theme = useThemeContext();
  const preferences = usePreferencesContext();
  const sound = useSoundContext();
  const feedback = useFeedbackContext();

  const contextValue = useMemo(() => ({
    ...session,
    ...theme,
    ...preferences,
    ...sound,
    ...feedback,
  }), [session, theme, preferences, sound, feedback]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SessionProvider>
      <ThemeProvider>
        <PreferencesProvider>
          <SoundProvider>
            <FeedbackProvider>
              <AppContextBridge>{children}</AppContextBridge>
            </FeedbackProvider>
          </SoundProvider>
        </PreferencesProvider>
      </ThemeProvider>
    </SessionProvider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
