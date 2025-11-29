// hooks/useDrillExport.ts
"use client";

import { useState, useCallback } from "react";
import type { FieldCanvasRef } from "@/components/drill/FieldCanvas";
import type { ExportOptions } from "@/components/drill/ExportOptionsDialog";
import type { UiSet } from "@/lib/drill/uiTypes";
import type { Member } from "@/context/MembersContext";
import {
  saveDrillToLocalStorage,
  loadDrillFromLocalStorage,
  exportDrillToJSON,
  importDrillFromJSON,
  exportDrillToYAML,
  importDrillFromYAML,
} from "@/lib/drill/storage";
import { downloadImage, exportSetsToPDF, printCurrentSet, printSelectedSets } from "@/lib/drill/export";
import { exportSetWithInfo } from "@/lib/drill/imageExport";
import type { WorldPos } from "@/lib/drill/types";

type UseDrillExportParams = {
  sets: UiSet[];
  currentSet: UiSet;
  currentSetId: string;
  members: Member[];
  canvasRef: React.RefObject<FieldCanvasRef | null>;
  restoreState: (sets: UiSet[], selectedIds: string[], currentSetId: string) => void;
  isRestoringRef: React.MutableRefObject<boolean>;
  setCurrentSetId?: (id: string) => void; // Setを切り替える関数
  getSetPositions?: (setId: string) => Record<string, WorldPos>; // Setの位置情報を取得する関数
};

