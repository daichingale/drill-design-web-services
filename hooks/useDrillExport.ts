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
import { downloadImage, exportSetsToPDF, printCurrentSet } from "@/lib/drill/export";
import { exportSetWithInfo } from "@/lib/drill/imageExport";

type UseDrillExportParams = {
  sets: UiSet[];
  currentSet: UiSet;
  currentSetId: string;
  members: Member[];
  canvasRef: React.RefObject<FieldCanvasRef | null>;
  restoreState: (sets: UiSet[], selectedIds: string[], currentSetId: string) => void;
  isRestoringRef: React.MutableRefObject<boolean>;
};

export function useDrillExport({
  sets,
  currentSet,
  currentSetId,
  members,
  canvasRef,
  restoreState,
  isRestoringRef,
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
        const getSetImage = async (setId: string): Promise<Blob | null> => {
          if (setId === currentSetId) {
            return await canvasRef.current?.exportImage("png", 2) || null;
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
            includeAllSets,
            setsPerPage: 1,
          },
          {
            includeSetName: options.includeSetName,
            includeCount: options.includeCount,
            includeNote: options.includeNote,
            includeInstructions: options.includeInstructions,
            includeField: options.includeField,
          }
        );
      } catch (error) {
        console.error("PDF export error:", error);
        alert("PDFのエクスポートに失敗しました");
      }
    },
    [canvasRef, sets, members, currentSetId]
  );

  // 印刷（ダイアログを開く）
  const handlePrint = useCallback(() => {
    setPendingExportType("print");
    setExportDialogOpen(true);
  }, []);

  // 印刷（オプション選択後）
  const handlePrintWithOptions = useCallback(
    async (options: ExportOptions) => {
      const canvasElement = document.querySelector(".field-canvas-container");
      if (!canvasElement) {
        alert("印刷する要素が見つかりません");
        return;
      }

      try {
        await printCurrentSet(canvasElement as HTMLElement, currentSet, options);
      } catch (error) {
        console.error("Print error:", error);
        alert("印刷に失敗しました");
      }
    },
    [currentSet]
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

