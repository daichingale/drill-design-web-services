// lib/auth.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function getCurrentUser() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return null;
    }
    return session.user;
  } catch (error) {
    console.error("[Auth] Error getting current user:", error);
    return null;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    // 認証エラーの場合は401を返す
    throw new AuthError("認証が必要です");
  }
  return user;
}

// カスタムエラークラス
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

