// components/ContextHelp.tsx
"use client";

import { useState, ReactNode } from "react";

type Props = {
  title: string;
  content: ReactNode;
  children?: ReactNode;
};

export default function ContextHelp({ title, content, children }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {children ? (
        <div
          className="inline-flex items-center"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          {children}
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors"
          title="ヘルプ"
        >
          ?
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-lg max-h-[90vh] rounded-xl border border-slate-700/80 bg-gradient-to-br from-slate-900/95 to-slate-950/95 shadow-2xl overflow-hidden flex flex-col"
            onMouseLeave={() => setIsOpen(false)}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/80 bg-slate-800/60">
              <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 text-xs text-slate-300 leading-relaxed">
              {content}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

