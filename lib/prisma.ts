// lib/prisma.ts
// Prisma 7では、生成されたクライアントを直接インポート
// 相対パスでインポート（Next.jsの解決問題を回避）
import { PrismaClient } from "./generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma Accelerateを使用する場合の設定
const databaseUrl = process.env.DATABASE_URL || "";

// DATABASE_URLがPrisma Accelerateの場合（prisma+postgres://で始まる）
const isAccelerate = databaseUrl.startsWith("prisma+postgres://");

console.log("[Prisma] DATABASE_URL exists:", !!databaseUrl);
console.log("[Prisma] DATABASE_URL length:", databaseUrl.length);
console.log("[Prisma] DATABASE_URL starts with prisma+postgres://:", isAccelerate);
if (databaseUrl) {
  console.log("[Prisma] DATABASE_URL preview:", databaseUrl.substring(0, 80) + "...");
}

const prismaClientOptions: any = {
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
};

// Prisma 7では、engine type "client"を使用する場合、accelerateUrlまたはadapterが必要
if (isAccelerate && databaseUrl) {
  // Prisma Accelerateを使用する場合
  prismaClientOptions.accelerateUrl = databaseUrl;
  console.log("[Prisma] Using Prisma Accelerate with accelerateUrl");
} else if (databaseUrl) {
  // 通常のPostgreSQL接続URLが読み込まれている
  // .envファイルにPrisma AccelerateのURLが設定されているはずですが、
  // 別の.envファイル（.env.localなど）が優先されている可能性があります
  console.log("[Prisma] ERROR: DATABASE_URL is not a Prisma Accelerate URL");
  console.log("[Prisma] Current DATABASE_URL:", databaseUrl.substring(0, 50) + "...");
  console.log("[Prisma] Please check your .env or .env.local file");
  console.log("[Prisma] DATABASE_URL should start with 'prisma+postgres://'");
  throw new Error("DATABASE_URL must be a Prisma Accelerate URL (prisma+postgres://...) for Prisma 7. Please check your .env or .env.local file.");
} else {
  console.error("[Prisma] ERROR: DATABASE_URL is not set!");
  throw new Error("DATABASE_URL environment variable is required");
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(prismaClientOptions);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

