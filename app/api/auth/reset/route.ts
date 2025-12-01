// app/api/auth/reset/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// POST: パスワードリセットリクエスト
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "メールアドレスが必要です" },
        { status: 400 }
      );
    }

    // ユーザーを検索
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // セキュリティのため、ユーザーが存在しない場合でも成功を返す
    if (!user) {
      console.log(`[Password Reset] User not found: ${email}`);
      // 実際のユーザーが存在しない場合でも、成功メッセージを返す（セキュリティ対策）
      return NextResponse.json({ success: true });
    }

    // リセットトークンを生成
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1時間後

    // 既存のトークンを削除（同じメールアドレスに対して複数のトークンが存在しないように）
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: email,
      },
    });

    // 新しいトークンを保存
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    // リセットリンクを生成
    const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/reset/confirm?token=${token}`;

    // 開発環境ではコンソールに出力
    if (process.env.NODE_ENV === "development") {
      console.log("=".repeat(80));
      console.log("[Password Reset] Reset link for:", email);
      console.log("[Password Reset] Reset URL:", resetUrl);
      console.log("[Password Reset] Token:", token);
      console.log("[Password Reset] Expires:", expires.toISOString());
      console.log("=".repeat(80));
    } else {
      // 本番環境ではメール送信サービスを使用
      // TODO: メール送信サービス（SendGrid、AWS SES、Resend等）を実装
      console.log(`[Password Reset] Reset link should be sent to: ${email}`);
      console.log(`[Password Reset] Reset URL: ${resetUrl}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to create reset token:", error);
    return NextResponse.json(
      { error: "パスワードリセットリクエストの処理に失敗しました" },
      { status: 500 }
    );
  }
}


