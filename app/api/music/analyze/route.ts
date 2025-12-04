import { NextRequest, NextResponse } from "next/server";

// Python側のエンドポイントURL（例: http://localhost:8000）
// 開発環境では .env.local に PYTHON_API_URL を設定しておく想定
// 例: PYTHON_API_URL=http://localhost:8000
const PYTHON_API_URL =
  process.env.PYTHON_API_URL || "http://localhost:8000";

export const runtime = "nodejs"; // Edgeではなく Node ランタイムで動かす

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "multipart/form-data で音声ファイルを送信してください" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const mode = formData.get("mode")?.toString() || "quick"; // デフォルトは簡易版

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "file フィールドに音声ファイルを含めてください" },
        { status: 400 }
      );
    }

    // Pythonサービスにそのまま転送する
    const forwardFormData = new FormData();
    forwardFormData.append("file", file, (file as any).name ?? "audio");
    forwardFormData.append("mode", mode);

    const resp = await fetch(`${PYTHON_API_URL}/music/analyze`, {
      method: "POST",
      body: forwardFormData,
    });

    if (!resp.ok) {
      let errorMessage = "Python 音楽解析サービスでエラーが発生しました";
      try {
        const errorData = await resp.json();
        errorMessage = errorData.detail || errorData.error || errorMessage;
      } catch {
        const text = await resp.text();
        errorMessage = text || errorMessage;
      }
      console.error("[music/analyze] Python API error:", resp.status, errorMessage);
      return NextResponse.json(
        { error: errorMessage },
        { status: resp.status }
      );
    }

    const data = await resp.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[music/analyze] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "音楽解析中に予期しないエラーが発生しました";
    
    // 接続エラーの場合
    if (errorMessage.includes("fetch failed") || errorMessage.includes("ECONNREFUSED")) {
      return NextResponse.json(
        { error: "Pythonサービスに接続できません。Pythonサービスが起動しているか確認してください。" },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}



