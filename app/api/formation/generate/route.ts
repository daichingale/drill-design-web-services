import { NextRequest, NextResponse } from "next/server";

const PYTHON_API_URL =
  process.env.PYTHON_API_URL || "http://localhost:8000";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Pythonサービスに転送
    const resp = await fetch(`${PYTHON_API_URL}/formation/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("[formation/generate] Python API error:", resp.status, text);
      return NextResponse.json(
        { error: "Python フォーメーション生成サービスでエラーが発生しました" },
        { status: 500 }
      );
    }

    const data = await resp.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[formation/generate] Unexpected error:", error);
    return NextResponse.json(
      { error: "フォーメーション生成中に予期しないエラーが発生しました" },
      { status: 500 }
    );
  }
}

