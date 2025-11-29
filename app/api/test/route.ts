import sql from "@/lib/db";

export async function GET() {
  const result = await sql`SELECT now()`;
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
}
