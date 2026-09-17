/**
 * Porteiro do material pago.
 *
 * `public/downloads/` e `public/biblioteca/` são servidos como arquivo estático
 * pelo Next: até hoje o e-book completo e os três bônus baixavam por URL direta,
 * sem login e sem ter comprado. Bastava o link circular num grupo.
 *
 * Quem passa: o portador do cookie de membro, emitido pelo /api/access/check
 * depois de validar o token do Google e conferir o e-mail na lista de compradores.
 * Quem não tem vai para /app, que é onde se entra — e volta pelo próprio histórico.
 *
 * NÃO barra a landing, o app, as rotas de API, os webhooks nem os assets do Next:
 * o matcher no fim do arquivo só alcança os dois caminhos do material pago.
 */
import { NextResponse, type NextRequest } from "next/server";
import { MEMBER_COOKIE, verifyMemberSession } from "@/lib/access/member-session";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(MEMBER_COOKIE)?.value;
  const email = await verifyMemberSession(token);
  if (email) return NextResponse.next();

  // Sem sessão: manda entrar. `precisa-entrar` deixa a tela explicar por que ele
  // veio parar aqui, em vez de parecer que o link do material quebrou.
  const entrar = new URL("/app", request.url);
  entrar.searchParams.set("precisa-entrar", "1");
  entrar.searchParams.set("material", request.nextUrl.pathname);
  return NextResponse.redirect(entrar, 307);
}

export const config = {
  matcher: ["/downloads/:path*", "/biblioteca/:path*"],
};
