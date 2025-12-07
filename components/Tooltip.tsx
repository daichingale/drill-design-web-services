// components/Tooltip.tsx
"use client";

import { useState, useRef, useEffect, ReactNode } from "react";

type Props = {
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  children: ReactNode;
  className?: string;
};

export default function Tooltip({
  content,
  position = "top",
  children,
  className = "",
}: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible || !tooltipRef.current || !containerRef.current) return;

    const tooltip = tooltipRef.current;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 8;

    let style: React.CSSProperties = {};
    let finalPosition = position;

    // 位置を計算して画面内に収まるように調整
    switch (position) {
      case "top": {
        const centerX = rect.left + rect.width / 2;
        let left = centerX - tooltipRect.width / 2;
        let top = rect.top - tooltipRect.height - margin;

        // 左端を超える場合は左端に合わせる
        if (left < margin) {
          left = margin;
        }
        // 右端を超える場合は右端に合わせる
        if (left + tooltipRect.width > viewportWidth - margin) {
          left = viewportWidth - tooltipRect.width - margin;
        }
        // 上にスペースがない場合は下に表示
        if (top < margin) {
          top = rect.bottom + margin;
          finalPosition = "bottom";
        }

        style = { left: `${left}px`, top: `${top}px`, transform: "none" };
        break;
      }
      case "bottom": {
        const centerX = rect.left + rect.width / 2;
        let left = centerX - tooltipRect.width / 2;
        let top = rect.bottom + margin;

        if (left < margin) {
          left = margin;
        }
        if (left + tooltipRect.width > viewportWidth - margin) {
          left = viewportWidth - tooltipRect.width - margin;
        }
        if (top + tooltipRect.height > viewportHeight - margin) {
          top = rect.top - tooltipRect.height - margin;
          finalPosition = "top";
        }

        style = { left: `${left}px`, top: `${top}px`, transform: "none" };
        break;
      }
      case "left": {
        const centerY = rect.top + rect.height / 2;
        let left = rect.left - tooltipRect.width - margin;
        let top = centerY - tooltipRect.height / 2;

        if (top < margin) {
          top = margin;
        }
        if (top + tooltipRect.height > viewportHeight - margin) {
          top = viewportHeight - tooltipRect.height - margin;
        }
        if (left < margin) {
          left = rect.right + margin;
          finalPosition = "right";
        }

        style = { left: `${left}px`, top: `${top}px`, transform: "none" };
        break;
      }
      case "right": {
        const centerY = rect.top + rect.height / 2;
        let left = rect.right + margin;
        let top = centerY - tooltipRect.height / 2;

        if (top < margin) {
          top = margin;
        }
        if (top + tooltipRect.height > viewportHeight - margin) {
          top = viewportHeight - tooltipRect.height - margin;
        }
        if (left + tooltipRect.width > viewportWidth - margin) {
          left = rect.left - tooltipRect.width - margin;
          finalPosition = "left";
        }

        style = { left: `${left}px`, top: `${top}px`, transform: "none" };
        break;
      }
    }

    setAdjustedPosition(finalPosition);
    setTooltipStyle(style);
  }, [isVisible, position]);

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-slate-700 border-l-transparent border-r-transparent border-b-transparent",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-slate-700 border-l-transparent border-r-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-slate-700 border-t-transparent border-b-transparent border-r-transparent",
    right: "right-full top-1/2 -translate-y-1/2 border-r-slate-700 border-t-transparent border-b-transparent border-l-transparent",
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 px-2 py-1 text-xs text-slate-200 bg-slate-700 rounded shadow-lg whitespace-nowrap max-w-[90vw]"
          style={tooltipStyle}
        >
          {content}
          <div
            className={`absolute w-0 h-0 border-4 ${arrowClasses[adjustedPosition]}`}
            style={{
              // 矢印の位置を調整
              left: adjustedPosition === "left" || adjustedPosition === "right" ? "50%" : undefined,
              top: adjustedPosition === "top" || adjustedPosition === "bottom" ? "50%" : undefined,
            }}
          />
        </div>
      )}
    </div>
  );
}

