/**
 * POST /api/whatsapp/webhook/:token
 *
 * A Evolution chama aqui quando chega mensagem no WhatsApp do produto.
 * O token vai na URL porque a Evolution não faz login — sem ele, qualquer um
 * conversaria com o agente às nossas custas.
 *
 * Responde 200 na hora e processa depois: a Evolution não deve ficar esperando
 * o Claude pensar.
 */
import crypto from "crypto";
import { NextResponse } from "next/server";
import { guardar, responder } from "@/lib/agente/whatsapp";

export const dynamic = "force-dynamic";

const LIMITE_CORPO = 256 * 1024;

function tokenConfere(recebido: string): boolean {
  const esperado = process.env.WHATSAPP_WEBHOOK_TOKEN;
  if (!esperado || esperado.length < 16) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

type Payload = Record<string, unknown>;
const campo = (o: unknown, chave: string): unknown =>
  o && typeof o === "object" ? (o as Payload)[chave] : undefined;

/** Texto da mensagem, nos formatos que a Evolution usa. */
function extrairTexto(msg: unknown): string | null {
  const m = campo(msg, "message");
  const t =
    campo(m, "conversation") ??
    campo(campo(m, "extendedTextMessage"), "text") ??
    campo(campo(m, "imageMessage"), "caption") ??
    campo(campo(m, "videoMessage"), "caption") ??
    null;
  return typeof t === "string" && t.trim() ? t.trim() : null;
}

async function enviarWhatsApp(numero: string, texto: string): Promise<void> {
  const url = process.env.EVOLUTION_URL;
  const instancia = process.env.EVOLUTION_INSTANCIA;
  const apikey = process.env.EVOLUTION_APIKEY;
  if (!url || !instancia || !apikey) throw new Error("Evolution não configurada");

  const res = await fetch(`${url}/message/sendText/${instancia}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey },
    body: JSON.stringify({ number: numero, text: texto }),
  });
  if (!res.ok) throw new Error(`Evolution respondeu ${res.status}`);
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  if (!tokenConfere(params.token)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (process.env.AGENTE_WHATSAPP !== "1") {
    return NextResponse.json({ ok: true, ignorado: "agente desligado" });
  }

  let corpo: Payload;
  try {
    const bruto = await req.text();
    if (bruto.length > LIMITE_CORPO) return NextResponse.json({ ok: false }, { status: 413 });
    corpo = JSON.parse(bruto);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const dado = campo(corpo, "data");
  const chave = campo(dado, "key");
  const jid = typeof campo(chave, "remoteJid") === "string" ? (campo(chave, "remoteJid") as string) : "";
  const daGente = campo(chave, "fromMe") === true;
  const grupo = jid.endsWith("@g.us");
  const texto = extrairTexto(dado);
  const numero = jid.split("@")[0];

  // só conversa individual, de outra pessoa, com texto
  if (daGente || grupo || !texto || !numero) {
    return NextResponse.json({ ok: true, ignorado: true });
  }

  // a Evolution recebe o 200 agora; a resposta sai quando o Claude terminar
  void (async () => {
    try {
      guardar(numero, "cliente", texto);
      const resposta = await responder(numero, texto);
      await enviarWhatsApp(numero, resposta);
      guardar(numero, "agente", resposta);
    } catch (err) {
      console.error("[agente-whatsapp] falhou:", err);
    }
  })();

  return NextResponse.json({ ok: true });
}
