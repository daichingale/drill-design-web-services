import { NextRequest, NextResponse } from "next/server";

const PYTHON_API_URL =
  process.env.PYTHON_API_URL || "http://localhost:8000";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || undefined;

    const url = new URL(`${PYTHON_API_URL}/learning/patterns`);
    if (userId) {
      url.searchParams.set("user_id", userId);
    }

    const resp = await fetch(url.toString(), {
      method: "GET",
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("[learning/patterns] Python API error:", resp.status, text);
      return NextResponse.json(
        { error: "パターン取得エラーが発生しました" },
        { status: 500 }
      );
    }

    const data = await resp.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[learning/patterns] Unexpected error:", error);
    return NextResponse.json(
      { error: "パターン取得中に予期しないエラーが発生しました" },
      { status: 500 }
    );
  }
}

