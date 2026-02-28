import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
export type Currency = 'MXN' | 'USD' | 'EUR';
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
export type Theme = 'light' | 'dark';
export type StartDay = 'monday' | 'sunday';

export interface AppSettings {
  fontSize: FontSize;
  currency: Currency;
  dateFormat: DateFormat;
  theme: Theme;
  weekStartDay: StartDay;
  showCents: boolean;
  compactCards: boolean;
  avatarAnimations: boolean;
  notificationsEnabled: boolean;
}

const SETTINGS_KEY = 'sheriff-settings';

const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 'medium',
  currency: 'MXN',
  dateFormat: 'DD/MM/YYYY',
  theme: 'light',
  weekStartDay: 'monday',
  showCents: true,
  compactCards: false,
  avatarAnimations: true,
  notificationsEnabled: false,
};

const FONT_SIZE_MAP: Record<FontSize, string> = {
  small: '14px',
  medium: '16px',
  large: '18px',
  xlarge: '20px',
};

const SettingsContext = createContext<{
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  resetSettings: () => void;
} | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {}
    return DEFAULT_SETTINGS;
  });

  const applyFontSize = useCallback((size: FontSize) => {
    document.documentElement.style.fontSize = FONT_SIZE_MAP[size];
  }, []);

  useEffect(() => {
    applyFontSize(settings.fontSize);
  }, [settings.fontSize, applyFontSize]);

  const updateSetting = useCallback(<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch {}
      if (key === 'fontSize') applyFontSize(value as FontSize);
      return next;
    });
  }, [applyFontSize]);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS)); } catch {}
    applyFontSize(DEFAULT_SETTINGS.fontSize);
  }, [applyFontSize]);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

const CURRENCY_LOCALE: Record<Currency, string> = {
  MXN: 'es-MX',
  USD: 'en-US',
  EUR: 'de-DE',
};

export function useFormatCurrency() {
  const { settings } = useSettings();
  const locale = CURRENCY_LOCALE[settings.currency];
  return (n: number) =>
    (settings.showCents
      ? new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: settings.currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: settings.currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })
    ).format(n);
}
