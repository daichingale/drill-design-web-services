// components/LanguageToggle.tsx
"use client";

import { useI18n } from "@/context/I18nContext";
import type { Language } from "@/lib/i18n/translations";

export default function LanguageToggle() {
  const { language, setLanguage } = useI18n();

  const toggleLanguage = () => {
    const newLang: Language = language === "ja" ? "en" : "ja";
    setLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="px-3 py-1.5 rounded-md bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/60 text-slate-200 hover:text-slate-100 transition-all duration-200 text-sm"
      title={language === "ja" ? "Switch to English" : "日本語に切り替え"}
    >
      {language === "ja" ? "🇯🇵" : "🇺🇸"}
    </button>
  );
}

