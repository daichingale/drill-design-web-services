// components/MenuBar.tsx
"use client";

import { useMenu } from "@/context/MenuContext";
import HeaderMenu from "@/components/drill/HeaderMenu";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function MenuBar() {
  const { menuGroups, openCommandPalette } = useMenu();
  const pathname = usePathname();
  const { t } = useTranslation();

  // 常に表示する「表示」メニュー
  const viewMenuGroup = {
    label: t("menu.view"),
    icon: "👁️",
    items: [
      {
        label: t("menu.view.commandPalette"),
        icon: "🔍",
        shortcut: "Ctrl+K",
        action: () => {
          if (openCommandPalette) {
            openCommandPalette();
          }
        },
      },
      { divider: true },
      {
        label: t("menu.view.drillEditor"),
        icon: "🎯",
        action: () => {
          window.location.href = "/drill";
        },
      },
      {
        label: t("menu.view.settings"),
        icon: "⚙️",
        action: () => {
          window.location.href = "/settings";
        },
      },
    ],
  };

  // ページ固有のメニューと「表示」メニューを結合
  const allMenuGroups = [...menuGroups, viewMenuGroup];

  return <HeaderMenu groups={allMenuGroups} />;
}

