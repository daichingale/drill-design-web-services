// context/I18nContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import type { Language, TranslationKey } from "@/lib/i18n/translations";
import { translations } from "@/lib/i18n/translations";

const STORAGE_KEY = "drill-language";
const DEFAULT_LANGUAGE: Language = "ja";

type I18nContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return DEFAULT_LANGUAGE;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "ja" || stored === "en") {
        return stored;
      }
    } catch (error) {
      console.error("Failed to load language from storage:", error);
    }
    return DEFAULT_LANGUAGE;
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (error) {
      console.error("Failed to save language to storage:", error);
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[language][key] || key;
    },
    [language]
  );

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}






