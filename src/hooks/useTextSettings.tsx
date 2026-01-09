import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type FontFamily = 'system' | 'serif' | 'georgia' | 'merriweather' | 'roboto' | 'opensans';

interface TextSettings {
  fontSize: number; // 0.85 to 1.2 (multiplier)
  isBold: boolean;
  fontFamily: FontFamily;
}

interface TextSettingsContextType {
  settings: TextSettings;
  setFontSize: (size: number) => void;
  toggleBold: () => void;
  setFontFamily: (font: FontFamily) => void;
  getTextStyle: () => React.CSSProperties;
}

const TextSettingsContext = createContext<TextSettingsContextType | undefined>(undefined);

const STORAGE_KEY = 'text-settings';

const defaultSettings: TextSettings = {
  fontSize: 1,
  isBold: false,
  fontFamily: 'system',
};

const fontFamilyMap: Record<FontFamily, string> = {
  system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  georgia: 'Georgia, serif',
  merriweather: '"Merriweather", Georgia, serif',
  roboto: '"Roboto", system-ui, sans-serif',
  opensans: '"Open Sans", system-ui, sans-serif',
};

export const fontOptions: { value: FontFamily; label: string }[] = [
  { value: 'system', label: 'System Default' },
  { value: 'serif', label: 'Serif' },
  { value: 'georgia', label: 'Georgia' },
  { value: 'merriweather', label: 'Merriweather' },
  { value: 'roboto', label: 'Roboto' },
  { value: 'opensans', label: 'Open Sans' },
];

export function TextSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<TextSettings>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return { ...defaultSettings, ...JSON.parse(stored) };
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const setFontSize = (size: number) => {
    setSettings(prev => ({ ...prev, fontSize: size }));
  };

  const toggleBold = () => {
    setSettings(prev => ({ ...prev, isBold: !prev.isBold }));
  };

  const setFontFamily = (font: FontFamily) => {
    setSettings(prev => ({ ...prev, fontFamily: font }));
  };

  const getTextStyle = (): React.CSSProperties => ({
    fontSize: `${settings.fontSize}rem`,
    fontWeight: settings.isBold ? 600 : 400,
    fontFamily: fontFamilyMap[settings.fontFamily],
  });

  return (
    <TextSettingsContext.Provider value={{ settings, setFontSize, toggleBold, setFontFamily, getTextStyle }}>
      {children}
    </TextSettingsContext.Provider>
  );
}

export function useTextSettings() {
  const context = useContext(TextSettingsContext);
  if (!context) {
    throw new Error('useTextSettings must be used within TextSettingsProvider');
  }
  return context;
}

export type { FontFamily };
