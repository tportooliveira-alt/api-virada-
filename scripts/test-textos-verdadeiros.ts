/**
 * test-textos-verdadeiros.ts — amarra os TEXTOS do produto no código.
 *
 * Por que este teste existe: em 12/09/2026 descobrimos que três documentos
 * afirmavam coisas que o código não fazia — o CLAUDE.md dizia que a planilha
 * "sincroniza sozinha" (não sincronizava), a política de privacidade dizia que
 * "não acessamos seus outros dados Google" (o app pedia o escopo largo, que dá
 * acesso a TODAS as planilhas da conta) e dizia que os tokens do Google são
 * "validados em servidor" (o token da planilha nunca passa pelo servidor: o
 * navegador fala direto com o Google). Texto falso em página pública é munição
 * de reembolso e reprova numa verificação do Google.
 *
 * O remédio não é lembrar de revisar: é fazer o texto QUEBRAR quando o código
 * muda. Cada asserção aqui lê uma constante real (`SCOPES`, `DEBOUNCE_MS`, o
 * nome da base IndexedDB) e exige que a página/doc diga a mesma coisa. Quem
 * trocar o escopo de novo vai ver este teste vermelho antes de vender.
 *
 * Roda com: npx tsx scripts/test-textos-verdadeiros.ts   (e com TZ=UTC)
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { DEBOUNCE_MS, MAX_TENTATIVAS, SCOPES } from "../lib/sheets/sync-runner";

const RAIZ = path.join(__dirname, "..");
const ler = (rel: string) => readFileSync(path.join(RAIZ, rel), "utf8");

let falhas = 0;
let checados = 0;

function ok(condicao: boolean, oQue: string) {
  checados += 1;
  if (!condicao) {
    falhas += 1;
    console.error(`  ✗ ${oQue}`);
  }
}

/** O texto PRECISA dizer isso. */
function contem(texto: string, agulha: string, oQue: string) {
  ok(texto.includes(agulha), `${oQue} — faltou dizer: "${agulha}"`);
}

/** O texto NÃO pode dizer isso (frase que já foi falsa). */
function naoContem(texto: string, agulha: string, porque: string) {
  ok(!texto.includes(agulha), `frase proibida ainda está lá: "${agulha}" — ${porque}`);
}

