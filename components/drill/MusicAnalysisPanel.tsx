// components/drill/MusicAnalysisPanel.tsx
"use client";

import { useState, useEffect } from "react";

type MusicAnalysisResult = {
  bpm: number;
  beats: number[];
  time_signature: string | null;
  duration: number | null;
  sections: Array<{
    start: number;
    end: number;
    index: number;
  }> | null;
  tempo_changes: Array<{
    time: number;
    bpm: number;
  }> | null;
  mode: "quick" | "full";
};

type Props = {
  onAnalysisComplete?: (result: MusicAnalysisResult) => void;
  onSectionsDetected?: (sections: Array<{ start: number; end: number; label: string }>) => void;
};

export default function MusicAnalysisPanel({ onAnalysisComplete, onSectionsDetected }: Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<"quick" | "full">("quick");
  const [analysisResult, setAnalysisResult] = useState<MusicAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isServiceAvailable, setIsServiceAvailable] = useState<boolean | null>(null);

  // Pythonサービスの接続確認
  useEffect(() => {
    const checkService = async () => {
      try {
        const response = await fetch("/api/python/health");
        if (response.ok) {
          const data = await response.json();
          setIsServiceAvailable(data.available);
        } else {
          setIsServiceAvailable(false);
        }
      } catch {
        setIsServiceAvailable(false);
      }
    };
    checkService();
  }, []);

  const handleAnalyze = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      setError("音声ファイルを選択してください");
      return;
    }

    // 新しいファイルを読み込むタイミングで、前回の解析結果をクリア
    setAnalysisResult(null);
    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", analysisMode);

      const response = await fetch("/api/music/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "不明なエラー" }));
        throw new Error(errorData.error || `HTTP ${response.status}: 音楽解析に失敗しました`);
      }

      const result: MusicAnalysisResult = await response.json();
      setAnalysisResult(result);

      if (onAnalysisComplete) {
        onAnalysisComplete(result);
      }

      // セクション情報を変換
      if (result.sections && onSectionsDetected) {
        const sections = result.sections.map((sec, idx) => ({
          start: sec.start,
          end: sec.end,
          label: `Section ${idx + 1}`,
        }));
        onSectionsDetected(sections);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "解析エラーが発生しました");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-xs font-semibold text-slate-300">
          音楽分析（AI）
        </h2>
        <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-yellow-900/40 text-yellow-300 rounded border border-yellow-700/50">
          BETA
        </span>
      </div>

      {isServiceAvailable === false && (
        <div className="p-2 bg-yellow-900/30 border border-yellow-700/50 rounded text-xs text-yellow-300 mb-2">
          ⚠️ Pythonサービスに接続できません。Pythonサービスが起動しているか確認してください。
        </div>
      )}

      {/* 解析モード選択 */}
      <div className="space-y-2">
        <label className="block text-[10px] text-slate-400 uppercase tracking-wider">
          解析モード
        </label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setAnalysisMode("quick")}
            disabled={isAnalyzing}
            className={`flex-1 px-2 py-1.5 text-[10px] rounded transition-colors ${
              analysisMode === "quick"
                ? "bg-emerald-600/80 text-white"
                : "bg-slate-700/40 hover:bg-slate-700/60 text-slate-300"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            簡易版
            <br />
            <span className="text-[9px] opacity-80">(30秒・高速)</span>
          </button>
          <button
            type="button"
            onClick={() => setAnalysisMode("full")}
            disabled={isAnalyzing}
            className={`flex-1 px-2 py-1.5 text-[10px] rounded transition-colors ${
              analysisMode === "full"
                ? "bg-blue-600/80 text-white"
                : "bg-slate-700/40 hover:bg-slate-700/60 text-slate-300"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            高精度版
            <br />
            <span className="text-[9px] opacity-80">(全曲・時間かかります)</span>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <input
          type="file"
          accept="audio/*"
          onChange={handleAnalyze}
          disabled={isAnalyzing}
          className="hidden"
          id="music-analysis-input"
        />
        <label
          htmlFor="music-analysis-input"
          className={`block w-full px-3 py-2 text-xs rounded text-center cursor-pointer transition-colors ${
            isAnalyzing
              ? "bg-slate-700/50 text-slate-500 cursor-not-allowed"
              : analysisMode === "quick"
              ? "bg-emerald-600/80 hover:bg-emerald-600 text-white"
              : "bg-blue-600/80 hover:bg-blue-600 text-white"
          }`}
        >
          {isAnalyzing
            ? `解析中... (${analysisMode === "quick" ? "簡易版" : "高精度版"})`
            : `音楽ファイルを解析 (${analysisMode === "quick" ? "簡易版" : "高精度版"})`}
        </label>
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
      </div>

      {analysisResult && (
        <div className="space-y-2 text-xs">
          <div className="p-2 bg-slate-900/50 rounded">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">BPM:</span>
                <span className="text-slate-200 font-mono">{analysisResult.bpm.toFixed(1)}</span>
              </div>
              {analysisResult.duration && (
                <div className="flex justify-between">
                  <span className="text-slate-400">長さ:</span>
                  <span className="text-slate-200">
                    {Math.floor(analysisResult.duration / 60)}:
                    {Math.floor(analysisResult.duration % 60).toString().padStart(2, "0")}
                  </span>
                </div>
              )}
              {analysisResult.time_signature && (
                <div className="flex justify-between">
                  <span className="text-slate-400">拍子:</span>
                  <span className="text-slate-200">{analysisResult.time_signature}</span>
                </div>
              )}
              {analysisResult.sections && (
                <div className="flex justify-between">
                  <span className="text-slate-400">セクション:</span>
                  <span className="text-slate-200">{analysisResult.sections.length}個検出</span>
                </div>
              )}
              {analysisResult.tempo_changes && analysisResult.tempo_changes.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">テンポ変化:</span>
                  <span className="text-slate-200">{analysisResult.tempo_changes.length}箇所検出</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">解析モード:</span>
                <span className="text-slate-200">
                  {analysisResult.mode === "quick" ? "簡易版" : "高精度版"}
                </span>
              </div>
            </div>
          </div>

          {analysisResult.sections && analysisResult.sections.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-slate-400">検出されたセクション:</p>
              <div className="max-h-24 overflow-y-auto space-y-1">
                {analysisResult.sections.map((sec, idx) => (
                  <div
                    key={idx}
                    className="px-2 py-1 bg-slate-900/50 rounded text-[10px]"
                  >
                    <span className="text-slate-300">
                      Section {idx + 1}: {sec.start.toFixed(1)}s - {sec.end.toFixed(1)}s
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysisResult.tempo_changes && analysisResult.tempo_changes.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-slate-400">テンポ変化:</p>
              <div className="max-h-24 overflow-y-auto space-y-1">
                {analysisResult.tempo_changes.map((change, idx) => (
                  <div
                    key={idx}
                    className="px-2 py-1 bg-slate-900/50 rounded text-[10px]"
                  >
                    <span className="text-slate-300">
                      {change.time.toFixed(1)}s: {change.bpm.toFixed(1)} BPM
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

