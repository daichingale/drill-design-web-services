// hooks/useCanvasZoom.ts
"use client";

import { useState, useCallback } from "react";

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;

/**
 * キャンバスのズーム機能を管理するフック
 */
export function useCanvasZoom(initialScale: number = 1) {
  const [canvasScale, setCanvasScale] = useState(initialScale);

  const handleZoomIn = useCallback(() => {
    setCanvasScale((prev) => Math.min(prev + 0.1, MAX_SCALE));
  }, []);

  const handleZoomOut = useCallback(() => {
    setCanvasScale((prev) => Math.max(prev - 0.1, MIN_SCALE));
  }, []);

  const handleZoomReset = useCallback(() => {
    setCanvasScale(1);
  }, []);

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

