"use client";

import LanguageToggle from "@/components/LanguageToggle";
import UserMenu from "@/components/UserMenu";

export default function HeaderControls() {
  const handleOpenHelp = () => {
    if (typeof window === "undefined") return;
    const event = new CustomEvent("open-editor-help");
    window.dispatchEvent(event);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="flex items-center justify-center w-7 h-7 rounded-full border border-slate-600/70 bg-slate-800/70 hover:bg-slate-700/80 text-slate-200 text-xs shadow-sm hover:shadow transition-colors"
        onClick={handleOpenHelp}
        title="ヘルプを開く"
      >
        ?
      </button>
      <LanguageToggle />
      <UserMenu />
    </div>
  );
}








