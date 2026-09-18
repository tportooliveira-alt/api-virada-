/**
 * Entrega do material pago — a ÚNICA porta para o e-book, os bônus e as
 * ferramentas da biblioteca.
 *
 * Por que existe (cicatriz de 2026-09-17): os arquivos viviam em `public/` e
 * eram servidos estaticamente. Tentamos fechar com middleware e não funciona:
 * o servidor de estáticos do Next responde ANTES do middleware quando o caminho
 * chega codificado (`/downloads%2fx.pdf`), e o e-book de R$ 47 saía com HTTP 200
 * sem cookie nenhum. Middleware não protege arquivo estático — só tirar o
 * arquivo de `public/` protege.
 *
 * Agora o material mora em `material-pago/`, fora de `public/`, e não existe URL
 * estática para burlar: para chegar no arquivo é preciso passar por aqui, e aqui
 * exige o cookie de comprador.
 */
import { NextResponse, type NextRequest } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import { MEMBER_COOKIE, verifyMemberSession } from "@/lib/access/member-session";

export const runtime = "nodejs";

const RAIZ = path.join(process.cwd(), "material-pago");

const TIPOS: Record<string, string> = {
  ".pdf": "application/pdf",
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".md": "text/plain; charset=utf-8",
};

export async function GET(request: NextRequest, { params }: { params: { caminho: string[] } }) {
  const relativo = (params.caminho ?? []).join("/");

  // Só depois de resolver o caminho real dá para saber se ele escapou da pasta.
  // Comparar strings antes de resolver é o erro clássico que deixa passar "..".
  const alvo = path.resolve(RAIZ, relativo);
  if (alvo !== RAIZ && !alvo.startsWith(RAIZ + path.sep)) {
    return new NextResponse("Não encontrado.", { status: 404 });
  }

  const email = await verifyMemberSession(request.cookies.get(MEMBER_COOKIE)?.value);
  if (!email) {
    // Manda entrar dizendo qual material ele tentou abrir, para a tela explicar
    // e devolvê-lo ao arquivo depois do login.
    const entrar = new URL("/app", request.url);
    entrar.searchParams.set("precisa-entrar", "1");
    entrar.searchParams.set("material", `/${relativo}`);
    return NextResponse.redirect(entrar, 307);
  }

  try {
    const info = await stat(alvo);
    if (!info.isFile()) return new NextResponse("Não encontrado.", { status: 404 });

    const conteudo = await readFile(alvo);
    return new NextResponse(new Uint8Array(conteudo), {
      status: 200,
      headers: {
        "Content-Type": TIPOS[path.extname(alvo).toLowerCase()] ?? "application/octet-stream",
        "Content-Length": String(info.size),
        // Material pago não entra em cache compartilhado: o cookie decide quem vê.
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch {
    return new NextResponse("Não encontrado.", { status: 404 });
  }
}
