// app/api/auth/reset/validate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: リセットトークンの有効性を確認
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "トークンが指定されていません" },
        { status: 400 }
      );
    }

    // トークンを検索
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: "リセットトークンが見つかりません" },
        { status: 404 }
      );
    }

    // トークンの有効期限を確認
    if (verificationToken.expires < new Date()) {
      // 期限切れのトークンを削除
      await prisma.verificationToken.delete({
        where: { token },
      });
      return NextResponse.json(
        { error: "リセットトークンの有効期限が切れています" },
        { status: 400 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("Failed to validate reset token:", error);
    return NextResponse.json(
      { error: "トークンの検証に失敗しました" },
      { status: 500 }
    );
  }
}

