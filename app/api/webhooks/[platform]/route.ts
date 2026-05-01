/**
 * POST /api/webhooks/:platform
 *
 * Endpoint único para todas as plataformas (hotmart, eduzz, kiwify,
 * monetizze, cakto, perfectpay). Cada plataforma manda um JSON
 * diferente — os adapters em lib/access/adapters.ts normalizam.
 *
 * Para autenticar a origem, defina no .env (opcional mas recomendado):
 *   HOTMART_TOKEN, EDUZZ_TOKEN, KIWIFY_TOKEN, MONETIZZE_TOKEN,
 *   CAKTO_TOKEN, PERFECTPAY_TOKEN
 * O token deve vir como ?token=... ou no header X-Webhook-Token.
 */
import { NextResponse } from "next/server";
import { expectedToken, isPlatform, parseWebhook } from "@/lib/access/adapters";
import { logWebhook, upsertMember } from "@/lib/access/members";

export async function POST(request: Request, { params }: { params: { platform: string } }) {
  const platform = params.platform;
  if (!isPlatform(platform)) {
    return NextResponse.json({ message: `Plataforma desconhecida: ${platform}` }, { status: 404 });
  }

  // Autenticação obrigatória em produção (NODE_ENV=production).
  // Em dev ainda é opcional pra facilitar testes locais.
  const expected = expectedToken(platform);
  const isProd = process.env.NODE_ENV === "production";
  if (isProd && !expected) {
    logWebhook({ platform, ok: false, message: "token nao configurado em producao" });
    return NextResponse.json(
      { message: `Webhook ${platform} sem token configurado. Defina ${platform.toUpperCase()}_TOKEN.` },
      { status: 503 }
    );
  }
  if (expected) {
    const url = new URL(request.url);
    const got = url.searchParams.get("token") ?? request.headers.get("x-webhook-token") ?? request.headers.get("x-hotmart-hottok");
    if (got !== expected) {
      logWebhook({ platform, ok: false, message: "token inválido" });
      return NextResponse.json({ message: "Token inválido." }, { status: 401 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    logWebhook({ platform, ok: false, message: "JSON inválido" });
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  const parsed = parseWebhook(platform, body);

  if (!parsed.upsert) {
    logWebhook({ platform, event: parsed.event, ok: false, message: "sem email" });
    return NextResponse.json({ ok: false, message: "Email do comprador ausente." }, { status: 400 });
  }

  const member = upsertMember(parsed.upsert);
  logWebhook({ platform, event: parsed.event, email: member.email, ok: true });

  return NextResponse.json({ ok: true, event: parsed.event, member });
}
