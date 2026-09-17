/**
 * Prova do porteiro do material pago (lib/access/member-session.ts).
 *
 * Roda sem rede e sem credencial: `npx tsx scripts/test-member-session.ts`
 *
 * O que está em jogo: se a assinatura puder ser forjada, o e-book de R$ 47 volta
 * a sair de graça. Se a sessão expirar cedo demais ou quebrar, o comprador que
 * pagou não baixa o que comprou. Os dois lados estão cobertos aqui.
 */
process.env.MEMBER_SESSION_SECRET = "segredo-de-teste-com-mais-de-16-chars";

import { createMemberSession, verifyMemberSession, MEMBER_COOKIE } from "../lib/access/member-session";

let passou = 0;
let falhou = 0;

function ok(condicao: boolean, descricao: string) {
  if (condicao) {
    passou++;
    console.log(`  ✓ ${descricao}`);
  } else {
    falhou++;
    console.log(`  ✗ ${descricao}`);
  }
}

async function main() {
  console.log("\n[1] Quem comprou entra");
  const token = await createMemberSession("Comprador@Exemplo.COM");
  ok(token !== null, "sessão é criada quando há segredo");
  ok(await verifyMemberSession(token) === "comprador@exemplo.com", "devolve o e-mail em minúsculas");
  ok(MEMBER_COOKIE === "virada_membro", "nome do cookie é o que o middleware procura");

  console.log("\n[2] Quem não comprou não entra");
  ok(await verifyMemberSession(null) === null, "sem token");
  ok(await verifyMemberSession("") === null, "token vazio");
  ok(await verifyMemberSession("qualquer-coisa") === null, "token sem ponto");
  ok(await verifyMemberSession("a.b.c") === null, "token com partes demais");
  ok(await verifyMemberSession("!!!.###") === null, "base64 inválido");

  console.log("\n[3] Assinatura não se forja");
  const [corpo, assinatura] = token!.split(".");
  ok(await verifyMemberSession(`${corpo}.${assinatura.slice(0, -2)}xx`) === null, "assinatura adulterada é recusada");

  // troca o e-mail no payload mantendo a assinatura antiga
  const payloadFalso = Buffer.from("membro|invasor@exemplo.com|" + (Date.now() + 60000))
    .toString("base64url");
  ok(await verifyMemberSession(`${payloadFalso}.${assinatura}`) === null, "e-mail trocado é recusado");

  console.log("\n[4] Sessão de admin não vira sessão de membro");
  const outroEscopo = Buffer.from("admin|comprador@exemplo.com|" + (Date.now() + 60000))
    .toString("base64url");
  ok(await verifyMemberSession(`${outroEscopo}.${assinatura}`) === null, "escopo diferente é recusado");

  console.log("\n[5] Sessão vencida não entra");
  const vencido = Buffer.from("membro|comprador@exemplo.com|" + (Date.now() - 1000))
    .toString("base64url");
  ok(await verifyMemberSession(`${vencido}.${assinatura}`) === null, "token expirado é recusado");

  console.log("\n[6] Sem segredo no servidor, ninguém passa (fail-closed)");
  const guardado = process.env.MEMBER_SESSION_SECRET;
  const guardadoAdmin = process.env.ADMIN_SESSION_SECRET;
  delete process.env.MEMBER_SESSION_SECRET;
  delete process.env.ADMIN_SESSION_SECRET;
  ok(await createMemberSession("alguem@exemplo.com") === null, "não cria sessão sem segredo");
  ok(await verifyMemberSession(token) === null, "não aceita sessão sem segredo");
  process.env.MEMBER_SESSION_SECRET = guardado;
  if (guardadoAdmin) process.env.ADMIN_SESSION_SECRET = guardadoAdmin;

  console.log("\n[7] Segredo curto demais não vale");
  process.env.MEMBER_SESSION_SECRET = "curto";
  delete process.env.ADMIN_SESSION_SECRET;
  ok(await createMemberSession("alguem@exemplo.com") === null, "segredo com menos de 16 chars é ignorado");
  process.env.MEMBER_SESSION_SECRET = guardado;

  console.log("\n------------------------------------------------------------------");
  console.log(`RESULTADO: ${passou} passou, ${falhou} falhou`);
  console.log("------------------------------------------------------------------\n");
  if (falhou > 0) process.exit(1);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