export function useDrillExport({
  sets,
  currentSet,
  currentSetId,
  members,
  canvasRef,
  restoreState,
  isRestoringRef,
  setCurrentSetId,
  getSetPositions,
}: UseDrillExportParams) {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [pendingExportType, setPendingExportType] = useState<"image" | "pdf" | "print" | null>(null);
  const [pendingImageFormat, setPendingImageFormat] = useState<"png" | "jpeg">("png");

  // 保存・読み込み関数
  const handleSave = useCallback(() => {
    const success = saveDrillToLocalStorage(sets);
    if (success) {
      alert("ドリルデータを保存しました");
    } else {
      alert("保存に失敗しました");
    }
  }, [sets]);

  const handleLoad = useCallback(() => {
    if (confirm("現在のデータを上書きしますか？")) {
      const savedSets = loadDrillFromLocalStorage();
      if (savedSets && savedSets.length > 0) {
        isRestoringRef.current = true;
        restoreState(savedSets, [], savedSets[0]?.id || "");
        setTimeout(() => {
          isRestoringRef.current = false;
        }, 0);
        alert("ドリルデータを読み込みました");
      } else {
        alert("保存されたデータが見つかりませんでした");
      }
    }
  }, [restoreState, isRestoringRef]);

  const handleExportJSON = useCallback(() => {
    const json = exportDrillToJSON(sets);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `drill-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [sets]);

  const handleImportJSON = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const jsonString = event.target?.result as string;
        const importedSets = importDrillFromJSON(jsonString);
        
        if (importedSets && importedSets.length > 0) {
          if (confirm("現在のデータを上書きしますか？")) {
            isRestoringRef.current = true;
            restoreState(importedSets, [], importedSets[0]?.id || "");
            setTimeout(() => {
              isRestoringRef.current = false;
            }, 0);
            alert("ドリルデータをインポートしました");
          }
        } else {
          alert("インポートに失敗しました。ファイル形式を確認してください。");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [restoreState, isRestoringRef]);

  // YAMLエクスポート
  const handleExportYAML = useCallback(() => {
    const yamlString = exportDrillToYAML(sets);
    const blob = new Blob([yamlString], { type: "text/yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `drill-${new Date().toISOString().split("T")[0]}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [sets]);

  // YAMLインポート
  const handleImportYAML = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".yaml,.yml,text/yaml";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const yamlString = event.target?.result as string;
        const importedSets = importDrillFromYAML(yamlString);
        
        if (importedSets && importedSets.length > 0) {
          if (confirm("現在のデータを上書きしますか？")) {
            isRestoringRef.current = true;
            restoreState(importedSets, [], importedSets[0]?.id || "");
            setTimeout(() => {
              isRestoringRef.current = false;
            }, 0);
            alert("ドリルデータをインポートしました");
          }
        } else {
          alert("インポートに失敗しました。ファイル形式を確認してください。");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [restoreState, isRestoringRef]);

  // 画像エクスポート（オプション選択後）
  const handleExportImageWithOptions = useCallback(
    async (format: "png" | "jpeg", options: ExportOptions) => {
      if (!canvasRef.current) {
        alert("キャンバスが読み込まれていません");
        return;
      }

      try {
        const fieldBlob = await canvasRef.current.exportImage(format, 2);
        if (!fieldBlob) {
          alert("フィールド画像の取得に失敗しました");
          return;
        }

        const finalBlob = await exportSetWithInfo(
          fieldBlob,
          currentSet,
          options,
          format
        );

        if (finalBlob) {
          const filename = `drill-${currentSet.name || currentSetId}-${new Date().toISOString().split("T")[0]}.${format}`;
          downloadImage(finalBlob, filename);
        } else {
          alert("画像のエクスポートに失敗しました");
        }
      } catch (error) {
        console.error("Export error:", error);
        alert("画像のエクスポートに失敗しました");
      }
    },
    [canvasRef, currentSet, currentSetId]
  );

  // 画像エクスポート（ダイアログを開く）
  const handleExportImage = useCallback((format: "png" | "jpeg" = "png") => {
    setPendingImageFormat(format);
    setPendingExportType("image");
    setExportDialogOpen(true);
  }, []);

  // PDFエクスポート（ダイアログを開く）
  const handleExportPDF = useCallback((includeAllSets: boolean = false) => {
    setPendingExportType("pdf");
    setExportDialogOpen(true);
  }, []);

  // PDFエクスポート（オプション選択後）
  const handleExportPDFWithOptions = useCallback(
    async (options: ExportOptions, includeAllSets: boolean = false) => {
      if (!canvasRef.current) {
        alert("キャンバスが読み込まれていません");
        return;
      }

      try {
        const originalSetId = currentSetId;
        
        const getSetImage = async (setId: string): Promise<Blob | null> => {
          // Setを一時的に切り替えて画像を取得
          if (setCurrentSetId && setId !== currentSetId) {
            setCurrentSetId(setId);
            // Set切り替え後の描画を待つ（より長めに待機）
            await new Promise(resolve => setTimeout(resolve, 300));
          }

          if (canvasRef.current) {
            try {
              const imageBlob = await canvasRef.current.exportImage("png", 2);
              return imageBlob;
            } catch (error) {
              console.error(`Failed to export image for set ${setId}:`, error);
              return null;
            }
          }
          return null;
        };

        await exportSetsToPDF(
          sets,
          members as any,
          currentSetId,
          getSetImage,
          {
            pageSize: "A4",
            orientation: "landscape",
            margin: 10,
            showGrid: true,
            showLabels: true,
            includeAllSets: includeAllSets && !options.selectedSetIds, // selectedSetIdsがある場合は無視
            setsPerPage: 1,
            selectedSetIds: options.selectedSetIds, // 選択されたSetのIDリスト
          },
          {
            includeSetName: options.includeSetName,
            includeCount: options.includeCount,
            includeNote: options.includeNote,
            includeInstructions: options.includeInstructions,
            includeField: options.includeField,
          }
        );

        // 元のSetに戻す
        if (setCurrentSetId && originalSetId !== currentSetId) {
          setCurrentSetId(originalSetId);
        }
      } catch (error) {
        console.error("PDF export error:", error);
        alert("PDFのエクスポートに失敗しました");
      }
    },
    [canvasRef, sets, members, currentSet, currentSetId, setCurrentSetId]
  );

  // 印刷（ダイアログを開く）
  const handlePrint = useCallback(() => {
    setPendingExportType("print");
    setExportDialogOpen(true);
  }, []);

  // 印刷（オプション選択後）
  const handlePrintWithOptions = useCallback(
    async (options: ExportOptions) => {
      try {
        // 選択されたSetがある場合は複数Setを印刷
        if (options.selectedSetIds && options.selectedSetIds.length > 0) {
          const originalSetId = currentSetId;
          const setsToPrint = sets.filter(s => options.selectedSetIds!.includes(s.id));
          
          for (let i = 0; i < setsToPrint.length; i++) {
            const set = setsToPrint[i];
            
            // Setを一時的に切り替えて画像を取得
            if (setCurrentSetId && set.id !== currentSetId) {
              setCurrentSetId(set.id);
              // Set切り替え後の描画を待つ
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // キャンバス要素を取得
            const canvasElement = document.querySelector(".field-canvas-container");
            if (!canvasElement) {
              console.warn(`Set ${set.id} のキャンバスが見つかりません`);
              continue;
            }
            
            // 画像をエクスポートしてimg要素を作成
            let elementToPrint: HTMLElement | null = null;
            if (canvasRef.current) {
              try {
                const imageBlob = await canvasRef.current.exportImage("png", 2);
                if (imageBlob) {
                  const imageUrl = URL.createObjectURL(imageBlob);
                  const img = document.createElement("img");
                  img.src = imageUrl;
                  img.style.maxWidth = "100%";
                  img.style.height = "auto";
                  img.style.border = "1px solid #ccc";
                  
                  const wrapper = document.createElement("div");
                  wrapper.className = "print-canvas";
                  wrapper.appendChild(img);
                  elementToPrint = wrapper;
                }
              } catch (error) {
                console.error(`Failed to export image for set ${set.id}:`, error);
              }
            }
            
            // 画像が取得できなかった場合は、現在のキャンバス要素を使用
            if (!elementToPrint) {
              elementToPrint = canvasElement as HTMLElement;
            }
            
            await printCurrentSet(elementToPrint, set, options);
            
            // 複数Setの場合は少し待機
            if (i < setsToPrint.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
          
          // 元のSetに戻す
          if (setCurrentSetId && originalSetId !== currentSetId) {
            setCurrentSetId(originalSetId);
          }
        } else {
          // 従来の動作（現在のSetのみ）
          const canvasElement = document.querySelector(".field-canvas-container");
          if (!canvasElement) {
            alert("印刷する要素が見つかりません");
            return;
          }
          await printCurrentSet(canvasElement as HTMLElement, currentSet, options);
        }
      } catch (error) {
        console.error("Print error:", error);
        alert("印刷に失敗しました");
      }
    },
    [currentSet, sets, currentSetId, canvasRef, setCurrentSetId]
  );

  // エクスポートオプション確定時の処理
  const handleExportOptionsConfirm = useCallback(
    (options: ExportOptions) => {
      if (pendingExportType === "image") {
        handleExportImageWithOptions(pendingImageFormat, options);
      } else if (pendingExportType === "pdf") {
        handleExportPDFWithOptions(options, false);
      } else if (pendingExportType === "print") {
        handlePrintWithOptions(options);
      }
      setPendingExportType(null);
    },
    [pendingExportType, pendingImageFormat, handleExportImageWithOptions, handleExportPDFWithOptions, handlePrintWithOptions]
  );

  return {
    exportDialogOpen,
    setExportDialogOpen,
    pendingExportType, // 追加
    handleSave,
    handleLoad,
    handleExportJSON,
    handleImportJSON,
    handleExportYAML,
    handleImportYAML,
    handleExportImage,
    handleExportPDF,
    handlePrint,
    handleExportOptionsConfirm,
  };
}

