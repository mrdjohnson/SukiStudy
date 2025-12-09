
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Step {
  title: string;
  description: string;
  icon: React.ElementType;
}

interface SettingsContextType {
  soundEnabled: boolean;
  toggleSound: () => void;
  romajiEnabled: boolean;
  toggleRomaji: () => void;
  helpSteps: Step[] | null;
  setHelpSteps: (steps: Step[] | null) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('suki_sound');
    return saved !== 'false';
  });

  const [romajiEnabled, setRomajiEnabled] = useState(() => {
    const saved = localStorage.getItem('suki_romaji');
    return saved !== 'false';
  });

  const [helpSteps, setHelpSteps] = useState<Step[] | null>(null);

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const newVal = !prev;
      localStorage.setItem('suki_sound', String(newVal));
      return newVal;
    });
  };

  const toggleRomaji = () => {
    setRomajiEnabled(prev => {
      const newVal = !prev;
      localStorage.setItem('suki_romaji', String(newVal));
      return newVal;
    });
  };

  return (
    <SettingsContext.Provider value={{ soundEnabled, toggleSound, romajiEnabled, toggleRomaji, helpSteps, setHelpSteps }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within SettingsProvider");
  return context;
};
