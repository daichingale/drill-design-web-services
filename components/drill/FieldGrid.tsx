// components/drill/FieldGrid.tsx
"use client";

import { memo, useMemo, Fragment } from "react";
import { Line } from "react-konva";
import { STEP_M } from "../../lib/drill/utils";

type FieldGridProps = {
  canvasWidth: number;
  canvasHeight: number;
  fieldWidth: number;
  fieldHeight: number;
  showGrid: boolean;
  gridInterval: number;
  baseScaleX: number;
  baseScaleY: number;
};

const FieldGrid = memo(({
  canvasWidth,
  canvasHeight,
  fieldWidth,
  fieldHeight,
  showGrid,
  gridInterval,
  baseScaleX,
  baseScaleY,
}: FieldGridProps) => {
  const stepPxX = useMemo(() => STEP_M * baseScaleX, [baseScaleX]);
  const stepPxY = useMemo(() => STEP_M * baseScaleY, [baseScaleY]);

  if (!showGrid) {
    return null;
  }

  // グリッド線を生成（太線対応）
  const verticalLines = useMemo(() => {
    const lines: Array<{ x: number; isBold: boolean }> = [];
    const maxX = canvasWidth;
    const centerX = canvasWidth / 2;
    for (let x = 0; x <= maxX; x += stepPxX * gridInterval) {
      const stepIndex = Math.round(x / stepPxX);
      const isBold = stepIndex % 8 === 0;
      const isCenterLine = Math.abs(x - centerX) < stepPxX / 2;
      if (!isCenterLine) {
        lines.push({ x, isBold });
      }
    }
    return lines;
  }, [canvasWidth, stepPxX, gridInterval]);

  const horizontalLines = useMemo(() => {
    const lines: Array<{ y: number; isBold: boolean }> = [];
    const maxY = canvasHeight;
    const centerY = canvasHeight / 2;
    for (let y = 0; y <= maxY; y += stepPxY * gridInterval) {
      const stepIndex = Math.round(y / stepPxY);
      const isBold = stepIndex % 8 === 0;
      const isCenterLine = Math.abs(y - centerY) < stepPxY / 2;
      if (!isCenterLine) {
        lines.push({ y, isBold });
      }
    }
    return lines;
  }, [canvasHeight, stepPxY, gridInterval]);

  return (
    <>
      {/* グリッド（縦線） */}
      {verticalLines.map((line, idx) => (
        <Line
          key={`v-${idx}`}
          points={[line.x, 0, line.x, canvasHeight]}
          stroke={line.isBold ? "#64748b" : "rgba(100,116,139,0.3)"}
          strokeWidth={line.isBold ? 2 : 0.5}
          listening={false}
        />
      ))}

      {/* グリッド（横線） */}
      {horizontalLines.map((line, idx) => (
        <Line
          key={`h-${idx}`}
          points={[0, line.y, canvasWidth, line.y]}
          stroke={line.isBold ? "#64748b" : "rgba(100,116,139,0.3)"}
          strokeWidth={line.isBold ? 2 : 0.5}
          listening={false}
        />
      ))}
    </>
  );
});

FieldGrid.displayName = "FieldGrid";

export default FieldGrid;

