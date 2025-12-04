// lib/drill/videoRecorder.ts
// 動画録画ユーティリティ

export type RecordingOptions = {
  fps?: number;
  duration?: number; // 秒
  width?: number;
  height?: number;
};

/**
 * 2D Canvas（Konva Stage）を録画
 * @param captureFrame フレームをキャプチャする関数
 * @param shouldStop 録画を停止するかどうかを返す関数（trueで停止）
 * @param options 録画オプション
 * @param onProgress 進捗コールバック
 */
export async function record2DAnimation(
  captureFrame: () => Promise<Blob | null>,
  shouldStop: () => boolean,
  options: RecordingOptions = {},
  onProgress?: (progress: number) => void,
  audioStream?: MediaStream | null
): Promise<Blob | null> {
  const fps = options.fps || 30;
  const width = options.width || 1920;
  const height = options.height || 1080;

  try {
    // 録画用Canvasを作成
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Canvas contextの取得に失敗しました");
      return null;
    }

    // MediaRecorderで録画
    const stream = canvas.captureStream(fps);

    // オーディオトラックがあればストリームに追加（キャンバス映像 + 音声）
    if (audioStream) {
      audioStream.getAudioTracks().forEach((track) => {
        stream.addTrack(track);
      });
    }
    
    // 利用可能なMIMEタイプを確認
    let mimeType = "video/webm;codecs=vp9";
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = "video/webm;codecs=vp8";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/webm";
      }
    }

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 5000000, // 5Mbps
    });

    const chunks: Blob[] = [];
    let frameCount = 0;
    const frameInterval = 1000 / fps;

    return new Promise((resolve, reject) => {
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
          console.log(`データ取得: ${event.data.size} bytes, 合計chunks: ${chunks.length}`);
        }
      };

      mediaRecorder.onstop = () => {
        console.log("MediaRecorder stopped, chunks:", chunks.length);
        const blob = new Blob(chunks, { type: mimeType });
        console.log("Video blob created, size:", blob.size, "bytes");
        resolve(blob);
      };

      mediaRecorder.onerror = (error) => {
        console.error("Recording error:", error);
        reject(error);
      };

      mediaRecorder.start(100); // 100msごとにデータを取得

      const startTime = performance.now();

      let isRecording = true;

      const captureLoop = async () => {
        if (!isRecording) return;
        
        const elapsed = (performance.now() - startTime) / 1000;
        
        // 停止条件をチェック（最初の1秒は停止しない）
        if (elapsed > 1.0 && shouldStop()) {
          console.log(`録画停止: elapsed=${elapsed.toFixed(2)}s, frameCount=${frameCount}`);
          isRecording = false;
          // 最後のデータを取得するために、stop()の前にrequestData()を呼ぶ
          if (mediaRecorder.state === "recording") {
            mediaRecorder.requestData();
            // requestData()の後に少し待つ
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          mediaRecorder.stop();
          if (onProgress) onProgress(100);
          return;
        }
        
        // デバッグ用ログ（30フレームごと）
        if (frameCount % 30 === 0) {
          console.log(`録画中: frameCount=${frameCount}, elapsed=${elapsed.toFixed(2)}s`);
        }

        // フレームをキャプチャ
        const frameBlob = await captureFrame();
        if (frameBlob) {
          const img = new Image();
          await new Promise<void>((imgResolve, imgReject) => {
            img.onload = () => {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              
              // アスペクト比を保ちながらリサイズ
              const aspectRatio = img.width / img.height;
              let drawWidth = canvas.width;
              let drawHeight = canvas.height;
              
              if (aspectRatio > canvas.width / canvas.height) {
                drawHeight = canvas.width / aspectRatio;
              } else {
                drawWidth = canvas.height * aspectRatio;
              }
              
              const x = (canvas.width - drawWidth) / 2;
              const y = (canvas.height - drawHeight) / 2;
              
              // 背景を白に
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              
              ctx.drawImage(img, x, y, drawWidth, drawHeight);
              imgResolve();
            };
            img.onerror = imgReject;
            img.src = URL.createObjectURL(frameBlob);
          });
          URL.revokeObjectURL(img.src);
        }

        frameCount++;
        // 進捗は経過時間ベースで計算（最大10分を想定）
        const maxDuration = 600; // 10分
        const progress = Math.min((elapsed / maxDuration) * 100, 99);
        if (onProgress) onProgress(progress);
        
        // 次のフレームまで待機
        const nextFrameTime = startTime + frameCount * frameInterval;
        const delay = Math.max(0, nextFrameTime - performance.now());
        
        // 短い遅延で次のループを実行（停止条件を頻繁にチェック）
        setTimeout(captureLoop, Math.min(delay, 100));
      };

      captureLoop();
    });
  } catch (error) {
    console.error("Failed to record 2D video:", error);
    return null;
  }
}

/**
 * 3D Canvas（Three.js）を録画
 */
export async function record3DAnimation(
  captureFrame: () => Promise<Blob | null>,
  shouldStop: () => boolean,
  options: RecordingOptions = {},
  onProgress?: (progress: number) => void
): Promise<Blob | null> {
  // 3Dも同様の実装
  return record2DAnimation(captureFrame, shouldStop, options, onProgress);
}

/**
 * 動画をダウンロード
 */
export function downloadVideo(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
