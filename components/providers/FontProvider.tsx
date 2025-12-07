// components/providers/FontProvider.tsx
"use client";

import { useEffect } from "react";
import { useSettings } from "@/context/SettingsContext";

export default function FontProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();

  useEffect(() => {
    const fontFamily = settings.fontFamily === "system"
      ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, 'Noto Sans JP', 'Yu Gothic', 'Yu Gothic Medium', 'MS PGothic', sans-serif"
      : settings.fontFamily;

    document.documentElement.style.setProperty("--font-family", fontFamily);
    document.body.style.fontFamily = fontFamily;
  }, [settings.fontFamily]);

  return <>{children}</>;
}

