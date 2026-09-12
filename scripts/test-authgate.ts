/**
 * Testa a porta de entrada do app (components/AuthGate.tsx) — as duas causas
 * mais comuns de "paguei e não consigo entrar".
 *
 * Roda: npx tsx scripts/test-authgate.ts
 *
 * O componente em si depende de React/DOM, então o que se prova aqui é a lógica
 * pura que ele exporta: quais rotas abrem sem login, o que acontece quando o
 * Google responde DEPOIS do cronômetro, e qual `prompt` vai pro Google.
 */
import { readdirSync } from "node:fs";
import path from "node:path";

import {
  ARQUIVOS_PUBLICOS,
  MSG_DEMORA,
  MSG_LOGIN_FALHOU,
  criarTentativaDeLogin,
  isRotaPublica,
  promptDoLogin,
  type RespostaOAuth,
} from "../components/AuthGate";

let pass = 0;
let fail = 0;
function ok(cond: boolean, msg: string) {
  if (cond) {
    pass++;
    console.log("  ✓", msg);
  } else {
    fail++;
    console.error("  ✗ FALHOU:", msg);
  }
}

// ── Relógio de mentira: deixa o teste "estourar os 12s" sem esperar ─────────
function criarRelogio() {
  const pendentes = new Map<number, () => void>();
  let proximo = 0;
  return {
    agendar(fn: () => void, _ms: number) {
      proximo += 1;
      pendentes.set(proximo, fn);
      return proximo;
    },
    cancelar(id: number) {
      pendentes.delete(id);
    },
    /** finge que o tempo passou */
    estourar() {
      for (const fn of [...pendentes.values()]) fn();
    },
    get agendados() {
      return pendentes.size;
    },
  };
}

/** Monta uma tentativa de login espionando tudo que ela faz na tela. */
function montarTentativa() {
  const relogio = criarRelogio();
  const tela = { submitting: true, erro: "" };
  const tokensAceitos: string[] = [];
  const aoResponder = criarTentativaDeLogin({
    setSubmitting: (v) => {
      tela.submitting = v;
    },
    setError: (m) => {
      tela.erro = m;
    },
    onToken: (t) => {
      tokensAceitos.push(t);
    },
    agendar: relogio.agendar,
    cancelar: relogio.cancelar,
  });
  return { relogio, tela, tokensAceitos, aoResponder };
}

const TOKEN_BOM: RespostaOAuth = { access_token: "ya29.token-de-mentira" };

// ── P1 · resposta rápida (o caminho feliz) ─────────────────────────────────
console.log("\nP1 — o login que chega dentro do tempo");
{
  const t = montarTentativa();
  ok(t.relogio.agendados === 1, "a tentativa agenda o cronômetro de destravar");
  t.aoResponder(TOKEN_BOM);
  ok(t.tokensAceitos.length === 1, "token é aproveitado");
  ok(t.tela.erro === "", "nenhuma mensagem de erro aparece");
  ok(t.relogio.agendados === 0, "cronômetro é cancelado — o aviso de demora não vai pipocar depois");
}

// ── P1 · resposta ATRASADA: o bug que jogava login válido fora ─────────────
console.log("\nP1 — o login que chega depois do cronômetro (senha longa, 2 etapas, celular lento)");
{
  const t = montarTentativa();
  t.relogio.estourar();
  ok(t.tela.submitting === false, "cronômetro destrava a interface (tira o 'carregando')");
  ok(t.tela.erro === MSG_DEMORA, "explica que a janela pode ter sido bloqueada, sem dizer que falhou");
  ok(t.tokensAceitos.length === 0, "até aqui nenhum token chegou");

  // ...e agora o Google finalmente responde.
  t.aoResponder(TOKEN_BOM);
  ok(t.tokensAceitos.length === 1, "a resposta atrasada VALE: o login completa");
  ok(t.tela.erro === "", "o aviso de demora some quando o login entra");
  ok(t.tela.submitting === true, "volta a mostrar 'carregando' enquanto valida a compra");
}

// ── P1 · o Google responde duas vezes ──────────────────────────────────────
console.log("\nP1 — resposta repetida não loga duas vezes");
{
  const t = montarTentativa();
  t.aoResponder(TOKEN_BOM);
  t.aoResponder(TOKEN_BOM);
  ok(t.tokensAceitos.length === 1, "segunda resposta é ignorada");
}

