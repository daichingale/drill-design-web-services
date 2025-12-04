import { NextRequest, NextResponse } from "next/server";

const PYTHON_API_URL =
  process.env.PYTHON_API_URL || "http://localhost:8000";

export const runtime = "nodejs";

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
    const interval = formData.get("interval");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "file フィールドに音声ファイルを含めてください" },
        { status: 400 }
      );
    }

    // Pythonサービスに転送
    const forwardFormData = new FormData();
    forwardFormData.append("file", file, (file as any).name ?? "audio");
    if (interval) {
      forwardFormData.append("interval", interval.toString());
    }

    const resp = await fetch(`${PYTHON_API_URL}/music/markers`, {
      method: "POST",
      body: forwardFormData,
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("[music/markers] Python API error:", resp.status, text);
      return NextResponse.json(
        { error: "Python マーカー生成サービスでエラーが発生しました" },
        { status: 500 }
      );
    }

    const data = await resp.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[music/markers] Unexpected error:", error);
    return NextResponse.json(
      { error: "マーカー生成中に予期しないエラーが発生しました" },
      { status: 500 }
    );
  }
}

