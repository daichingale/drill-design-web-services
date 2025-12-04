// components/drill/VideoConverterPanel.tsx
"use client";

import { useState, useRef } from "react";
import { convertWebMToMP4, downloadVideo } from "@/lib/drill/videoConverter";
import { addGlobalNotification } from "@/components/ErrorNotification";

export default function VideoConverterPanel() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      addGlobalNotification({
        type: "error",
        message: "動画ファイルを選択してください",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleConvert = async () => {
    if (!selectedFile) return;

    setIsConverting(true);
    setConversionProgress(0);

    try {
      // ファイルをBlobに変換
      const webmBlob = new Blob([await selectedFile.arrayBuffer()], {
        type: selectedFile.type,
      });

      const mp4Blob = await convertWebMToMP4(webmBlob, (progress) => {
        setConversionProgress(progress);
      });

      // 元のファイル名から拡張子を変更
      const originalName = selectedFile.name.replace(/\.[^/.]+$/, "");
      const filename = `${originalName}.mp4`;
      downloadVideo(mp4Blob, filename);

      addGlobalNotification({
        type: "success",
        message: "MP4への変換が完了しました",
      });

      // ファイル選択をリセット
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("MP4変換エラー:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      addGlobalNotification({
        type: "error",
        message: `MP4への変換に失敗しました: ${errorMessage}`,
      });
    } finally {
      setIsConverting(false);
      setConversionProgress(0);
    }
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3 space-y-3">
      <h2 className="text-xs font-semibold text-slate-300 mb-2">
        WebM → MP4変換
      </h2>

      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/webm,video/*"
          onChange={handleFileSelect}
          disabled={isConverting}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isConverting}
          className="w-full px-3 py-2 text-xs rounded bg-slate-700/30 hover:bg-slate-700/50 disabled:bg-slate-800/40 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-200 hover:text-slate-100 transition-colors"
        >
          {selectedFile ? selectedFile.name : "WebMファイルを選択"}
        </button>

        {selectedFile && (
          <div className="text-[10px] text-slate-400">
            選択中: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
          </div>
        )}

        <button
          onClick={handleConvert}
          disabled={!selectedFile || isConverting}
          className="w-full px-3 py-2 text-xs rounded-md bg-gradient-to-r from-blue-600/90 to-blue-700/90 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-700/30 disabled:to-slate-700/30 disabled:text-slate-500 disabled:cursor-not-allowed text-white border border-blue-500/50 shadow-md hover:shadow-lg transition-all duration-200"
          title="選択したWebMファイルをMP4（H.264）に変換します（ブラウザ上で処理されます）"
        >
          {isConverting
            ? `MP4変換中... ${Math.round(conversionProgress)}%`
            : "MP4に変換（H.264）"}
        </button>

        {isConverting && (
          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${conversionProgress}%` }}
            />
          </div>
        )}

        <p className="text-[10px] text-slate-400 leading-relaxed">
          録画したWebMファイルをアップロードして、MP4（H.264）形式に変換できます。
          <br />
          変換はブラウザ上で実行されるため、サーバー負荷はありません。
        </p>
      </div>
    </div>
  );
}

