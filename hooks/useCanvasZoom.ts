// hooks/useCanvasZoom.ts
"use client";

import { useState, useCallback } from "react";

const MIN_SCALE = 0.3; // 最小スケールを0.3に変更（より小さくズームアウト可能）
const MAX_SCALE = 2.5;

/**
 * キャンバスのズーム機能を管理するフック
 */
export function useCanvasZoom(initialScale: number = 1) {
  const [canvasScale, setCanvasScale] = useState(initialScale);
  
  // 初期スケールが設定されている場合、それをリセット値として保存
  const [resetScale] = useState(initialScale);

  const handleZoomIn = useCallback(() => {
    setCanvasScale((prev) => Math.min(prev + 0.1, MAX_SCALE));
  }, []);

  const handleZoomOut = useCallback(() => {
    setCanvasScale((prev) => Math.max(prev - 0.1, MIN_SCALE));
  }, []);

  const handleZoomReset = useCallback(() => {
    setCanvasScale(resetScale);
  }, [resetScale]);

  const setZoom = useCallback((scale: number) => {
    setCanvasScale(Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale)));
  }, []);

  return {
    canvasScale,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    setZoom,
    MIN_SCALE,
    MAX_SCALE,
  };
}

