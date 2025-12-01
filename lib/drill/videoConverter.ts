// lib/drill/videoConverter.ts
// WebM → MP4変換ユーティリティ（ffmpeg.wasm使用）
"use client";

import { downloadVideo } from "./videoRecorder";

// 型定義
type FFmpeg = {
  on: (event: string, callback: (data: any) => void) => void;
  load: (options: { coreURL: string; wasmURL: string }) => Promise<void>;
  writeFile: (name: string, data: Uint8Array) => Promise<void>;
  exec: (args: string[]) => Promise<void>;
  readFile: (name: string) => Promise<Uint8Array>;
  deleteFile: (name: string) => Promise<void>;
};

let ffmpegInstance: FFmpeg | null = null;
let isFFmpegLoaded = false;
let ffmpegModulePromise: Promise<any> | null = null;

/**
 * FFmpegモジュールをロード（初回のみ）
 */
async function loadFFmpegModule() {
  if (ffmpegModulePromise) {
    return ffmpegModulePromise;
  }

  // クライアント側でのみ実行されることを確認
  if (typeof window === "undefined") {
    throw new Error("FFmpegはクライアント側でのみ使用できます");
  }

  ffmpegModulePromise = Promise.all([
    import("@ffmpeg/ffmpeg"),
    import("@ffmpeg/util"),
  ]);

  return ffmpegModulePromise;
}

/**
 * FFmpegインスタンスを初期化（初回のみ）
 */
async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance && isFFmpegLoaded) {
    return ffmpegInstance;
  }

  try {
    // モジュールをロード
    const [ffmpegModule, utilModule] = await loadFFmpegModule();
    const { FFmpeg } = ffmpegModule;
    const { fetchFile } = utilModule;

    const ffmpeg = new FFmpeg();
    ffmpegInstance = ffmpeg;

    // ログ出力（デバッグ用）
    ffmpeg.on("log", ({ message }: { message: string }) => {
      console.log("[FFmpeg]", message);
    });

    // 進捗出力
    ffmpeg.on("progress", ({ progress, time }: { progress?: number; time?: number }) => {
      if (progress !== undefined) {
        console.log(`[FFmpeg] 進捗: ${(progress * 100).toFixed(1)}%`);
      }
    });

    // FFmpeg.wasmのCoreとWASMファイルを読み込む
    // CDNから直接読み込む（Turbopackの動的インポート解決を回避）
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
    
    // 直接URL文字列を使用
    await ffmpeg.load({
      coreURL: `${baseURL}/ffmpeg-core.js`,
      wasmURL: `${baseURL}/ffmpeg-core.wasm`,
    });

    isFFmpegLoaded = true;
    console.log("[FFmpeg] 初期化完了");
    return ffmpeg;
  } catch (error) {
    console.error("[FFmpeg] 初期化エラー:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`FFmpeg初期化に失敗しました: ${errorMessage}`);
  }
}

/**
 * WebM動画をMP4（H.264）に変換
 * @param webmBlob WebM形式のBlob
 * @param onProgress 進捗コールバック（0-100）
 * @returns MP4形式のBlob
 */
export async function convertWebMToMP4(
  webmBlob: Blob,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const ffmpeg = await getFFmpeg();

  try {
    // 入力ファイル名と出力ファイル名
    const inputFileName = "input.webm";
    const outputFileName = "output.mp4";

    // WebMファイルをFFmpegの仮想ファイルシステムに書き込む
    const [, utilModule] = await loadFFmpegModule();
    const { fetchFile } = utilModule;
    const webmData = await fetchFile(webmBlob);
    await ffmpeg.writeFile(inputFileName, webmData);

    // 進捗コールバックを設定
    if (onProgress) {
      ffmpeg.on("progress", ({ progress: p }) => {
        if (p !== undefined) {
          onProgress(p * 100);
        }
      });
    }

    // WebM → MP4（H.264）に変換
    // ffmpeg.wasmでは libx264 が利用できないため、h264 を使用
    // -c:v h264: H.264エンコーダーを使用（ffmpeg.wasmで利用可能）
    // -c:a aac: AACオーディオコーデックを使用
    // -preset medium: エンコード速度と品質のバランス
    // -crf 23: 品質設定（18-28の範囲、小さいほど高品質）
    // -pix_fmt yuv420p: 互換性の高いピクセルフォーマット
    await ffmpeg.exec([
      "-i",
      inputFileName,
      "-c:v",
      "h264",
      "-c:a",
      "aac",
      "-preset",
      "medium",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart", // ストリーミング用に最適化
      outputFileName,
    ]);

    // 変換されたMP4ファイルを読み込む
    const mp4Data = await ffmpeg.readFile(outputFileName);

    // 仮想ファイルシステムから削除
    await ffmpeg.deleteFile(inputFileName);
    await ffmpeg.deleteFile(outputFileName);

    // Uint8ArrayをBlobに変換
    const mp4Blob = new Blob([mp4Data], { type: "video/mp4" });

    if (onProgress) {
      onProgress(100);
    }

    return mp4Blob;
  } catch (error) {
    console.error("[FFmpeg] 変換エラー:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`MP4変換に失敗しました: ${errorMessage}`);
  }
}

// downloadVideo は videoRecorder.ts からインポート
export { downloadVideo };

