// app/api/drills/test/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Test endpoint works!" });
}


