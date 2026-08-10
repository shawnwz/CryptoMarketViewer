import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { setFormatCurrency, setFormatLocale } from '../lib/format';
import i18n, { isSupportedLanguage, SupportedLanguage } from '../lib/i18n';

const STORAGE_KEY = 'app_language';

const FORMAT_LOCALES: Record<SupportedLanguage, string> = {
  en: 'en-US',
  zh: 'zh-CN',
  ja: 'ja-JP',
};

// Currency follows language rather than being picked separately — switching
// language and switching currency are both rare, related decisions (a reader
// of Chinese is overwhelmingly likely to want CNY), so a second picker would
// mostly just be one more setting nobody touches independently.
const CURRENCY_BY_LANGUAGE: Record<SupportedLanguage, string> = {
  en: 'USD',
  zh: 'CNY',
  ja: 'JPY',
};

function detectDeviceLanguage(): SupportedLanguage {
  const code = Localization.getLocales()[0]?.languageCode;
  return code && isSupportedLanguage(code) ? code : 'en';
}

function applyLanguage(lang: SupportedLanguage) {
  i18n.changeLanguage(lang);
  setFormatLocale(FORMAT_LOCALES[lang]);
  setFormatCurrency(CURRENCY_BY_LANGUAGE[lang]);
}

type LanguageContextValue = {
  language: SupportedLanguage;
  currency: string;
  setLanguage: (lang: SupportedLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>('en');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        const initial = saved && isSupportedLanguage(saved) ? saved : detectDeviceLanguage();
        applyLanguage(initial);
        setLanguageState(initial);
      })
      .catch(() => {
        const fallback = detectDeviceLanguage();
        applyLanguage(fallback);
        setLanguageState(fallback);
      });
  }, []);

  const setLanguage = (lang: SupportedLanguage) => {
    applyLanguage(lang);
    setLanguageState(lang);
    AsyncStorage.setItem(STORAGE_KEY, lang);
  };

  return (
    <LanguageContext.Provider value={{ language, currency: CURRENCY_BY_LANGUAGE[language], setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
