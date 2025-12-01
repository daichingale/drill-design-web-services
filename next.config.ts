import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Next.js 16ではTurbopackがデフォルト
  // Turbopack設定を追加（空の設定でエラーを回避）
  turbopack: {},
};

export default nextConfig;