function titulo(t: string) {
  console.log(`\n${t}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Escopo do Google: o que o código pede é o que a política promete
// ─────────────────────────────────────────────────────────────────────────────
titulo("1. Escopo do Google");

const politica = ler("public/politica-privacidade.html");
const termos = ler("public/termos-de-uso.html");

ok(SCOPES === "https://www.googleapis.com/auth/drive.file", "o app só pode pedir drive.file");
contem(politica, SCOPES, "política de privacidade precisa nomear o escopo exato que o app pede");
contem(politica, "drive.file", "política precisa usar o nome do escopo, que é o que aparece pra quem audita");

// A frase velha era vaga E falsa: vaga porque não dizia QUAL acesso, falsa
// porque o escopo pedido abria todas as planilhas da conta.
naoContem(
  politica,
  "não acessamos seus outros dados Google",
  "vago demais; a política agora diz exatamente o que o app pode e não pode abrir",
);
naoContem(
  politica,
  // HISTÓRICO: escopo largo abandonado em 12/09/2026 (CLAUDE.md, decisão #13).
  "auth/spreadsheets",
  "esse é o escopo largo (todas as planilhas da conta); o app não pede mais isso",
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. O token da planilha NUNCA passa pelo servidor
// ─────────────────────────────────────────────────────────────────────────────
titulo("2. Caminho do token da planilha");

// Prova no código: quem chama sheets.googleapis.com é o sync-runner, que roda no
// navegador. Nenhuma rota de API do servidor toca no Google Planilhas.
function varrer(dir: string, extensoes: string[]): string[] {
  const saida: string[] = [];
  for (const item of readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
    const rel = path.join(dir, item.name);
    if (item.isDirectory()) saida.push(...varrer(rel, extensoes));
    else if (extensoes.some((e) => item.name.endsWith(e))) saida.push(rel);
  }
  return saida;
}

const rotasApi = varrer("app/api", [".ts"]);
const rotaQueFalaComPlanilha = rotasApi.filter((f) => ler(f).includes("sheets.googleapis.com"));
ok(
  rotaQueFalaComPlanilha.length === 0,
  `nenhuma rota do servidor pode falar com o Google Planilhas (achei: ${rotaQueFalaComPlanilha.join(", ")})`,
);
contem(ler("lib/sheets/sync-runner.ts"), "sheets.googleapis.com", "o navegador é quem fala com a planilha");

naoContem(
  politica,
  "Tokens de acesso Google validados em servidor",
  "só o token de LOGIN é conferido no servidor; o da planilha nunca sai do aparelho",
);
contem(politica, "não passa pelo nosso servidor", "a política precisa dizer que o token da planilha fica no aparelho");

// O login, esse sim, é conferido no servidor — e a política pode afirmar isso.
contem(ler("app/api/access/check/route.ts"), "tokeninfo", "o login é conferido no Google pelo servidor");

// ─────────────────────────────────────────────────────────────────────────────
// 3. Onde os dados financeiros moram de verdade
// ─────────────────────────────────────────────────────────────────────────────
titulo("3. Onde os dados moram");

const store = ler("lib/db/virada-store.ts");
ok(store.includes('const DB_NAME = "virada"'), "os dados financeiros moram no IndexedDB `virada`");
contem(politica, "IndexedDB", "a política precisa nomear onde os dados ficam");
naoContem(
  politica,
  "guardam seu login e seus dados financeiros",
  "os lançamentos não moram no localStorage: moram no IndexedDB",
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. Links das páginas públicas apontam pra arquivo que existe
// ─────────────────────────────────────────────────────────────────────────────
titulo("4. Links das páginas públicas");

for (const [nome, html] of [
  ["politica-privacidade.html", politica],
  ["termos-de-uso.html", termos],
] as const) {
  for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    const alvo = m[1];
    if (alvo.startsWith("/api/")) continue;
    ok(existsSync(path.join(RAIZ, "public", alvo)), `${nome}: link quebrado para ${alvo}`);
  }
}
contem(politica, 'href="/termos-de-uso.html"', "política precisa levar aos termos");
contem(termos, 'href="/politica-privacidade.html"', "termos precisam levar à política");

// ─────────────────────────────────────────────────────────────────────────────
// 5. CLAUDE.md decisão #4 — descreve o auto-sync que EXISTE
// ─────────────────────────────────────────────────────────────────────────────
titulo("5. CLAUDE.md decisão #4");

const claude = ler("CLAUDE.md");
contem(claude, "lib/sheets/sync-runner.ts", "a decisão #4 precisa apontar pro arquivo onde o motor mora");
contem(claude, "providers/virada-provider.tsx", "quem liga o automático é o provider");
contem(claude, `${DEBOUNCE_MS / 1000}s`, "o tempo de espera citado tem que ser o do código");
contem(claude, `${MAX_TENTATIVAS} tentativas`, "o número de tentativas citado tem que ser o do código");
naoContem(
  claude,
  "implementada em `components/GoogleSyncButton.tsx`",
  "essa era a afirmação falsa: o botão nunca sincronizou sozinho",
);
contem(claude, "drive.file", "a troca de escopo é decisão registrada");

// Todo caminho de arquivo citado no CLAUDE.md tem que existir — doc que aponta
// pra arquivo inexistente é a forma mais barata de mentira. Duas exceções, ambas
// de propósito: o CLAUDE.md fala dos arquivos que APAGOU (decisões #5 e #13), pra ninguém
// ressuscitá-los, e cita endereços públicos (começam com "/"), que são URL e não caminho.
const APAGADOS_DE_PROPOSITO = ["scripts/test_finance.js", "content/ebook.backup.md", "lib/sheets/google-sheets.ts"];
for (const m of claude.matchAll(/`([A-Za-z0-9_./-]+\.(?:ts|tsx|mjs|js|md|html|json))`/g)) {
  const alvo = m[1];
  if (!alvo.includes("/")) continue; // nome solto (ex.: `builder.ts`) não é caminho
  if (alvo.startsWith("/")) continue; // endereço no site, conferido no bloco 4
  if (APAGADOS_DE_PROPOSITO.includes(alvo)) continue;
  ok(existsSync(path.join(RAIZ, alvo)), `CLAUDE.md cita arquivo que não existe: ${alvo}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. docs/RETOMAR-AQUI.md — estado de hoje, não o de uma semana atrás
// ─────────────────────────────────────────────────────────────────────────────
titulo("6. docs/RETOMAR-AQUI.md");

const retomar = ler("docs/RETOMAR-AQUI.md");
contem(retomar, "12/09/2026", "o cabeçalho tem que datar o estado descrito");
naoContem(retomar, "Falta **um** passo", "não é mais um passo só, e o passo descrito já foi feito");
contem(retomar, "drive.file", "declarar o escopo no Google é pendência do dono");
contem(retomar, "confirmado pelo dono", "o que veio do dono precisa estar marcado como tal");

// ─────────────────────────────────────────────────────────────────────────────
// 7. scripts/README.md — o índice tem que cobrir os testes que existem
// ─────────────────────────────────────────────────────────────────────────────
titulo("7. scripts/README.md");

const readme = ler("scripts/README.md");
const testes = readdirSync(path.join(RAIZ, "scripts"))
  .filter((f) => f.startsWith("test-") && f.endsWith(".ts"))
  .sort();
for (const t of testes) contem(readme, t, `scripts/README.md não lista o teste ${t}`);

for (const m of readme.matchAll(/`([A-Za-z0-9_.-]+\.(?:ts|mjs|js|py|cjs))`/g)) {
  const alvo = m[1];
  const existe = existsSync(path.join(RAIZ, "scripts", alvo)) || existsSync(path.join(RAIZ, alvo));
  // O README fala de propósito de 2 testes APAGADOS (seção "REMOVIDOS"), pra
  // ninguém ressuscitá-los: esses dois não precisam existir.
  const removidoDeProposito = ["test_finance.js", "test_performance.js"].includes(alvo);
  ok(existe || removidoDeProposito, `scripts/README.md cita arquivo inexistente: ${alvo}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Termos de uso — a entrega descrita é a que o app faz
// ─────────────────────────────────────────────────────────────────────────────
titulo("8. Termos de uso");

contem(termos, "IndexedDB", "os termos precisam ser específicos sobre onde o dado mora");
contem(termos, "drive.file", "os termos descrevem o acesso que o app pede ao Google");
naoContem(
  termos,
  "Funcionalidade de exportação para Google Planilhas",
  "hoje não é só exportar: a planilha se cria e se atualiza sozinha, com limites descritos",
);

// ─────────────────────────────────────────────────────────────────────────────
// 9. Política: as três frases da seção de finalidade/segurança/armazenamento
//    que foram escritas em 12/09/2026 e o código NÃO cumpria.
//
// Elas entraram no lugar de frases falsas antigas — ou seja, trocou-se mentira
// por mentira mais específica, numa página pública, em seção de finalidade da
// LGPD. Cada asserção aqui lê o código e só deixa a promessa existir se o
// código a cumprir.
// ─────────────────────────────────────────────────────────────────────────────
titulo("9. Política — finalidade, segurança e armazenamento");

const authgate = ler("components/AuthGate.tsx");
const checkRoute = ler("app/api/access/check/route.ts");

// (a) "Prevenir fraudes pelo identificador da conta Google (sub)".
// O `sub` é GRAVADO no aparelho (AccessRecord), mas ninguém o COMPARA com nada:
// nem o AuthGate ao reabrir o app, nem a rota de checagem. Prometer que "o
// identificador não bate e o acesso é recusado" é descrever um código que não
// existe. A asserção vale nos dois futuros: se alguém implementar a comparação,
// a política pode voltar a falar dela.
const comparaSub =
  /\b(?:stored|record|access|salvo|local)\.sub\s*[!=]==/.test(authgate) ||
  /\bsub\s*[!=]==\s*(?:stored|record|access|salvo|local)\.sub/.test(authgate) ||
  /\.sub\s*[!=]==\s*\w+\.sub/.test(checkRoute);
ok(
  comparaSub || !politica.includes("o identificador não bate"),
  "política não pode prometer que o identificador da conta Google barra acesso — nada no código compara esse identificador",
);
naoContem(
  politica,
  "o identificador não bate e o acesso é recusado",
  "ninguém compara o `sub` em lugar nenhum (AuthGate.tsx e app/api/access/check/route.ts só o gravam/devolvem)",
);
// O que é verdade e a política pode dizer: quem informa o e-mail é o Google, e
// o servidor compara esse e-mail com a lista de compradores.
contem(checkRoute, "isMember(profile.email)", "o servidor compara o e-mail vindo do Google com a lista de compradores");

// (b) "não dá para forjar acesso mexendo no celular" — falso pela metade.
// O login é conferido no servidor, sim; mas depois disso o AuthGate abre o app
// a partir do registro gravado no localStorage, inclusive sem internet.
const confiaNoRegistroLocal =
  authgate.includes("navigator.onLine") && authgate.includes("loadAccess()");
ok(confiaNoRegistroLocal, "o AuthGate abre o app a partir do registro guardado no aparelho (inclusive offline)");
naoContem(
  politica,
  "não dá para forjar acesso mexendo no celular",
  "depois do primeiro login o app confia no registro gravado no localStorage — sem conferir de novo",
);
contem(
  politica,
  "o app guarda a resposta no seu aparelho",
  "a política precisa descrever que, depois da conferência, o app passa a confiar no registro local",
);

// (c) O que o localStorage guarda HOJE. Nenhum arquivo do app grava lançamentos
// lá: o IndexedDB é a fonte da verdade e o localStorage antigo só é LIDO uma vez
// (migração). Prometer "cópia de segurança dos seus lançamentos" é oferecer um
// backup que não existe — quem limpar o IndexedDB acharia que dá pra recuperar.
const fontesDoApp = [...varrer("providers", [".ts", ".tsx"]), ...varrer("components", [".ts", ".tsx"]), ...varrer("lib", [".ts", ".tsx"])];
const gravamLancamentosNoLocalStorage = fontesDoApp.filter((f) =>
  /localStorage\.setItem\(\s*storageKey/.test(ler(f)),
);
ok(
  gravamLancamentosNoLocalStorage.length === 0,
  `nenhum arquivo do app grava lançamentos no localStorage (achei: ${gravamLancamentosNoLocalStorage.join(", ")})`,
);
naoContem(
  politica,
  "cópia de segurança dos seus lançamentos",
  "o app não faz esse backup: os lançamentos moram no IndexedDB e o localStorage antigo só é lido uma vez, na migração",
);
// As chaves que o app realmente grava têm que estar descritas.
const syncRunner = ler("lib/sheets/sync-runner.ts");
ok(syncRunner.includes('TOKEN_KEY = "virada_google_token"'), "o token da planilha é gravado no localStorage");
ok(syncRunner.includes('SHEET_KEY = "virada_sheet_meta"'), "o link/meta da planilha é gravado no localStorage");
ok(authgate.includes('STORAGE_KEY = "virada_access_v2"'), "o registro de acesso é gravado no localStorage");
contem(politica, "autorização temporária da planilha", "a política precisa citar a autorização da planilha");

// (c2) A política manda a pessoa usar um botão do app pra apagar a cópia antiga.
// Botão citado tem que existir com ESSE nome na tela — senão a pessoa procura
// e não acha, que é a forma mais fácil de a política virar mentira.
if (politica.includes('"apagar todos os dados"')) {
  contem(
    ler("app/app/conta/page.tsx"),
    "Apagar todos os dados",
    "a política cita um botão da tela Conta: ele precisa existir com esse nome",
  );
}

// (d) A página de vendas guarda no navegador o ponto do vídeo. É pequeno e não
// é rastreamento, mas a seção diz "o que existe é o seguinte" — então existe.
if (ler("public/vendas-hero.js").includes("localStorage.setItem")) {
  contem(
    politica,
    "onde você parou o vídeo",
    "a página de vendas guarda o ponto do vídeo no navegador (public/vendas-hero.js) e a lista precisa dizer isso",
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. CLAUDE.md — o item de lint já resolvido não pode continuar aberto
// ─────────────────────────────────────────────────────────────────────────────
titulo("10. CLAUDE.md — pendências que já não existem");

naoContem(
  claude,
  "Warning de lint (`exhaustive-deps`) em `AuthGate.tsx:240`",
  "o lint está em zero avisos; item resolvido não pode ficar listado como pendência",
);

// ─────────────────────────────────────────────────────────────────────────────
// 11. O escopo sensível não pode estar vivo em lugar nenhum
// ─────────────────────────────────────────────────────────────────────────────
titulo("11. Escopo sensível fora do caminho");

// O wrapper de servidor `lib/sheets/google-sheets.ts` era código morto (só o
// teste o importava) e repetia a sequência do sync-runner: foi apagado em
// 12/09/2026. Em vez de conferir um arquivo só, varre TUDO — é o mesmo grep que
// um auditor do Google faria.
ok(
  !existsSync(path.join(RAIZ, "lib/sheets/google-sheets.ts")),
  "o wrapper de servidor da planilha (código morto, caminho duplicado) não voltou",
);
{
  const comEscopoLargo = ["lib", "app", "components", "scripts"]
    .flatMap((dir) => varrer(dir, [".ts", ".tsx"]))
    .filter((f) => ler(f).includes("https://www.googleapis.com/auth/spreadsheets\""));
  ok(
    comEscopoLargo.length === 0,
    `nenhum arquivo do produto pede o escopo largo de planilhas${comEscopoLargo.length ? ` (achei em ${comEscopoLargo.join(", ")})` : ""}`,
  );
}
contem(
  ler("docs/estrategia-google-sync.md"),
  "HISTÓRICO",
  "o doc de estratégia cita os dois escopos antigos: precisa estar marcado como histórico com data",
);

// ─────────────────────────────────────────────────────────────────────────────
console.log(
  falhas === 0
    ? `\n✅ textos verdadeiros: ${checados} afirmações conferidas contra o código.`
    : `\n❌ ${falhas} de ${checados} afirmações NÃO batem com o código.`,
);
process.exit(falhas === 0 ? 0 : 1);
