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
import { useSettings } from "@/context/SettingsContext";
import { validateImportData, validateDrillData } from "@/lib/drill/validation";
import { showValidationErrors, addGlobalNotification } from "@/components/ErrorNotification";
import { useProgress } from "@/hooks/useProgress";

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
  const { settings, updateSettings } = useSettings();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [pendingExportType, setPendingExportType] = useState<"image" | "pdf" | "print" | null>(null);
  const [pendingImageFormat, setPendingImageFormat] = useState<"png" | "jpeg">("png");
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewOptions, setPreviewOptions] = useState<ExportOptions | null>(null);
  const progress = useProgress();

  // 保存・読み込み関数
  const handleSave = useCallback(() => {
    try {
      const success = saveDrillToLocalStorage(sets);
      if (success) {
        addGlobalNotification({
          type: "success",
          message: "ドリルデータを保存しました",
        });
      } else {
        addGlobalNotification({
          type: "error",
          message: "保存に失敗しました",
        });
      }
    } catch (error) {
      addGlobalNotification({
        type: "error",
        message: "保存に失敗しました",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }, [sets]);

  const handleLoad = useCallback(() => {
    if (confirm("現在のデータを上書きしますか？")) {
      progress.start("データを読み込んでいます...");
      try {
        const savedSets = loadDrillFromLocalStorage();
        if (savedSets && savedSets.length > 0) {
          progress.update(50, "データを復元しています...");
          isRestoringRef.current = true;
          restoreState(savedSets, [], savedSets[0]?.id || "");
          setTimeout(() => {
            isRestoringRef.current = false;
            progress.complete();
            addGlobalNotification({
              type: "success",
              message: "ドリルデータを読み込みました",
            });
          }, 0);
        } else {
          progress.reset();
          addGlobalNotification({
            type: "warning",
            message: "保存されたデータが見つかりませんでした",
          });
        }
      } catch (error) {
        progress.reset();
        addGlobalNotification({
          type: "error",
          message: "データの読み込みに失敗しました",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }, [restoreState, isRestoringRef, progress]);

  const handleExportJSON = useCallback(() => {
    try {
      progress.start("JSONをエクスポートしています...");
      progress.update(50, "データを変換しています...");
      const json = exportDrillToJSON(sets, settings);
      progress.update(80, "ファイルを準備しています...");
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `drill-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      progress.complete();
      addGlobalNotification({
        type: "success",
        message: "JSONファイルをエクスポートしました",
      });
    } catch (error) {
      progress.reset();
      addGlobalNotification({
        type: "error",
        message: "JSONのエクスポートに失敗しました",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }, [sets, settings, progress]);

  const handleImportJSON = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      progress.start("JSONファイルを読み込んでいます...");
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const jsonString = event.target?.result as string;
          
          progress.update(20, "JSONを解析しています...");
          // まずJSONをパース
          let parsedData: any;
          try {
            parsedData = JSON.parse(jsonString);
          } catch (parseError) {
            progress.reset();
            addGlobalNotification({
              type: "error",
              message: "JSONファイルの解析に失敗しました",
              details: parseError instanceof Error ? parseError.message : String(parseError),
            });
            return;
          }

          progress.update(40, "データを検証しています...");
          // バリデーション
          const validation = validateImportData(parsedData);
          if (!validation.valid || !validation.data) {
            progress.reset();
            addGlobalNotification({
              type: "error",
              message: validation.error || "データの検証に失敗しました",
            });
            return;
          }

          // 追加のバリデーション（メンバー情報も含めて）
          const fullValidation = validateDrillData(
            validation.data.sets,
            members,
            validation.data.settings || settings
          );

          // 警告がある場合は表示
          if (fullValidation.warnings.length > 0) {
            showValidationErrors([], fullValidation.warnings);
          }

          // エラーがある場合はインポートを中止
          if (!fullValidation.valid) {
            progress.reset();
            showValidationErrors(fullValidation.errors, []);
            addGlobalNotification({
              type: "error",
              message: "データにエラーがあります。インポートを中止しました。",
            });
            return;
          }

          // インポート実行
          if (confirm("現在のデータを上書きしますか？")) {
            progress.update(70, "データを復元しています...");
            isRestoringRef.current = true;
            // 設定を復元
            if (validation.data.settings) {
              updateSettings(validation.data.settings);
            }
            const firstSetId = validation.data.sets[0]?.id || "";
            restoreState(validation.data.sets, [], firstSetId);
            setTimeout(() => {
              isRestoringRef.current = false;
              progress.complete();
              addGlobalNotification({
                type: "success",
                message: "ドリルデータをインポートしました",
              });
            }, 0);
          } else {
            progress.reset();
          }
        } catch (error) {
          progress.reset();
          addGlobalNotification({
            type: "error",
            message: "インポートに失敗しました",
            details: error instanceof Error ? error.message : String(error),
          });
        }
      };
      reader.onerror = () => {
        progress.reset();
        addGlobalNotification({
          type: "error",
          message: "ファイルの読み込みに失敗しました",
        });
      };
      reader.readAsText(file);
    };
    input.click();
  }, [restoreState, isRestoringRef, updateSettings, members, settings, progress]);

  // YAMLエクスポート
  const handleExportYAML = useCallback(() => {
    try {
      progress.start("YAMLをエクスポートしています...");
      progress.update(50, "データを変換しています...");
      const yamlString = exportDrillToYAML(sets, settings);
      progress.update(80, "ファイルを準備しています...");
      const blob = new Blob([yamlString], { type: "text/yaml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `drill-${new Date().toISOString().split("T")[0]}.yaml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      progress.complete();
      addGlobalNotification({
        type: "success",
        message: "YAMLファイルをエクスポートしました",
      });
    } catch (error) {
      progress.reset();
      addGlobalNotification({
        type: "error",
        message: "YAMLのエクスポートに失敗しました",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }, [sets, settings, progress]);

  // YAMLインポート
  const handleImportYAML = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".yaml,.yml,text/yaml";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      progress.start("YAMLファイルを読み込んでいます...");
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const yamlString = event.target?.result as string;
          progress.update(20, "YAMLを解析しています...");
          const result = importDrillFromYAML(yamlString);
          
          if (!result || !result.sets || result.sets.length === 0) {
            progress.reset();
            addGlobalNotification({
              type: "error",
              message: "インポートに失敗しました。ファイル形式を確認してください。",
            });
            return;
          }

          progress.update(40, "データを検証しています...");
          // バリデーション
          const validation = validateImportData({
            sets: result.sets,
            members: members,
            settings: result.settings,
          });

          if (!validation.valid || !validation.data) {
            progress.reset();
            addGlobalNotification({
              type: "error",
              message: validation.error || "データの検証に失敗しました",
            });
            return;
          }

          // 追加のバリデーション
          const fullValidation = validateDrillData(
            validation.data.sets,
            members,
            validation.data.settings || settings
          );

          // 警告がある場合は表示
          if (fullValidation.warnings.length > 0) {
            showValidationErrors([], fullValidation.warnings);
          }

          // エラーがある場合はインポートを中止
          if (!fullValidation.valid) {
            progress.reset();
            showValidationErrors(fullValidation.errors, []);
            addGlobalNotification({
              type: "error",
              message: "データにエラーがあります。インポートを中止しました。",
            });
            return;
          }

          // インポート実行
          if (confirm("現在のデータを上書きしますか？")) {
            progress.update(70, "データを復元しています...");
            isRestoringRef.current = true;
            // 設定を復元
            if (result.settings) {
              updateSettings(result.settings);
            }
            restoreState(result.sets, [], result.sets[0]?.id || "");
            setTimeout(() => {
              isRestoringRef.current = false;
              progress.complete();
              addGlobalNotification({
                type: "success",
                message: "ドリルデータをインポートしました",
              });
            }, 0);
          } else {
            progress.reset();
          }
        } catch (error) {
          progress.reset();
          addGlobalNotification({
            type: "error",
            message: "インポートに失敗しました",
            details: error instanceof Error ? error.message : String(error),
          });
        }
      };
      reader.onerror = () => {
        progress.reset();
        addGlobalNotification({
          type: "error",
          message: "ファイルの読み込みに失敗しました",
        });
      };
      reader.readAsText(file);
    };
    input.click();
  }, [restoreState, isRestoringRef, updateSettings, members, settings, progress]);

  // 画像エクスポート（オプション選択後）
  const handleExportImageWithOptions = useCallback(
    async (format: "png" | "jpeg", options: ExportOptions, drillDataName?: string) => {
      if (!canvasRef.current) {
        addGlobalNotification({
          type: "error",
          message: "キャンバスが読み込まれていません",
        });
        return;
      }

      const cancelHandler = () => {
        progress.reset();
      };
      progress.setCancelHandler(cancelHandler);

      try {
        progress.start("画像をエクスポートしています...");
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

        // 選択されたSETがある場合は複数エクスポート
        const setsToExport = options.selectedSetIds && options.selectedSetIds.length > 0
          ? sets.filter(s => options.selectedSetIds!.includes(s.id))
          : [currentSet];

        if (setsToExport.length === 0) {
          alert("エクスポートするSETが選択されていません");
          return;
        }

        // 複数SETの場合はZIPにまとめる
        if (setsToExport.length > 1) {
          const JSZip = (await import("jszip")).default;
          const zip = new JSZip();

          const originalSetId = currentSetId;
          
          // 各SETの画像を生成
          for (const set of setsToExport) {
            // SETを一時的に切り替えて画像を取得
            if (setCurrentSetId && set.id !== currentSetId) {
              setCurrentSetId(set.id);
              // SET切り替え後の描画を待つ
              await new Promise(resolve => setTimeout(resolve, 300));
            }

            if (!canvasRef.current) {
              console.warn(`Set ${set.id} のキャンバスが読み込まれていません`);
              continue;
            }

            const fieldBlob = await canvasRef.current.exportImage(format, 2);
            if (!fieldBlob) {
              console.warn(`Set ${set.id} のフィールド画像の取得に失敗しました`);
              continue;
            }

            const finalBlob = await exportSetWithInfo(
              fieldBlob,
              set,
              options,
              format
            );

            if (finalBlob) {
              // ファイル名: {baseName}_{setName}_{timestamp}.{format}
              const setName = set.name || `Set_${Math.round(set.startCount)}`;
              const sanitizedName = setName.replace(/[^a-zA-Z0-9_-]/g, "_");
              const filename = `${baseName}_${sanitizedName}_${timestamp}.${format}`;
              zip.file(filename, finalBlob);
            }
          }

          // 元のSETに戻す
          if (setCurrentSetId && originalSetId !== currentSetId) {
            setCurrentSetId(originalSetId);
          }

          // ZIPファイルを生成してダウンロード
          progress.update(95, "ZIPファイルを生成しています...");
          const zipBlob = await zip.generateAsync({ type: "blob" });
          const zipFilename = `${baseName}_${timestamp}.zip`;
          const url = URL.createObjectURL(zipBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = zipFilename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          progress.complete();
          addGlobalNotification({
            type: "success",
            message: `${setsToExport.length}個のSETをZIPファイルにエクスポートしました`,
          });
        } else {
          // 単一SETの場合は従来通り
          const set = setsToExport[0];
          
          progress.update(30, "SETを切り替えています...");
          // SETを一時的に切り替えて画像を取得（必要に応じて）
          if (setCurrentSetId && set.id !== currentSetId) {
            setCurrentSetId(set.id);
            await new Promise(resolve => setTimeout(resolve, 300));
          }

          progress.update(50, "画像を生成しています...");
          const fieldBlob = await canvasRef.current.exportImage(format, 2);
          if (!fieldBlob) {
            progress.reset();
            addGlobalNotification({
              type: "error",
              message: "フィールド画像の取得に失敗しました",
            });
            return;
          }

          progress.update(80, "画像を処理しています...");
          const finalBlob = await exportSetWithInfo(
            fieldBlob,
            set,
            options,
            format
          );

          if (finalBlob) {
            // ファイル名: {baseName}_{setName}_{timestamp}.{format}
            const setName = set.name || `Set_${Math.round(set.startCount)}`;
            const sanitizedName = setName.replace(/[^a-zA-Z0-9_-]/g, "_");
            const filename = `${baseName}_${sanitizedName}_${timestamp}.${format}`;
            progress.update(95, "ファイルをダウンロードしています...");
            downloadImage(finalBlob, filename);
            progress.complete();
            addGlobalNotification({
              type: "success",
              message: "画像をエクスポートしました",
            });
          } else {
            progress.reset();
            addGlobalNotification({
              type: "error",
              message: "画像のエクスポートに失敗しました",
            });
          }
        }
      } catch (error) {
        console.error("Export error:", error);
        progress.reset();
        addGlobalNotification({
          type: "error",
          message: "画像のエクスポートに失敗しました",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [canvasRef, currentSet, currentSetId, sets, setCurrentSetId, progress]
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
    async (options: ExportOptions, includeAllSets: boolean = false, drillDataName?: string) => {
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
          },
          drillDataName
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
            
            await printCurrentSet(elementToPrint, set, options, members);
            
            // ページ分割: setsPerPageに基づいて待機
            const setsPerPage = options.setsPerPage ?? 1;
            const shouldWait = (i + 1) % setsPerPage === 0 && i < setsToPrint.length - 1;
            if (shouldWait) {
              // ページが変わる場合は少し長めに待機
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else if (i < setsToPrint.length - 1) {
              // 同じページ内の場合は短めに待機
              await new Promise(resolve => setTimeout(resolve, 300));
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
          await printCurrentSet(canvasElement as HTMLElement, currentSet, options, members);
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
    (options: ExportOptions, drillDataName?: string) => {
      if (pendingExportType === "image") {
        handleExportImageWithOptions(pendingImageFormat, options, drillDataName);
      } else if (pendingExportType === "pdf") {
        handleExportPDFWithOptions(options, false, drillDataName);
      } else if (pendingExportType === "print") {
        handlePrintWithOptions(options);
      }
      setPendingExportType(null);
    },
    [pendingExportType, pendingImageFormat, handleExportImageWithOptions, handleExportPDFWithOptions, handlePrintWithOptions]
  );

  // プレビュー機能（印刷時のみ）
  const handlePreview = useCallback(
    (options: ExportOptions) => {
      // プレビュー生成前にグリッドの表示状態を設定
      // options.showGridが設定されていない場合は、settings.showGridを使用
      const shouldShowGrid = options.showGrid !== undefined ? options.showGrid : settings.showGrid;
      
      // グリッドの表示状態を一時的に更新（プレビュー用）
      if (shouldShowGrid !== settings.showGrid) {
        updateSettings({ showGrid: shouldShowGrid });
        // グリッドの表示状態が変わるので、少し待ってからプレビューを開く
        setTimeout(() => {
          setPreviewOptions(options);
          setPreviewDialogOpen(true);
        }, 100);
      } else {
        setPreviewOptions(options);
        setPreviewDialogOpen(true);
      }
    },
    [settings.showGrid, updateSettings]
  );

  const handlePreviewPrint = useCallback(() => {
    if (previewOptions) {
      handlePrintWithOptions(previewOptions);
      setPreviewDialogOpen(false);
      setPreviewOptions(null);
    }
  }, [previewOptions, handlePrintWithOptions]);

  return {
    exportDialogOpen,
    setExportDialogOpen,
    pendingExportType,
    previewDialogOpen,
    setPreviewDialogOpen,
    previewOptions,
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
    handlePreview,
    handlePreviewPrint,
    progress,
  };
}

