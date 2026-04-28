import React, { createContext, useContext, useMemo } from 'react';
import { UserType } from '../types';
import { type ConfirmDialogState, type ToastMessage } from '../components/ToastHost';
import { SessionProvider, useSessionContext } from './sessionContext';
import { ThemeProvider, useThemeContext } from './themeContext';
import { FeedbackProvider, useFeedbackContext } from './feedbackContext';
import { SoundProvider, useSoundContext, type ClickSoundType } from './audioContext';

interface AppContextType {
  currentUser: UserType | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserType | null>>;
  darkMode: boolean;
  toggleDarkMode: () => void;
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
  const sound = useSoundContext();
  const feedback = useFeedbackContext();

  const contextValue = useMemo(() => ({
    ...session,
    ...theme,
    ...sound,
    ...feedback,
  }), [session, theme, sound, feedback]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SessionProvider>
      <ThemeProvider>
        <SoundProvider>
          <FeedbackProvider>
            <AppContextBridge>{children}</AppContextBridge>
          </FeedbackProvider>
        </SoundProvider>
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
