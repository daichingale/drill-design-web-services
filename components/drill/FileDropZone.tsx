// components/drill/FileDropZone.tsx
"use client";

import { useState, useCallback, DragEvent } from "react";
import { importDrillFromJSON, importDrillFromYAML } from "@/lib/drill/storage";
import { addGlobalNotification } from "@/components/ErrorNotification";
import type { UiSet } from "@/lib/drill/uiTypes";
import type { Member } from "@/context/MembersContext";
import type { Settings } from "@/context/SettingsContext";

type FileDropZoneProps = {
  onImport: (data: { sets: UiSet[]; members?: Member[]; settings?: Settings }) => void;
  children: React.ReactNode;
};

export default function FileDropZone({ onImport, children }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragging(false);
      }
      return newCounter;
    });
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setDragCounter(0);

      const files = Array.from(e.dataTransfer.files);
      const jsonFiles = files.filter(
        (file) => file.type === "application/json" || file.name.endsWith(".json")
      );
      const yamlFiles = files.filter(
        (file) => file.type === "text/yaml" || file.name.endsWith(".yaml") || file.name.endsWith(".yml")
      );

      if (jsonFiles.length === 0 && yamlFiles.length === 0) {
        addGlobalNotification({
          type: "warning",
          message: "JSONまたはYAMLファイルをドロップしてください",
        });
        return;
      }

      // JSONファイルを処理
      for (const file of jsonFiles) {
        try {
          const text = await file.text();
          const result = importDrillFromJSON(text);
          if (result) {
            onImport(result);
            addGlobalNotification({
              type: "success",
              message: `${file.name} を読み込みました`,
            });
          } else {
            addGlobalNotification({
              type: "error",
              message: `${file.name} の読み込みに失敗しました`,
            });
          }
        } catch (error) {
          console.error("Failed to import JSON file:", error);
          addGlobalNotification({
            type: "error",
            message: `${file.name} の読み込みに失敗しました`,
          });
        }
      }

      // YAMLファイルを処理
      for (const file of yamlFiles) {
        try {
          const text = await file.text();
          const result = importDrillFromYAML(text);
          if (result) {
            onImport(result);
            addGlobalNotification({
              type: "success",
              message: `${file.name} を読み込みました`,
            });
          } else {
            addGlobalNotification({
              type: "error",
              message: `${file.name} の読み込みに失敗しました`,
            });
          }
        } catch (error) {
          console.error("Failed to import YAML file:", error);
          addGlobalNotification({
            type: "error",
            message: `${file.name} の読み込みに失敗しました`,
          });
        }
      }
    },
    [onImport]
  );

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative"
    >
      {children}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border-2 border-dashed border-emerald-400 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">📁</div>
            <div className="text-xl font-semibold text-emerald-400 mb-2">
              ファイルをドロップ
            </div>
            <div className="text-sm text-slate-400">
              JSONまたはYAMLファイルをドロップして読み込みます
            </div>
          </div>
        </div>
      )}
    </div>
  );
}












