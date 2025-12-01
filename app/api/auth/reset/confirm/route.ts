// app/api/auth/reset/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// POST: パスワードリセットの確認とパスワード更新
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: "トークンとパスワードが必要です" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "パスワードは6文字以上である必要があります" },
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

    // ユーザーを検索（identifierはメールアドレス）
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier },
    });

    if (!user) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);

    // パスワードを更新
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    });

    // 使用済みのトークンを削除
    await prisma.verificationToken.delete({
      where: { token },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to reset password:", error);
    return NextResponse.json(
      { error: "パスワードのリセットに失敗しました" },
      { status: 500 }
    );
  }
}


