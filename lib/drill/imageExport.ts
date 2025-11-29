// lib/drill/imageExport.ts
// セット情報を含む画像エクスポート機能

import type { UiSet } from "./uiTypes";
import type { ExportOptions } from "@/components/drill/ExportOptionsDialog";

/**
 * セット情報を画像に描画してエクスポート
 */
export async function exportSetWithInfo(
  fieldImageBlob: Blob,
  set: UiSet,
  options: ExportOptions,
  format: "png" | "jpeg" = "png"
): Promise<Blob | null> {
  try {
    // フィールド画像を読み込み
    const fieldImageUrl = URL.createObjectURL(fieldImageBlob);
    const fieldImg = new Image();
    
    await new Promise<void>((resolve, reject) => {
      fieldImg.onload = () => resolve();
      fieldImg.onerror = () => reject(new Error("Failed to load field image"));
      fieldImg.src = fieldImageUrl;
    });

    // キャンバスを作成
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(fieldImageUrl);
      return null;
    }

    // テキスト情報の高さを計算
    const padding = 20;
    const lineHeight = 24;
    const titleSize = 28;
    const textSize = 14;
    const sectionGap = 16;
    
    let infoHeight = padding;
    
    if (options.includeSetName) {
      infoHeight += titleSize + sectionGap;
    }
    if (options.includeCount) {
      infoHeight += lineHeight + sectionGap;
    }
    if (options.includeNote && set.note) {
      const noteLines = wrapText(ctx, set.note, fieldImg.width - padding * 2, textSize);
      infoHeight += lineHeight + (noteLines.length * lineHeight) + sectionGap;
    }
    if (options.includeInstructions && set.instructions) {
      const instructionLines = wrapText(
        ctx,
        set.instructions,
        fieldImg.width - padding * 2,
        textSize
      );
      infoHeight += lineHeight + (instructionLines.length * lineHeight) + sectionGap;
    }

    // キャンバスサイズを設定
    const canvasHeight = (options.includeField ? fieldImg.height : 0) + infoHeight + padding;
    canvas.width = fieldImg.width;
    canvas.height = canvasHeight;

    // 背景を白に設定
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let currentY = padding;

    // セット名
    if (options.includeSetName) {
      ctx.fillStyle = "#000000";
      ctx.font = `bold ${titleSize}px Arial`;
      ctx.fillText(set.name || "Set", padding, currentY + titleSize);
      currentY += titleSize + sectionGap;
    }

    // 開始カウント
    if (options.includeCount) {
      ctx.fillStyle = "#333333";
      ctx.font = `${textSize}px Arial`;
      ctx.fillText(`Start Count: ${set.startCount}`, padding, currentY + textSize);
      currentY += lineHeight + sectionGap;
    }

    // ノート
    if (options.includeNote && set.note) {
      ctx.fillStyle = "#000000";
      ctx.font = `bold ${textSize}px Arial`;
      ctx.fillText("Note:", padding, currentY + textSize);
      currentY += lineHeight;

      ctx.fillStyle = "#333333";
      ctx.font = `${textSize}px Arial`;
      const noteLines = wrapText(ctx, set.note, canvas.width - padding * 2, textSize);
      noteLines.forEach((line) => {
        ctx.fillText(line, padding, currentY + textSize);
        currentY += lineHeight;
      });
      currentY += sectionGap;
    }

    // 動き方・指示
    if (options.includeInstructions && set.instructions) {
      ctx.fillStyle = "#000000";
      ctx.font = `bold ${textSize}px Arial`;
      ctx.fillText("動き方・指示:", padding, currentY + textSize);
      currentY += lineHeight;

      ctx.fillStyle = "#333333";
      ctx.font = `${textSize}px Arial`;
      const instructionLines = wrapText(
        ctx,
        set.instructions,
        canvas.width - padding * 2,
        textSize
      );
      instructionLines.forEach((line) => {
        ctx.fillText(line, padding, currentY + textSize);
        currentY += lineHeight;
      });
      currentY += sectionGap;
    }

    // フィールド画像を描画
    if (options.includeField) {
      ctx.drawImage(fieldImg, 0, currentY);
    }

    URL.revokeObjectURL(fieldImageUrl);

    // キャンバスをBlobに変換
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        format === "jpeg" ? "image/jpeg" : "image/png",
        0.95
      );
    });
  } catch (error) {
    console.error("Failed to export image with info:", error);
    return null;
  }
}

/**
 * テキストを折り返す
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  ctx.font = `${fontSize}px Arial`;

  words.forEach((word) => {
    const testLine = currentLine + (currentLine ? " " : "") + word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

