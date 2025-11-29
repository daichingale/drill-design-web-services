// lib/drill/export.ts
// PDF・印刷・画像エクスポート機能

import jsPDF from "jspdf";
import type { UiSet } from "./uiTypes";
import type { Member } from "@/context/MembersContext";

export type ExportPDFOptions = {
  pageSize: "A4" | "A3" | "Letter";
  orientation: "portrait" | "landscape";
  margin: number;
  showGrid: boolean;
  showLabels: boolean;
  includeAllSets: boolean;
  setsPerPage: number;
};

export type PDFContentOptions = {
  includeSetName?: boolean;
  includeCount?: boolean;
  includeNote?: boolean;
  includeInstructions?: boolean;
  includeField?: boolean;
};

/**
 * 画像をダウンロード
 */
export function downloadImage(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * セットをPDFにエクスポート
 */
export async function exportSetsToPDF(
  sets: UiSet[],
  members: Member[],
  currentSetId: string,
  getSetImage: (setId: string) => Promise<Blob | null>,
  pdfOptions: ExportPDFOptions = {
    pageSize: "A4",
    orientation: "landscape",
    margin: 10,
    showGrid: true,
    showLabels: true,
    includeAllSets: false,
    setsPerPage: 1,
  },
  contentOptions: PDFContentOptions = {
    includeSetName: true,
    includeCount: true,
    includeNote: true,
    includeInstructions: true,
    includeField: true,
  }
): Promise<void> {
  try {
    const pdf = new jsPDF({
      orientation: pdfOptions.orientation,
      unit: "mm",
      format: pdfOptions.pageSize,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = pdfOptions.margin || 10;

    const setsToExport = pdfOptions.includeAllSets
      ? sets
      : sets.filter((s) => s.id === currentSetId);

    for (let i = 0; i < setsToExport.length; i++) {
      if (i > 0) {
        pdf.addPage();
      }

      const set = setsToExport[i];
      let currentY = margin;

      // タイトル（セット名）
      if (contentOptions.includeSetName !== false) {
        pdf.setFontSize(18);
        pdf.setFont("helvetica", "bold");
        pdf.text(set.name || `Set ${i + 1}`, margin, currentY + 5);
        currentY += 8;
      }

      // カウント情報
      if (contentOptions.includeCount !== false) {
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Start Count: ${set.startCount}`, margin, currentY + 5);
        currentY += 6;
      }

      // ノート
      if (contentOptions.includeNote !== false && set.note) {
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text("Note:", margin, currentY + 5);
        pdf.setFont("helvetica", "normal");
        const noteLines = pdf.splitTextToSize(
          set.note,
          pageWidth - margin * 2
        );
        pdf.text(noteLines, margin, currentY + 8);
        currentY += noteLines.length * 5 + 3;
      }

      // 動き方・指示
      if (contentOptions.includeInstructions !== false && set.instructions) {
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text("動き方・指示:", margin, currentY + 5);
        pdf.setFont("helvetica", "normal");
        const instructionLines = pdf.splitTextToSize(
          set.instructions,
          pageWidth - margin * 2
        );
        pdf.text(instructionLines, margin, currentY + 8);
        currentY += instructionLines.length * 5 + 3;
      }

      // セットの画像を取得
      if (contentOptions.includeField !== false) {
        const imageBlob = await getSetImage(set.id);
        if (imageBlob) {
          await new Promise<void>((resolve, reject) => {
            const imageUrl = URL.createObjectURL(imageBlob);
            const img = new Image();
            img.onload = () => {
              try {
                const maxWidth = pageWidth - margin * 2;
                const maxHeight = pageHeight - currentY - margin - 10;

                let imgWidth = img.width * 0.264583; // px to mm
                let imgHeight = img.height * 0.264583;

                const aspectRatio = imgWidth / imgHeight;

                if (imgWidth > maxWidth) {
                  imgWidth = maxWidth;
                  imgHeight = imgWidth / aspectRatio;
                }

                if (imgHeight > maxHeight) {
                  imgHeight = maxHeight;
                  imgWidth = imgHeight * aspectRatio;
                }

                // 画像を中央揃えで配置
                const imageX = margin + (maxWidth - imgWidth) / 2;

                pdf.addImage(
                  imageUrl,
                  "PNG",
                  imageX,
                  currentY + 5,
                  imgWidth,
                  imgHeight
                );

                URL.revokeObjectURL(imageUrl);
                resolve();
              } catch (error) {
                reject(error);
              }
            };
            img.onerror = reject;
            img.src = imageUrl;
          });
        }
      }
    }

    // PDFをダウンロード
    const filename = pdfOptions.includeAllSets
      ? `drill-all-sets-${new Date().toISOString().split("T")[0]}.pdf`
      : `drill-${currentSetId}-${new Date().toISOString().split("T")[0]}.pdf`;

    pdf.save(filename);
  } catch (error) {
    console.error("Failed to export PDF:", error);
    alert("PDFのエクスポートに失敗しました");
  }
}

/**
 * 現在のセットを印刷
 */
export function printCurrentSet(
  canvasElement: HTMLElement,
  set: UiSet,
  options: {
    includeSetName?: boolean;
    includeCount?: boolean;
    includeNote?: boolean;
    includeInstructions?: boolean;
    includeField?: boolean;
  } = {
    includeSetName: true,
    includeCount: true,
    includeNote: true,
    includeInstructions: true,
    includeField: true,
  }
): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("ポップアップがブロックされています。印刷を許可してください。");
    return;
  }

  // セット情報のHTMLを生成
  let headerHTML = "";

  if (options.includeSetName !== false) {
    headerHTML += `<div class="print-title">${set.name || "Set"}</div>`;
  }

  if (options.includeCount !== false) {
    headerHTML += `<div class="print-count">Start Count: ${set.startCount}</div>`;
  }

  if (options.includeNote !== false && set.note) {
    headerHTML += `<div class="print-section">
      <div class="print-label">Note:</div>
      <div class="print-note">${set.note.replace(/\n/g, "<br>")}</div>
    </div>`;
  }

  if (options.includeInstructions !== false && set.instructions) {
    headerHTML += `<div class="print-section">
      <div class="print-label">動き方・指示:</div>
      <div class="print-instructions">${set.instructions.replace(/\n/g, "<br>")}</div>
    </div>`;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${set.name || "Drill Set"}</title>
        <style>
          @media print {
            @page {
              size: A4 landscape;
              margin: 10mm;
            }
            body {
              margin: 0;
              padding: 0;
            }
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
          }
          .print-header {
            margin-bottom: 15px;
          }
          .print-title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 5px;
            color: #000;
          }
          .print-count {
            font-size: 12px;
            color: #666;
            margin-bottom: 10px;
          }
          .print-section {
            margin-bottom: 12px;
          }
          .print-label {
            font-size: 12px;
            font-weight: bold;
            color: #000;
            margin-bottom: 4px;
          }
          .print-note,
          .print-instructions {
            font-size: 12px;
            color: #333;
            line-height: 1.6;
            white-space: pre-wrap;
          }
          .print-canvas {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-top: 10px;
          }
          .print-canvas img,
          .print-canvas canvas {
            max-width: 100%;
            height: auto;
            border: 1px solid #ccc;
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          ${headerHTML}
        </div>
        ${options.includeField !== false ? `<div class="print-canvas">
          ${canvasElement.outerHTML}
        </div>` : ""}
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };
}