// ── P1 · resposta com erro, antes e depois do cronômetro ──────────────────
console.log("\nP1 — quando o Google recusa de verdade");
{
  const t = montarTentativa();
  t.aoResponder({ error: "access_denied" });
  ok(t.tokensAceitos.length === 0, "erro não vira login");
  ok(t.tela.erro === MSG_LOGIN_FALHOU, "mostra recado em português simples");
  ok(t.tela.submitting === false, "destrava o botão pra pessoa tentar de novo");
}
{
  const t = montarTentativa();
  t.relogio.estourar();
  t.aoResponder({ error: "access_denied" });
  ok(t.tokensAceitos.length === 0, "erro atrasado também não vira login");
  ok(t.tela.erro === MSG_LOGIN_FALHOU, "a mensagem de demora dá lugar à de falha");
}
{
  // resposta "ok" sem token é falha disfarçada
  const t = montarTentativa();
  t.aoResponder({});
  ok(t.tokensAceitos.length === 0, "resposta sem access_token não vira login");
  ok(t.tela.erro === MSG_LOGIN_FALHOU, "e avisa a pessoa");
}

// ── P2 · quais páginas abrem sem login ─────────────────────────────────────
console.log("\nP2 — /obrigado tem que abrir sem login");
ok(isRotaPublica("/obrigado") === true, "/obrigado é pública (é pra onde a Kiwify manda quem pagou)");
ok(isRotaPublica("/obrigado/") === true, "com barra no fim também");
ok(isRotaPublica("/OBRIGADO") === true, "maiúscula também (link digitado à mão)");
ok(isRotaPublica("/") === true, "a raiz continua pública");
ok(isRotaPublica("/vendas") === true, "/vendas (landing) é pública");
ok(isRotaPublica("/politica-privacidade.html") === true, "política de privacidade é pública");
ok(isRotaPublica("/termos-de-uso.html") === true, "termos de uso são públicos");

// ── P2 · ".html" não pode ser senha ────────────────────────────────────────
// O portão liberava QUALQUER caminho terminado em ".html" (`rota.endsWith(".html")`).
// Nenhuma rota real do app termina assim hoje, então não vazava nada — mas
// bastaria alguém criar uma pra abrir uma tela interna sem login. A lista agora
// é explícita: só os arquivos que existem de verdade em public/.
console.log("\nP2 — terminar em .html não pode virar passe livre");
ok(isRotaPublica("/app/inicio.html") === false, "/app/inicio.html NÃO abre sem login");
ok(isRotaPublica("/admin/membros.html") === false, "/admin/membros.html NÃO abre sem login");
ok(isRotaPublica("/app/conta.html") === false, "qualquer tela interna com .html continua protegida");
ok(isRotaPublica("/inventado.html") === false, "arquivo .html que não existe em public/ não é rota pública");
ok(isRotaPublica("/vendas.html") === true, "/vendas.html (a landing de verdade) abre sem login");
ok(isRotaPublica("/planilha-preview.html") === true, "/planilha-preview.html abre sem login");
ok(isRotaPublica("/POLITICA-PRIVACIDADE.HTML") === true, "maiúscula também abre (link digitado à mão)");

// A lista tem que ser a realidade de public/: tudo que está lá é servido como
// arquivo estático, com ou sem login. Se alguém puser um .html novo em public/,
// este teste quebra e obriga a decidir — em vez de o portão mentir em silêncio.
{
  const naPasta = readdirSync(path.join(__dirname, "..", "public"))
    .filter((f) => f.toLowerCase().endsWith(".html"))
    .map((f) => `/${f.toLowerCase()}`)
    .sort();
  const naLista = [...ARQUIVOS_PUBLICOS].sort();
  ok(
    JSON.stringify(naLista) === JSON.stringify(naPasta),
    `a lista de páginas .html públicas bate com public/ (lista: ${naLista.join(", ")} · pasta: ${naPasta.join(", ")})`,
  );
}

ok(isRotaPublica("/app") === false, "o app continua atrás do login");
ok(isRotaPublica("/app/inicio") === false, "telas internas continuam atrás do login");
ok(isRotaPublica("/admin/membros") === false, "o painel de admin continua atrás do login");
ok(isRotaPublica("/obrigadoxyz") === false, "rota parecida não escapa do login");
ok(isRotaPublica("/app/obrigado") === false, "/obrigado só vale na raiz");
ok(isRotaPublica(null) === false, "sem rota conhecida, protege (fail-closed)");
ok(isRotaPublica("") === false, "rota vazia, protege");

// ── P3 · nunca mais forçar a tela de permissão a cada login ────────────────
console.log("\nP3 — o Google não pode pedir permissão toda vez");
const promptNormal: string = promptDoLogin(false);
const promptTroca: string = promptDoLogin(true);
ok(promptNormal !== "consent", "login normal NÃO força a tela de consentimento");
ok(promptDoLogin(false) === "", "login normal reaproveita a autorização que já existe");
ok(
  promptDoLogin(true) === "select_account",
  "quem clicou em 'tentar com outra conta' vê o seletor de contas (senão fica preso na conta errada)",
);
ok(promptTroca !== "consent", "nem trocando de conta a permissão é forçada");

console.log(`\nTotal: ${pass} passou, ${fail} falhou`);
process.exit(fail ? 1 : 0);
