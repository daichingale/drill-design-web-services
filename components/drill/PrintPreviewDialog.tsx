// components/drill/PrintPreviewDialog.tsx
"use client";

import { useState, useEffect } from "react";
import { useSettings } from "@/context/SettingsContext";
import type { UiSet } from "@/lib/drill/uiTypes";
import type { Member } from "@/context/MembersContext";
import type { ExportOptions } from "./ExportOptionsDialog";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
  set: UiSet;
  canvasElement: HTMLElement | null;
  options: ExportOptions;
  members?: Member[];
};

export default function PrintPreviewDialog({
  isOpen,
  onClose,
  onPrint,
  set,
  canvasElement,
  options,
  members = [],
}: Props) {
  const { settings } = useSettings();
  const [previewHTML, setPreviewHTML] = useState<string>("");
  
  // グリッド表示の設定を取得（options.showGridが優先、なければsettings.showGrid）
  const shouldShowGrid = options.showGrid !== undefined ? options.showGrid : settings.showGrid;

  useEffect(() => {
    if (!isOpen || !canvasElement) return;

    // プレビュー生成前にグリッドの表示状態を設定
    // options.showGridが設定されていない場合は、settings.showGridを使用
    const shouldShowGrid = options.showGrid !== undefined ? options.showGrid : settings.showGrid;
    
    // グリッドの表示状態を一時的に更新（プレビュー用）
    if (shouldShowGrid !== settings.showGrid) {
      // グリッドの表示状態を更新する必要があるが、これは親コンポーネントで行う必要がある
      // ここでは、プレビュー生成時にグリッドが表示されるようにする
    }

    // 印刷用のHTMLを生成（printSingleSetと同じロジック）
    const escapeHtml = (text: string): string => {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    };

    const customHeaderHTML = options.customHeader
      ? `<div class="print-custom-header">${escapeHtml(options.customHeader).replace(/\n/g, "<br>")}</div>`
      : "";

    let headerHTML = customHeaderHTML;
    if (options.includeSetName !== false) {
      headerHTML += `<div class="print-title">${set.name || "Set"}</div>`;
    }
    if (options.includeCount !== false) {
      headerHTML += `<div class="print-count">Start Count: ${set.startCount}</div>`;
    }

    let memberInfoHTML = "";
    if (options.showMemberInfo !== false && members.length > 0) {
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

    const customFooterHTML = options.customFooter
      ? `<div class="print-custom-footer">${escapeHtml(options.customFooter).replace(/\n/g, "<br>")}</div>`
      : "";

    const html = `
      <div class="print-preview-content">
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
      </div>
    `;

    setPreviewHTML(html);
  }, [isOpen, canvasElement, set, options, members, settings.showGrid]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="rounded-xl border border-slate-700 bg-slate-800 w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">印刷プレビュー</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrint}
              className="px-4 py-2 rounded bg-emerald-600/80 hover:bg-emerald-600 text-white transition-colors text-sm font-semibold"
            >
              印刷
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-slate-700/30 hover:bg-slate-700/50 text-slate-200 transition-colors text-sm"
            >
              閉じる
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6 bg-white">
          <style>{`
            .print-preview-content {
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
            .print-canvas canvas,
            .print-canvas svg {
              /* グリッドはcanvas/svgに既に描画されているため、そのまま表示 */
            }
            ${!shouldShowGrid ? `
            /* グリッド線を非表示にする */
            /* 注意: canvas/svgに既に描画されたグリッドはCSSで非表示にできないため、
               プレビュー生成時にグリッドの表示状態を考慮する必要があります */
            .print-canvas {
              position: relative;
            }
            .print-canvas::after {
              content: "";
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: white;
              opacity: 0.99;
              pointer-events: none;
            }
            ` : ""}
          `}</style>
          <div dangerouslySetInnerHTML={{ __html: previewHTML }} />
        </div>
      </div>
    </div>
  );
}

