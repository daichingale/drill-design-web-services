// lib/i18n/useTranslation.ts
"use client";

import { useI18n } from "@/context/I18nContext";

export function useTranslation() {
  const { language, t } = useI18n();
  return { language, t };
}






