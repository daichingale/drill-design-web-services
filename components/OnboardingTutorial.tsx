// components/OnboardingTutorial.tsx
"use client";

import { useState, useEffect, useRef } from "react";

type TutorialStep = {
  id: string;
  title: string;
  content: string;
  target?: string; // CSSセレクタ
  position?: "top" | "bottom" | "left" | "right" | "center";
};

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "ようこそ！",
    content: "ドリルデザインWebサービスへようこそ。このチュートリアルでは、基本的な使い方をご案内します。",
    position: "center",
  },
  {
    id: "field",
    title: "フィールド",
    content: "ここがフィールドです。メンバーをドラッグ&ドロップで配置できます。",
    target: ".field-canvas-container",
    position: "top",
  },
  {
    id: "timeline",
    title: "タイムライン",
    content: "タイムラインでカウントを管理し、SET（セット）を作成できます。ダブルクリックでSETを追加/削除できます。",
    target: ".timeline-container",
    position: "top",
  },
  {
    id: "members",
    title: "メンバー管理",
    content: "右サイドバーでメンバーを追加・管理できます。",
    target: ".drill-side-panel",
    position: "left",
  },
  {
    id: "controls",
    title: "コントロール",
    content: "左サイドバーでSETの操作や整列・変形ができます。",
    target: ".drill-controls",
    position: "right",
  },
];

type Props = {
  onComplete: () => void;
  onSkip: () => void;
};

export default function OnboardingTutorial({ onComplete, onSkip }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 初回起動かどうかを確認
    const hasSeenTutorial = localStorage.getItem("hasSeenTutorial");
    if (!hasSeenTutorial) {
      setIsVisible(true);
    }
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const step = TUTORIAL_STEPS[currentStep];
    if (step?.target) {
      // ターゲット要素をハイライト
      const element = document.querySelector(step.target);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentStep, isVisible]);

  if (!isVisible) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const isLast = currentStep === TUTORIAL_STEPS.length - 1;
  const isFirst = currentStep === 0;

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem("hasSeenTutorial", "true");
      setIsVisible(false);
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("hasSeenTutorial", "true");
    setIsVisible(false);
    onSkip();
  };

  const handlePrevious = () => {
    if (!isFirst) {
      setCurrentStep(currentStep - 1);
    }
  };

  // ターゲット要素の位置を計算（画面内に収まるように調整）
  const getTooltipPosition = () => {
    const tooltipWidth = 320; // w-80 = 320px
    const tooltipHeight = 200; // 概算の高さ
    const margin = 16; // 画面端からの余白

    if (step.position === "center") {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        maxWidth: "90vw",
        maxHeight: "90vh",
      };
    }

    if (step.target) {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;

        let top = 0;
        let left = 0;
        let transform = "";

        switch (step.position) {
          case "top": {
            const centerX = rect.left + rect.width / 2;
            top = Math.max(margin, rect.top + scrollY - tooltipHeight - 10);
            left = Math.max(margin, Math.min(centerX, viewportWidth - tooltipWidth - margin));
            transform = "translate(-50%, -100%)";
            // 上にスペースがない場合は下に表示
            if (rect.top < tooltipHeight + margin) {
              top = rect.bottom + scrollY + 10;
              transform = "translate(-50%, 0)";
            }
            break;
          }
          case "bottom": {
            const centerX = rect.left + rect.width / 2;
            top = rect.bottom + scrollY + 10;
            left = Math.max(margin, Math.min(centerX, viewportWidth - tooltipWidth - margin));
            transform = "translate(-50%, 0)";
            // 下にスペースがない場合は上に表示
            if (rect.bottom + tooltipHeight + margin > viewportHeight) {
              top = Math.max(margin, rect.top + scrollY - tooltipHeight - 10);
              transform = "translate(-50%, -100%)";
            }
            break;
          }
          case "left": {
            const centerY = rect.top + rect.height / 2;
            top = Math.max(margin, Math.min(centerY, viewportHeight - tooltipHeight / 2 - margin));
            left = Math.max(margin, rect.left + scrollX - tooltipWidth - 10);
            transform = "translate(-100%, -50%)";
            // 左にスペースがない場合は右に表示
            if (rect.left < tooltipWidth + margin) {
              left = rect.right + scrollX + 10;
              transform = "translate(0, -50%)";
            }
            break;
          }
          case "right": {
            const centerY = rect.top + rect.height / 2;
            top = Math.max(margin, Math.min(centerY, viewportHeight - tooltipHeight / 2 - margin));
            left = rect.right + scrollX + 10;
            transform = "translate(0, -50%)";
            // 右にスペースがない場合は左に表示
            if (rect.right + tooltipWidth + margin > viewportWidth) {
              left = Math.max(margin, rect.left + scrollX - tooltipWidth - 10);
              transform = "translate(-100%, -50%)";
            }
            break;
          }
        }

        return {
          top: `${top}px`,
          left: `${left}px`,
          transform,
          maxWidth: `${Math.min(tooltipWidth, viewportWidth - margin * 2)}px`,
          maxHeight: `${Math.min(tooltipHeight, viewportHeight - margin * 2)}px`,
        };
      }
    }

    return {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      maxWidth: "90vw",
      maxHeight: "90vh",
    };
  };

  return (
    <>
      {/* オーバーレイ */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
        onClick={step.position === "center" ? undefined : handleNext}
      >
        {/* ハイライト（ターゲット要素を強調） */}
        {step.target && (
          <div
            className="absolute border-4 border-emerald-400 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] pointer-events-none"
            style={{
              ...(() => {
                const element = document.querySelector(step.target);
                if (element) {
                  const rect = element.getBoundingClientRect();
                  return {
                    top: `${rect.top}px`,
                    left: `${rect.left}px`,
                    width: `${rect.width}px`,
                    height: `${rect.height}px`,
                  };
                }
                return {};
              })(),
            }}
          />
        )}
      </div>

      {/* ツールチップ */}
      <div
        className="fixed z-[201] w-80 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg shadow-2xl p-4 overflow-y-auto"
        style={getTooltipPosition()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 mb-1">
              {step.title}
            </h3>
            <p className="text-xs text-slate-400">
              {currentStep + 1} / {TUTORIAL_STEPS.length}
            </p>
          </div>
          <button
            onClick={handleSkip}
            className="text-slate-400 hover:text-slate-200 text-sm"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-300 mb-4 leading-relaxed">
          {step.content}
        </p>

        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={isFirst}
            className="px-3 py-1.5 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            前へ
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleSkip}
              className="px-3 py-1.5 text-xs rounded bg-slate-700/50 hover:bg-slate-700 text-slate-300"
            >
              スキップ
            </button>
            <button
              onClick={handleNext}
              className="px-3 py-1.5 text-xs rounded bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isLast ? "完了" : "次へ"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

