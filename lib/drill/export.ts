// lib/drill/export.ts
// PDF・印刷・画像エクスポート機能

import jsPDF from "jspdf";
import type { UiSet } from "./uiTypes";
import type { Member } from "@/context/MembersContext";

// HTMLエスケープ関数
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export type ExportPDFOptions = {
  pageSize: "A4" | "A3" | "Letter";
  orientation: "portrait" | "landscape";
  margin: number;
  showGrid: boolean;
  showLabels: boolean;
  includeAllSets: boolean;
  setsPerPage: number;
  selectedSetIds?: string[]; // 選択されたSetのIDリスト
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
  },
  drillDataName?: string
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

    // selectedSetIdsが指定されている場合はそれを使用、そうでなければ従来の動作
    const setsToExport = pdfOptions.selectedSetIds
      ? sets.filter((s) => pdfOptions.selectedSetIds!.includes(s.id))
      : pdfOptions.includeAllSets
      ? sets
      : sets.filter((s) => s.id === currentSetId);

    const setsPerPage = pdfOptions.setsPerPage || 1;
    let setsOnCurrentPage = 0;
    let currentY = margin;

    for (let i = 0; i < setsToExport.length; i++) {
      // 新しいページが必要な場合
      if (i > 0 && setsOnCurrentPage >= setsPerPage) {
        pdf.addPage();
        currentY = margin;
        setsOnCurrentPage = 0;
      }

      const set = setsToExport[i];
      
      // 複数セット/ページの場合、セット間のスペースを追加
      if (setsOnCurrentPage > 0) {
        currentY += 10; // セット間のスペース（10mm）
      }

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

      // フィールド画像とテキストボックスを横並びに配置
      const textBoxWidth = 60; // mm
      const fieldMargin = margin;
      const fieldMaxWidth = pageWidth - margin * 2 - textBoxWidth - 10; // 10mmは間隔
      const fieldMaxHeight = pageHeight - currentY - margin - 10;

      // セットの画像を取得
      let actualImageHeight = 0;
      if (contentOptions.includeField !== false) {
        const imageBlob = await getSetImage(set.id);
        if (imageBlob) {
          await new Promise<void>((resolve, reject) => {
            const imageUrl = URL.createObjectURL(imageBlob);
            const img = new Image();
            img.onload = () => {
              try {
                let imgWidth = img.width * 0.264583; // px to mm
                let imgHeight = img.height * 0.264583;

                const aspectRatio = imgWidth / imgHeight;

                if (imgWidth > fieldMaxWidth) {
                  imgWidth = fieldMaxWidth;
                  imgHeight = imgWidth / aspectRatio;
                }

                if (imgHeight > fieldMaxHeight) {
                  imgHeight = fieldMaxHeight;
                  imgWidth = imgHeight * aspectRatio;
                }

                // 画像の実際の高さを記録
                actualImageHeight = imgHeight;

                // 画像を左側に配置
                const imageX = fieldMargin;
                const imageY = currentY + 5;

                pdf.addImage(
                  imageUrl,
                  "PNG",
                  imageX,
                  imageY,
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

      // テキストボックスを右側に配置
      const textBoxX = pageWidth - margin - textBoxWidth;
      const textBoxY = currentY + 5;
      const textBoxHeight = Math.min(80, pageHeight - textBoxY - margin - 10); // 最大80mm

      // テキストボックスを3分割（Move、Note、次の動き）
      const boxHeight = textBoxHeight / 3 - 1;
      const gap = 1;

      // Move（動き方・指示）テキストボックス
      if (contentOptions.includeInstructions !== false) {
        pdf.setLineWidth(0.5);
        pdf.rect(textBoxX, textBoxY, textBoxWidth, boxHeight);

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text("Move（動き方・指示）", textBoxX + 2, textBoxY + 5);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        const instructionLines = pdf.splitTextToSize(
          set.instructions || "（未記入）",
          textBoxWidth - 4
        );
        pdf.text(instructionLines, textBoxX + 2, textBoxY + 10);
      }

      // Note（メモ）テキストボックス
      if (contentOptions.includeNote !== false) {
        const noteBoxY = textBoxY + boxHeight + gap;
        pdf.setLineWidth(0.5);
        pdf.rect(textBoxX, noteBoxY, textBoxWidth, boxHeight);

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text("Note（メモ）", textBoxX + 2, noteBoxY + 5);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        const noteLines = pdf.splitTextToSize(
          set.note || "（未記入）",
          textBoxWidth - 4
        );
        pdf.text(noteLines, textBoxX + 2, noteBoxY + 10);
      }

      // 次の動きテキストボックス
      const nextMoveBoxY = textBoxY + (boxHeight + gap) * 2;
      pdf.setLineWidth(0.5);
      pdf.rect(textBoxX, nextMoveBoxY, textBoxWidth, boxHeight);

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("次の動き", textBoxX + 2, nextMoveBoxY + 5);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      const nextMoveLines = pdf.splitTextToSize(
        set.nextMove || "（未記入）",
        textBoxWidth - 4
      );
      pdf.text(nextMoveLines, textBoxX + 2, nextMoveBoxY + 10);
      
      // 現在のセットの高さを計算（画像の高さ + テキストボックスの高さ + 余白）
      const setHeight = Math.max(actualImageHeight, textBoxHeight) + 20; // 余裕を持たせる
      
      setsOnCurrentPage++;
      
      // 次のセットのためにY位置を更新
      if (setsOnCurrentPage < setsPerPage && i < setsToExport.length - 1) {
        // 次のセットが同じページに収まる場合
        currentY += setHeight;
      } else {
        // ページが満杯になった、または最後のセット
        // 次のループで新しいページが開始される
      }
    }

    // PDFをダウンロード
    // 日時を生成（YYYYMMDDHHmm形式）
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const timestamp = `${year}${month}${day}${hours}${minutes}`;

    // ファイル名のベース部分（drillDataNameがあれば使用、なければ"drill"）
    const baseName = drillDataName && drillDataName.trim() ? drillDataName.trim() : "drill";

    const filename = pdfOptions.includeAllSets || (pdfOptions.selectedSetIds && pdfOptions.selectedSetIds.length > 1)
      ? `${baseName}_${timestamp}.pdf`
      : `${baseName}_${timestamp}.pdf`;

    pdf.save(filename);
  } catch (error) {
    console.error("Failed to export PDF:", error);
    alert("PDFのエクスポートに失敗しました");
  }
}

/**
 * 選択されたセットを印刷
 */
export function printSelectedSets(
  sets: UiSet[],
  selectedSetIds: string[],
  getSetCanvas: (setId: string) => HTMLElement | null,
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
  if (selectedSetIds.length === 0) {
    alert("印刷するSetを選択してください");
    return;
  }

  const setsToPrint = sets.filter(s => selectedSetIds.includes(s.id));
  
  // 複数Setの場合は各Setごとに印刷ウィンドウを開く
  setsToPrint.forEach((set, index) => {
    const canvasElement = getSetCanvas(set.id);
    if (!canvasElement && options.includeField !== false) {
      console.warn(`Set ${set.id} のキャンバスが見つかりません`);
    }
    
    printSingleSet(canvasElement, set, options, index === 0);
  });
}

/**
 * 単一のセットを印刷
 */
function printSingleSet(
  canvasElement: HTMLElement | null,
  set: UiSet,
  options: {
    includeSetName?: boolean;
    includeCount?: boolean;
    includeNote?: boolean;
    includeInstructions?: boolean;
    includeField?: boolean;
    showGrid?: boolean;
    showMemberInfo?: boolean;
    customHeader?: string;
    customFooter?: string;
  },
  members?: Member[],
  isFirst: boolean = true
): void {
  const printWindow = window.open("", isFirst ? "_blank" : "_blank");
  if (!printWindow) {
    if (isFirst) {
      alert("ポップアップがブロックされています。印刷を許可してください。");
    }
    return;
  }

  // カスタムヘッダー
  const customHeaderHTML = options.customHeader
    ? `<div class="print-custom-header">${escapeHtml(options.customHeader).replace(/\n/g, "<br>")}</div>`
    : "";

  // セット情報のHTMLを生成（タイトルとカウントのみ）
  let headerHTML = customHeaderHTML;

  if (options.includeSetName !== false) {
    headerHTML += `<div class="print-title">${set.name || "Set"}</div>`;
  }

  if (options.includeCount !== false) {
    headerHTML += `<div class="print-count">Start Count: ${set.startCount}</div>`;
  }

  // メンバー情報のHTMLを生成
  let memberInfoHTML = "";
  if (options.showMemberInfo !== false && members && members.length > 0) {
    const membersInSet = members.filter(m => set.positions[m.id]);
    if (membersInSet.length > 0) {
      memberInfoHTML = `
        <div class="print-member-info">
          <div class="print-member-info-label">メンバー情報</div>
          <div class="print-member-list">
            ${membersInSet.map(m => {
              const pos = set.positions[m.id];
              return `<div class="print-member-item">
                <span class="print-member-name">${escapeHtml(m.name)}</span>
                <span class="print-member-part">(${escapeHtml(m.part)})</span>
                <span class="print-member-pos">x: ${pos.x.toFixed(1)}, y: ${pos.y.toFixed(1)}</span>
              </div>`;
            }).join("")}
          </div>
        </div>
      `;
    }
  }

  // カスタムフッター
  const customFooterHTML = options.customFooter
    ? `<div class="print-custom-footer">${escapeHtml(options.customFooter).replace(/\n/g, "<br>")}</div>`
    : "";

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
          .print-content-wrapper {
            display: flex;
            gap: 20px;
            align-items: flex-start;
          }
          .print-canvas-container {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: flex-start;
          }
          .print-canvas img,
          .print-canvas canvas {
            max-width: 100%;
            height: auto;
            border: 1px solid #ccc;
          }
          .print-text-boxes {
            width: 250px;
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            gap: 15px;
          }
          .print-text-box {
            border: 2px solid #000;
            padding: 12px;
            background: white;
            min-height: 150px;
          }
          .print-text-box-label {
            font-size: 14px;
            font-weight: bold;
            color: #000;
            margin-bottom: 8px;
            border-bottom: 1px solid #000;
            padding-bottom: 4px;
          }
          .print-text-box-content {
            font-size: 11px;
            color: #333;
            line-height: 1.5;
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          .print-text-box-content:empty::before {
            content: "（未記入）";
            color: #999;
            font-style: italic;
          }
          .print-custom-header {
            font-size: 14px;
            font-weight: bold;
            color: #000;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 2px solid #000;
          }
          .print-custom-footer {
            font-size: 11px;
            color: #666;
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #ccc;
            text-align: center;
          }
          .print-member-info {
            margin-top: 15px;
            padding: 10px;
            border: 1px solid #ccc;
            background: #f9f9f9;
          }
          .print-member-info-label {
            font-size: 12px;
            font-weight: bold;
            color: #000;
            margin-bottom: 8px;
          }
          .print-member-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 5px;
          }
          .print-member-item {
            font-size: 10px;
            color: #333;
            padding: 3px 0;
          }
          .print-member-name {
            font-weight: bold;
          }
          .print-member-part {
            color: #666;
            margin: 0 5px;
          }
          .print-member-pos {
            color: #999;
            font-family: monospace;
            font-size: 9px;
          }
          .print-canvas {
            ${options.showGrid === false ? `
            /* グリッド線を非表示 */
            .grid-line {
              display: none !important;
            }
            ` : ""}
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          ${headerHTML}
        </div>
        <div class="print-content-wrapper">
          ${options.includeField !== false && canvasElement ? `<div class="print-canvas-container">
            <div class="print-canvas">
              ${canvasElement.outerHTML}
            </div>
          </div>` : ""}
          <div class="print-text-boxes">
            ${memberInfoHTML}
            ${options.includeInstructions !== false ? `<div class="print-text-box">
              <div class="print-text-box-label">Move（動き方・指示）</div>
              <div class="print-text-box-content">${set.instructions ? escapeHtml(set.instructions).replace(/\n/g, "<br>") : "（未記入）"}</div>
            </div>` : ""}
            ${options.includeNote !== false ? `<div class="print-text-box">
              <div class="print-text-box-label">Note（メモ）</div>
              <div class="print-text-box-content">${set.note ? escapeHtml(set.note).replace(/\n/g, "<br>") : "（未記入）"}</div>
            </div>` : ""}
            <div class="print-text-box">
              <div class="print-text-box-label">次の動き</div>
              <div class="print-text-box-content">${set.nextMove ? escapeHtml(set.nextMove).replace(/\n/g, "<br>") : "（未記入）"}</div>
            </div>
          </div>
        </div>
        ${customFooterHTML}
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, isFirst ? 500 : 1000); // 複数Setの場合は少し遅延
  };
}

/**
 * 現在のセットを印刷（後方互換性のため）
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
    showGrid?: boolean;
    showMemberInfo?: boolean;
    customHeader?: string;
    customFooter?: string;
  } = {
    includeSetName: true,
    includeCount: true,
    includeNote: true,
    includeInstructions: true,
    includeField: true,
    showGrid: true,
    showMemberInfo: true,
  },
  members?: Member[]
): void {
  printSingleSet(canvasElement, set, options, members, true);
}

