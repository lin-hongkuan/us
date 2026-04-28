import React, { createContext, useContext, useMemo, useState } from 'react';
import { UserType } from '../types';

interface SessionContextValue {
  currentUser: UserType | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserType | null>>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const value = useMemo(() => ({ currentUser, setCurrentUser }), [currentUser]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSessionContext = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSessionContext must be used within a SessionProvider');
  return context;
};
