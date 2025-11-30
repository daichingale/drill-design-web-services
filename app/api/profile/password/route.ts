// app/api/profile/password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// PUT: パスワード変更
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "現在のパスワードと新しいパスワードが必要です" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "新しいパスワードは6文字以上である必要があります" },
        { status: 400 }
      );
    }

    // 現在のユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // 現在のパスワードを検証
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "現在のパスワードが正しくありません" },
        { status: 400 }
      );
    }

    // 新しいパスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // パスワードを更新
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        password: hashedPassword,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to change password:", error);
    return NextResponse.json(
      { error: "パスワードの変更に失敗しました" },
      { status: 500 }
    );
  }
}

