import { NextRequest, NextResponse } from "next/server";

const PYTHON_API_URL =
  process.env.PYTHON_API_URL || "http://localhost:8000";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const resp = await fetch(`${PYTHON_API_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(3000), // 3秒でタイムアウト
    });

    if (!resp.ok) {
      return NextResponse.json(
        { available: false, status: resp.status },
        { status: 503 }
      );
    }

    const data = await resp.json();
    return NextResponse.json({
      available: true,
      service: data.service || "unknown",
      version: data.version || "unknown",
      librosa_available: data.librosa_available || false,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        available: false,
        error: errorMessage,
        message: "Pythonサービスに接続できません。Pythonサービスが起動しているか確認してください。",
      },
      { status: 503 }
    );
  }
}

