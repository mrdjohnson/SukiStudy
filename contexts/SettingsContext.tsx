import React, { createContext, useContext, useState, useEffect } from 'react';

interface SettingsContextType {
  soundEnabled: boolean;
  toggleSound: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('suki_sound');
    return saved !== 'false';
  });

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const newVal = !prev;
      localStorage.setItem('suki_sound', String(newVal));
      return newVal;
    });
  };

  return (
    <SettingsContext.Provider value={{ soundEnabled, toggleSound }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within SettingsProvider");
  return context;
};