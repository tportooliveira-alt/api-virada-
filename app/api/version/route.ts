/**
 * GET /api/version → { buildId }
 * Versão publicada no servidor (definida em next.config.mjs). O UpdateBanner
 * compara com a versão embutida no bundle do cliente.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? "dev" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
