/**
 * test-auto-sync.ts — a sincronização automática da planilha, offline.
 *
 * Por que este teste existe: até 12/09/2026 o app PROMETIA (CLAUDE.md decisão #4
 * e a página de vendas) que "cada mudança sincroniza sozinha", e isso não estava
 * no código — a planilha só andava quando alguém apertava o botão. O motor foi
 * extraído pra lib/sheets/sync-runner.ts justamente pra a regra de disparo poder
 * ser provada sem rede e sem conta Google.
 *
 * O tempo aqui é FALSO (classe Relogio): nada de setTimeout de verdade, senão o
 * teste demoraria 4 s por caso e ficaria instável. Rede também é falsa: o
 * transporte (`fetcher`) é injetado.
 *
 * Desde 12/09/2026 (rodada dos bloqueios) ele também guarda o caso mais caro do
 * app: "Apagar tudo" NÃO pode esvaziar a planilha de quem pagou. O juiz provou
 * no navegador que esvaziava — o efeito que avisa o motor não respeitava a marca
 * de "pule esta mudança", o motor esperava 4 s e mandava o estado vazio.
 *
 * Roda com: npx tsx scripts/test-auto-sync.ts
 */

import { readFileSync } from "node:fs";
import {
  AutoSync,
  DEBOUNCE_MS,
  ESPERAS_MS,
  ErroDeAutorizacao,
  MAX_TENTATIVAS,
  SCOPES,
  apagariaAPlanilha,
  assinaturaDados,
  ehErroDeAutorizacao,
  sincronizar,
  tokenValido,
  type AutoSyncAviso,
  type AutoSyncDeps,
  type GoogleFetch,
  type SheetMeta,
  type Token,
} from "../lib/sheets/sync-runner";
import { LAYOUT_VERSION, type SyncInput } from "../lib/sheets/builder";
// As duas reações a uma mudança de dados moram no provider, mas são funções
// puras JUSTAMENTE pra poderem ser rodadas aqui, sem navegador — é o código de
// verdade, não uma cópia do que o efeito faz.
import { PulaUmaRodada, aoApagarTudo, avisarMotorDaPlanilha, devoGravar } from "../providers/virada-provider";

const fonte = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), "utf8");

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
    failures.push(label + (detail ? ` [${detail}]` : ""));
  }
}

function assertEq(actual: unknown, expected: unknown, label: string) {
  const ok = actual === expected;
  assert(ok, label, ok ? undefined : `esperado=${JSON.stringify(expected)}, obtido=${JSON.stringify(actual)}`);
}

/** Deixa as promises pendentes andarem sem mexer no relógio falso. */
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

// O automático manda a falha pro console e NUNCA pra tela do usuário. Aqui os
// avisos viram lista: some o barulho da saída e dá pra conferir que foi só isso.
const avisosDeConsole: string[] = [];
console.warn = (...args: unknown[]) => { avisosDeConsole.push(args.map(String).join(" ")); };

// ─── Relógio falso ────────────────────────────────────────────────────────────
// `agora`/`agendar`/`cancelar` que o AutoSync recebe por injeção. Avançar o
// tempo é chamar avancar(ms): dispara o que venceu, na ordem, e deixa as
// promises resolverem entre um e outro.

class Relogio {
  t = 1_700_000_000_000;
  private fila: { id: number; quando: number; fn: () => void }[] = [];
  private seq = 0;

  agora = () => this.t;

  agendar = (fn: () => void, ms: number) => {
    const id = ++this.seq;
    this.fila.push({ id, quando: this.t + ms, fn });
    return id;
  };

  cancelar = (h: unknown) => {
    this.fila = this.fila.filter((item) => item.id !== h);
  };

  get agendados() {
    return this.fila.length;
  }

  async avancar(ms: number) {
    const alvo = this.t + ms;
    for (;;) {
      const pronto = this.fila.filter((item) => item.quando <= alvo).sort((a, b) => a.quando - b.quando)[0];
      if (!pronto) break;
      this.fila = this.fila.filter((item) => item !== pronto);
      this.t = pronto.quando;
      pronto.fn();
      await flush();
    }
    this.t = alvo;
    await flush();
  }
}

// ─── Ambiente falso ───────────────────────────────────────────────────────────

const META_BASE: SheetMeta = {
  spreadsheetId: "planilha-1",
  spreadsheetUrl: "https://docs.google.com/spreadsheets/d/planilha-1",
  lastSync: "2026-09-12T10:00:00.000Z",
  layoutVersion: LAYOUT_VERSION,
};

function dados(n: number): SyncInput {
  return {
    expenses: Array.from({ length: n }, (_, i) => ({
      id: `e${i}`,
      description: `Gasto ${i}`,
      value: 10 + i,
      category: "Mercado",
      date: "2026-09-10",
    })),
    incomes: [],
    debts: [],
    goals: [],
  };
}

interface Ambiente {
  relogio: Relogio;
  auto: AutoSync;
  envios: { token: string; dados: SyncInput }[];
  metaGravada: SheetMeta[];
  avisos: AutoSyncAviso[];
  tokenLimpo: () => number;
  setMeta: (meta: SheetMeta | null) => void;
  setToken: (token: Token | null) => void;
  setVisivel: (v: boolean) => void;
}

function montarAmbiente(opts: {
  meta?: SheetMeta | null;
  token?: Token | null;
  visivel?: boolean;
  enviar?: (token: string, meta: SheetMeta, entrada: SyncInput) => Promise<SheetMeta>;
} = {}): Ambiente {
  const relogio = new Relogio();
  let meta: SheetMeta | null = opts.meta === undefined ? { ...META_BASE } : opts.meta;
  let token: Token | null =
    opts.token === undefined ? { access_token: "tok-ok", expires_at: relogio.t + 30 * 60 * 1000 } : opts.token;
  let visivel = opts.visivel ?? true;
  let limpezas = 0;

  const envios: Ambiente["envios"] = [];
  const metaGravada: SheetMeta[] = [];
  const avisos: AutoSyncAviso[] = [];

  const deps: AutoSyncDeps = {
    agora: relogio.agora,
    agendar: relogio.agendar,
    cancelar: relogio.cancelar,
    visivel: () => visivel,
    lerMeta: () => meta,
    gravarMeta: (novo) => {
      meta = novo;
      metaGravada.push(novo);
    },
    lerToken: () => token,
    limparToken: () => {
      token = null;
      limpezas += 1;
    },
    enviar: async (t, m, entrada) => {
      envios.push({ token: t, dados: entrada });
      if (opts.enviar) return opts.enviar(t, m, entrada);
      return {
        ...m,
        lastSync: new Date(relogio.agora()).toISOString(),
        layoutVersion: LAYOUT_VERSION,
        baseline: assinaturaDados(entrada),
      };
    },
    avisar: (aviso) => avisos.push(aviso),
  };

  return {
    relogio,
    auto: new AutoSync(deps),
    envios,
    metaGravada,
    avisos,
    tokenLimpo: () => limpezas,
    setMeta: (m) => { meta = m; },
    setToken: (t) => { token = t; },
    setVisivel: (v) => { visivel = v; },
  };
}

const ultimoAviso = (amb: Ambiente) => amb.avisos[amb.avisos.length - 1];

// ─── Testes ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n=== S1 · escopo pedido ao Google ===");
  assertEq(SCOPES, "https://www.googleapis.com/auth/drive.file", "só drive.file (sem o escopo sensível spreadsheets)");
  assert(!SCOPES.includes("auth/spreadsheets"), "o escopo largo não voltou sorrateiramente");

  console.log("\n=== assinatura dos dados (o 'baseline anti-loop') ===");
  assertEq(assinaturaDados(dados(3)), assinaturaDados(dados(3)), "mesmos dados = mesma assinatura");
  assert(assinaturaDados(dados(3)) !== assinaturaDados(dados(4)), "dado a mais muda a assinatura");
  assert(
    assinaturaDados({ ...dados(1), settings: { expectedIncome: 2000 } }) !== assinaturaDados(dados(1)),
    "mudar a renda esperada muda a assinatura",
  );
  assert(
    assinaturaDados({ ...dados(1), settings: { expectedIncome: 2000 } }) !==
      assinaturaDados({ ...dados(1), settings: { expectedIncome: 2500 } }),
    "renda diferente, assinatura diferente",
  );

  console.log("\n=== token válido ===");
  assert(tokenValido({ access_token: "x", expires_at: 100 }, 99), "token com prazo à frente é válido");
  assert(!tokenValido({ access_token: "x", expires_at: 100 }, 100), "token vencido no exato instante não vale");
  assert(!tokenValido(null, 0), "sem token não vale");
  assert(!tokenValido({ access_token: "", expires_at: 1e15 }, 0), "token vazio não vale");

  console.log("\n=== (a) sem planilha criada, não sincroniza ===");
  {
    const amb = montarAmbiente({ meta: null });
    amb.auto.mudou(dados(2));
    await amb.relogio.avancar(DEBOUNCE_MS * 3);
    assertEq(amb.envios.length, 0, "nenhum envio sem planilha");
    assertEq(ultimoAviso(amb)?.estado, "desligado", "estado avisa 'desligado'");
  }

  console.log("\n=== (b) sem token, não sincroniza e não abre popup ===");
  {
    const amb = montarAmbiente({ token: null });
    amb.auto.mudou(dados(2));
    await amb.relogio.avancar(DEBOUNCE_MS * 3);
    assertEq(amb.envios.length, 0, "nenhum envio sem token");
    assertEq(amb.tokenLimpo(), 0, "não tenta limpar token que não existe");
    assertEq(ultimoAviso(amb)?.estado, "desligado", "estado avisa 'desligado'");
  }

  console.log("\n=== (b) token VENCIDO: não sincroniza e é apagado (achado T-07) ===");
  {
    const amb = montarAmbiente();
    amb.setToken({ access_token: "tok-velho", expires_at: 1 });
    amb.auto.mudou(dados(2));
    await amb.relogio.avancar(DEBOUNCE_MS * 2);
    assertEq(amb.envios.length, 0, "nenhum envio com token vencido");
    assertEq(amb.tokenLimpo(), 1, "token vencido foi apagado do aparelho");
  }

  console.log("\n=== (c) sem mudança de verdade, não sincroniza ===");
  {
    const entrada = dados(3);
    const amb = montarAmbiente({ meta: { ...META_BASE, baseline: assinaturaDados(entrada) } });
    amb.auto.mudou(entrada);
    await amb.relogio.avancar(DEBOUNCE_MS * 2);
    assertEq(amb.envios.length, 0, "dados iguais ao último envio = nada a fazer");
    assertEq(ultimoAviso(amb)?.estado, "em dia", "estado avisa 'em dia'");
  }

  console.log("\n=== debounce: várias mudanças seguidas = UM envio ===");
  {
    const amb = montarAmbiente();
    amb.auto.mudou(dados(1));
    await amb.relogio.avancar(1000);
    amb.auto.mudou(dados(2));
    await amb.relogio.avancar(1000);
    amb.auto.mudou(dados(3));
    await amb.relogio.avancar(1000);
    amb.auto.mudou(dados(4));
    assertEq(amb.envios.length, 0, "antes dos 4 s de silêncio, nada sai");
    await amb.relogio.avancar(DEBOUNCE_MS - 1);
    assertEq(amb.envios.length, 0, "um milissegundo antes, ainda nada");
    await amb.relogio.avancar(1);
    assertEq(amb.envios.length, 1, "um envio só, depois do silêncio");
    assertEq(amb.envios[0].dados.expenses.length, 4, "e com os dados MAIS NOVOS");
    assertEq(amb.metaGravada.length, 1, "meta da planilha gravada uma vez");
    assertEq(amb.metaGravada[0].baseline, assinaturaDados(dados(4)), "baseline gravado = o que foi enviado");
    assertEq(ultimoAviso(amb)?.estado, "em dia", "termina 'em dia'");
    assertEq(ultimoAviso(amb)?.ultimoEnvio, amb.metaGravada[0].lastSync, "hora do último envio vai pra tela");
  }

  console.log("\n=== depois de enviar, os MESMOS dados não sobem de novo (anti-loop) ===");
  {
    const amb = montarAmbiente();
    amb.auto.mudou(dados(2));
    await amb.relogio.avancar(DEBOUNCE_MS);
    assertEq(amb.envios.length, 1, "primeiro envio");
    amb.auto.mudou(dados(2));
    await amb.relogio.avancar(DEBOUNCE_MS * 2);
    assertEq(amb.envios.length, 1, "segundo aviso com dados idênticos não gera envio");
  }

  console.log("\n=== (e) nunca dois envios ao mesmo tempo ===");
  {
    let liberar: (() => void) | null = null;
    const amb = montarAmbiente({
      enviar: async (_t, m, entrada) => {
        await new Promise<void>((resolve) => { liberar = resolve; });
        return { ...m, lastSync: "2026-09-12T11:00:00.000Z", baseline: assinaturaDados(entrada) };
      },
    });
    amb.auto.mudou(dados(1));
    await amb.relogio.avancar(DEBOUNCE_MS);
    assertEq(amb.envios.length, 1, "primeiro envio começou");
    assertEq(ultimoAviso(amb)?.estado, "sincronizando", "estado avisa 'sincronizando'");

    amb.auto.mudou(dados(5)); // chega dado novo NO MEIO do envio
    await amb.relogio.avancar(DEBOUNCE_MS * 2);
    assertEq(amb.envios.length, 1, "não começa um segundo envio em paralelo");

    (liberar as unknown as () => void)();
    await flush();
    await amb.relogio.avancar(DEBOUNCE_MS);
    assertEq(amb.envios.length, 2, "o que chegou no meio sobe depois que o primeiro termina");
    assertEq(amb.envios[1].dados.expenses.length, 5, "e sobe com os dados novos");
  }

  console.log("\n=== (d) aba escondida: espera ficar visível ===");
  {
    const amb = montarAmbiente({ visivel: false });
    amb.auto.mudou(dados(2));
    await amb.relogio.avancar(DEBOUNCE_MS * 3);
    assertEq(amb.envios.length, 0, "em aba de fundo não sincroniza");
    amb.setVisivel(true);
    amb.auto.aoFicarVisivel();
    await flush();
    assertEq(amb.envios.length, 1, "ao voltar pra tela, sincroniza");
  }

  console.log("\n=== (f) falhou: tenta 3 vezes, com espera crescente, e desiste calado ===");
  {
    const amb = montarAmbiente({
      enviar: async () => { throw new Error("HTTP 500 — servidor do Google fora do ar"); },
    });
    amb.auto.mudou(dados(2));
    await amb.relogio.avancar(DEBOUNCE_MS);
    assertEq(amb.envios.length, 1, "1ª tentativa");
    await amb.relogio.avancar(ESPERAS_MS[0] - 1);
    assertEq(amb.envios.length, 1, "espera antes de tentar de novo");
    await amb.relogio.avancar(1);
    assertEq(amb.envios.length, 2, "2ª tentativa");
    await amb.relogio.avancar(ESPERAS_MS[1]);
    assertEq(amb.envios.length, MAX_TENTATIVAS, "3ª tentativa");
    await amb.relogio.avancar(60 * 60 * 1000);
    assertEq(amb.envios.length, MAX_TENTATIVAS, "depois de 3, desiste — não fica martelando o Google");
    assertEq(amb.metaGravada.length, 0, "nada de baseline novo: os dados NÃO chegaram na planilha");
    assert(
      amb.avisos.every((a) => a.estado !== "em dia"),
      "nunca diz 'em dia' quando não conseguiu enviar",
    );
    assertEq(avisosDeConsole.length, MAX_TENTATIVAS, "as 3 falhas foram pro console (e só pra ele)");
    assert(ESPERAS_MS[1] > ESPERAS_MS[0], "a espera entre tentativas cresce");
  }

  avisosDeConsole.length = 0;

  console.log("\n=== (f) falha só na 1ª: a 2ª tentativa resolve ===");
  {
    let vezes = 0;
    const amb = montarAmbiente({
      enviar: async (_t, m, entrada) => {
        vezes += 1;
        if (vezes === 1) throw new Error("rede caiu");
        return { ...m, lastSync: "2026-09-12T12:00:00.000Z", baseline: assinaturaDados(entrada) };
      },
    });
    amb.auto.mudou(dados(2));
    await amb.relogio.avancar(DEBOUNCE_MS);
    await amb.relogio.avancar(ESPERAS_MS[0]);
    assertEq(amb.envios.length, 2, "tentou duas vezes");
    assertEq(amb.metaGravada.length, 1, "gravou a meta do envio que deu certo");
    assertEq(ultimoAviso(amb)?.estado, "em dia", "acaba 'em dia'");
  }

  console.log("\n=== erro de autorização: não insiste e apaga o token ===");
  {
    const amb = montarAmbiente({
      enviar: async () => { throw new ErroDeAutorizacao("HTTP 401 — token inválido"); },
    });
    amb.auto.mudou(dados(2));
    await amb.relogio.avancar(DEBOUNCE_MS);
    assertEq(amb.envios.length, 1, "uma tentativa só (insistir não resolveria)");
    assertEq(amb.tokenLimpo(), 1, "token morto sai do aparelho");
    await amb.relogio.avancar(60 * 60 * 1000);
    assertEq(amb.envios.length, 1, "e não volta sozinho");
    assertEq(ultimoAviso(amb)?.estado, "desligado", "estado avisa 'desligado' (o botão religa)");
  }

  console.log("\n=== ehErroDeAutorizacao ===");
  assert(ehErroDeAutorizacao(new ErroDeAutorizacao("x")), "reconhece o erro de autorização");
  assert(!ehErroDeAutorizacao(new Error("HTTP 500")), "erro comum não é de autorização");

  console.log("\n=== parar(): ao sair da tela nada mais dispara ===");
  {
    const amb = montarAmbiente();
    amb.auto.mudou(dados(2));
    amb.auto.parar();
    await amb.relogio.avancar(DEBOUNCE_MS * 3);
    assertEq(amb.envios.length, 0, "depois de parar, nenhum envio");
    assertEq(amb.relogio.agendados, 0, "e nenhum agendamento pendurado");
  }

  console.log("\n=== sincronizar(): a sequência de chamadas ao Google ===");
  {
    // planilha que já existe e já está no layout de hoje → só manda os dados
    const chamadas: string[] = [];
    const fetcher = async (method: string, endpoint: string) => {
      chamadas.push(`${method} ${endpoint.split("?")[0]}`);
      return {};
    };
    const meta = await sincronizar({
      token: "tok",
      meta: { ...META_BASE },
      dados: dados(3),
      email: "cliente@exemplo.com",
      fetcher,
      agora: () => 1_700_000_000_000,
    });
    assert(
      chamadas.every((c) => !c.includes("POST /spreadsheets ")),
      "não cria planilha nova quando já existe",
    );
    assert(chamadas.includes("POST /spreadsheets/planilha-1/values:batchClear"), "limpa as faixas de dados");
    assert(chamadas.includes("POST /spreadsheets/planilha-1/values:batchUpdate"), "grava os dados");
    assertEq(meta.spreadsheetId, "planilha-1", "mantém a mesma planilha");
    assertEq(meta.layoutVersion, LAYOUT_VERSION, "carimba a versão do layout");
    assertEq(meta.baseline, assinaturaDados(dados(3)), "devolve o baseline do que foi enviado");
    assertEq(meta.lastSync, new Date(1_700_000_000_000).toISOString(), "hora do envio vem do relógio injetado");
  }

  {
    // planilha AINDA não existe → cria
    const chamadas: string[] = [];
    const fetcher = async (method: string, endpoint: string) => {
      chamadas.push(`${method} ${endpoint.split("?")[0]}`);
      if (method === "POST" && endpoint === "/spreadsheets") {
        return { spreadsheetId: "nova-1", sheets: [{ properties: { title: "Lançamentos", sheetId: 7 } }] };
      }
      return {};
    };
    const meta = await sincronizar({ token: "tok", meta: null, dados: dados(1), email: "c@e.com", fetcher });
    assertEq(chamadas[0], "POST /spreadsheets", "primeiro cria a planilha");
    assertEq(meta.spreadsheetId, "nova-1", "guarda o id da planilha criada");
    assertEq(meta.spreadsheetUrl, "https://docs.google.com/spreadsheets/d/nova-1", "guarda o link pra abrir");
  }

  {
    // planilha de layout ANTIGO → atualiza o visual antes de mandar os dados
    const chamadas: string[] = [];
    let avisouLayout = 0;
    const fetcher = async (method: string, endpoint: string) => {
      chamadas.push(`${method} ${endpoint.split("?")[0]}`);
      if (method === "GET") return { sheets: [{ properties: { title: "Lançamentos", sheetId: 1 } }] };
      return {};
    };
    await sincronizar({
      token: "tok",
      meta: { ...META_BASE, layoutVersion: "2026-01-01.0" },
      dados: dados(1),
      email: "c@e.com",
      fetcher,
      aoAtualizarLayout: () => { avisouLayout += 1; },
    });
    assertEq(chamadas[0], "GET /spreadsheets/planilha-1", "lê a planilha pra saber o que tem lá");
    assert(avisouLayout >= 2, "avisa a tela quando começa e quando termina o visual novo");
  }

  // ───────────────────────────────────────────────────────────────────────────
  // B1 · "Apagar tudo" não pode encostar na planilha do cliente
  // ───────────────────────────────────────────────────────────────────────────

  console.log("\n=== B1(a) 'apagar tudo': o efeito que avisa o motor RESPEITA a marca ===");
  {
    // O provider tem DOIS efeitos ouvindo a mesma mudança de dados: o que avisa
    // o motor da planilha e o que grava no IndexedDB. O React roda na ordem em
    // que foram declarados — e é o segundo que apaga a marca. Aqui rodamos
    // exatamente as funções que os efeitos chamam, na mesma ordem.
    const marca = new PulaUmaRodada();
    const amb = montarAmbiente();

    const dadosDoCliente = dados(3);
    assert(avisarMotorDaPlanilha(marca, true, amb.auto, dadosDoCliente), "mudança comum avisa o motor");
    assert(devoGravar(marca, true), "mudança comum também é gravada no aparelho");
    await amb.relogio.avancar(DEBOUNCE_MS);
    assertEq(amb.envios.length, 1, "a planilha recebeu o que a pessoa lançou");

    // "Apagar todos os dados deste celular"
    aoApagarTudo(marca, amb.auto);
    const vazio: SyncInput = { expenses: [], incomes: [], debts: [], goals: [] };
    assert(!avisarMotorDaPlanilha(marca, true, amb.auto, vazio), "depois do reset o motor NÃO é avisado do estado vazio");
    assert(!devoGravar(marca, true), "e a gravação da rodada também é pulada (era o que já acontecia)");
    await amb.relogio.avancar(10 * 60 * 1000); // bem mais que o silêncio dos 4 s, sem vencer o token falso
    assertEq(amb.envios.length, 1, "nenhum envio novo: a planilha do cliente continua intacta");

    // A marca vale por UMA rodada só: o próximo lançamento tem de sincronizar.
    assert(avisarMotorDaPlanilha(marca, true, amb.auto, dados(1)), "lançar algo depois do reset volta a avisar o motor");
    assert(devoGravar(marca, true), "e volta a gravar no aparelho");
    await amb.relogio.avancar(DEBOUNCE_MS);
    assertEq(amb.envios.length, 2, "o lançamento novo sobe normalmente");
    assertEq(amb.envios[1].dados.expenses.length, 1, "e sobe com o dado novo, não com o vazio");
  }

  console.log("\n=== B1(a) a marca é ESPIADA por quem roda antes e CONSUMIDA por quem roda depois ===");
  {
    const marca = new PulaUmaRodada();
    marca.marcar();
    assert(marca.espiar(), "espiar vê a marca");
    assert(marca.espiar(), "espiar de novo continua vendo (espiar não consome)");
    assert(marca.consumir(), "consumir vê a marca");
    assert(!marca.espiar(), "e depois de consumida a marca acabou");

    // Ordem dos efeitos no provider: quem avisa o motor tem de estar declarado
    // ANTES de quem grava — senão a marca seria consumida antes de ser espiada.
    const provider = fonte("providers/virada-provider.tsx");
    const iAvisa = provider.indexOf("avisarMotorDaPlanilha(");
    const iGrava = provider.indexOf("devoGravar(");
    assert(iAvisa > 0 && iGrava > 0, "o provider usa as duas funções puras");
    assert(iAvisa < iGrava, "o efeito que avisa o motor está declarado antes do que grava");
  }

  console.log("\n=== B1(a) reset sem planilha conectada não quebra ===");
  {
    const marca = new PulaUmaRodada();
    const amb = montarAmbiente({ meta: null });
    aoApagarTudo(marca, null); // sem motor montado ainda
    aoApagarTudo(marca, amb.auto);
    const vazio: SyncInput = { expenses: [], incomes: [], debts: [], goals: [] };
    assert(!avisarMotorDaPlanilha(marca, true, amb.auto, vazio), "sem planilha o motor também não é avisado");
    await amb.relogio.avancar(10 * 60 * 1000); // bem mais que o silêncio dos 4 s, sem vencer o token falso
    assertEq(amb.envios.length, 0, "e nada é enviado");
  }

  console.log("\n=== B1(b) rede de segurança: o automático NUNCA esvazia a planilha ===");
  {
    const vazio: SyncInput = { expenses: [], incomes: [], debts: [], goals: [] };
    assert(apagariaAPlanilha(vazio, assinaturaDados(dados(3))), "estado vazio depois de um envio com dados = destrutivo");
    assert(!apagariaAPlanilha(dados(1), assinaturaDados(dados(3))), "estado com dados nunca é destrutivo");
    assert(!apagariaAPlanilha(vazio, assinaturaDados(vazio)), "vazio sobre vazio não apaga nada de ninguém");

    // Mesmo que alguém quebre a proteção (a) lá no provider, o motor recusa.
    const antes = avisosDeConsole.length;
    const amb = montarAmbiente({ meta: { ...META_BASE, baseline: assinaturaDados(dados(3)) } });
    amb.auto.mudou(vazio);
    await amb.relogio.avancar(10 * 60 * 1000); // bem mais que o silêncio dos 4 s, sem vencer o token falso
    assertEq(amb.envios.length, 0, "o motor recusa o envio que zeraria a planilha");
    assertEq(amb.metaGravada.length, 0, "e não carimba baseline nenhum");
    assert(avisosDeConsole.length > antes, "a recusa fica registrada no console, pra quem mantém o app");
    assert(
      amb.avisos.every((a) => a.estado !== "desligado"),
      "não diz 'desligado' — isso mandaria a pessoa apertar o botão, que é justamente o que esvaziaria",
    );
  }

  console.log("\n=== B1(b) planilha que já estava vazia continua sincronizando (a porta não trancou) ===");
  {
    const vazio: SyncInput = { expenses: [], incomes: [], debts: [], goals: [] };
    const comRenda: SyncInput = { ...vazio, settings: { expectedIncome: 3000 } };
    const amb = montarAmbiente({ meta: { ...META_BASE, baseline: assinaturaDados(vazio) } });
    amb.auto.mudou(comRenda);
    await amb.relogio.avancar(DEBOUNCE_MS);
    assertEq(amb.envios.length, 1, "com a planilha já vazia, mudar só a renda esperada continua subindo");
  }

  console.log("\n=== B1(c) o reset faz o motor esquecer o que estava na fila ===");
  {
    const amb = montarAmbiente();
    amb.auto.mudou(dados(3));
    await amb.relogio.avancar(DEBOUNCE_MS - 1); // envio JÁ agendado, faltando 1 ms
    assertEq(amb.envios.length, 0, "ainda não saiu");
    amb.auto.esquecer();
    assertEq(amb.relogio.agendados, 0, "o reset cancela a espera pendente");
    await amb.relogio.avancar(10 * 60 * 1000); // bem mais que o silêncio dos 4 s, sem vencer o token falso
    assertEq(amb.envios.length, 0, "o envio agendado antes do reset não dispara depois dele");

    amb.auto.mudou(dados(2));
    await amb.relogio.avancar(DEBOUNCE_MS);
    assertEq(amb.envios.length, 1, "esquecer não desliga o motor: o que vier depois sincroniza");
  }

  // ───────────────────────────────────────────────────────────────────────────
  // B2 · uma sincronização de cada vez, venha do botão ou do automático
  // ───────────────────────────────────────────────────────────────────────────

  console.log("\n=== B2 trava compartilhada: botão e automático não mexem na planilha ao mesmo tempo ===");
  {
    const chamadas: string[] = [];
    let liberar: (() => void) | null = null;
    const travado = new Promise<void>((resolve) => { liberar = resolve; });
    let primeiraDaA = true;

    const fetcher: GoogleFetch = async (method, endpoint) => {
      chamadas.push(endpoint.split("?")[0]);
      if (endpoint.includes("planilha-A") && primeiraDaA) {
        primeiraDaA = false;
        await travado; // segura o "envio automático" no meio do caminho
      }
      return {};
    };

    const metaA: SheetMeta = { ...META_BASE, spreadsheetId: "planilha-A" };
    const metaB: SheetMeta = { ...META_BASE, spreadsheetId: "planilha-B" };
    const automatico = sincronizar({ token: "tok", meta: metaA, dados: dados(2), email: "c@e.com", fetcher });
    const botao = sincronizar({ token: "tok", meta: metaB, dados: dados(3), email: "c@e.com", fetcher });

    await flush();
    await flush();
    assert(chamadas.length > 0, "o primeiro pedido começou");
    assert(chamadas.every((c) => c.includes("planilha-A")), "o segundo pedido espera — não começa em paralelo");

    (liberar as unknown as () => void)();
    await automatico;
    await botao;

    const ultimaDaA = chamadas.map((c) => c.includes("planilha-A")).lastIndexOf(true);
    const primeiraDaB = chamadas.findIndex((c) => c.includes("planilha-B"));
    assert(primeiraDaB > ultimaDaA, "as chamadas não se misturam: a segunda só começa quando a primeira acaba");
    assert(chamadas.some((c) => c.includes("planilha-B")), "e a segunda acontece de verdade (não é descartada em silêncio)");
  }

  console.log("\n=== B2 um erro não pode deixar a fila travada pra sempre ===");
  {
    const quebrado: GoogleFetch = async () => { throw new Error("rede caiu"); };
    let falhou = false;
    try {
      await sincronizar({ token: "tok", meta: { ...META_BASE }, dados: dados(1), email: "c@e.com", fetcher: quebrado });
    } catch {
      falhou = true;
    }
    assert(falhou, "o erro chega em quem pediu");

    const chamadas: string[] = [];
    const ok: GoogleFetch = async (method, endpoint) => { chamadas.push(endpoint); return {}; };
    await sincronizar({ token: "tok", meta: { ...META_BASE }, dados: dados(1), email: "c@e.com", fetcher: ok });
    assert(chamadas.length > 0, "o pedido seguinte roda normalmente");
  }

  // ───────────────────────────────────────────────────────────────────────────
  // B3 · mudança só de layout também sobe sozinha
  // ───────────────────────────────────────────────────────────────────────────

  console.log("\n=== B3 atualizar o app muda a assinatura, mesmo sem lançamento novo ===");
  {
    const entrada = dados(3);
    const assinatura = assinaturaDados(entrada);
    assert(assinatura.endsWith(LAYOUT_VERSION), "a versão do layout entra na assinatura");

    // Planilha do cliente: mesmos dados, layout de uma versão anterior do app.
    const baselineAntigo = `${assinatura.slice(0, -LAYOUT_VERSION.length)}2026-01-01.0`;
    const amb = montarAmbiente({ meta: { ...META_BASE, layoutVersion: "2026-01-01.0", baseline: baselineAntigo } });
    amb.auto.mudou(entrada);
    await amb.relogio.avancar(DEBOUNCE_MS);
    assertEq(amb.envios.length, 1, "quem só atualizou o app recebe o visual novo sem tocar no botão");
    assertEq(amb.metaGravada[0]?.baseline, assinatura, "o baseline novo já é o do layout de hoje");

    // E não vira loop: com o layout aplicado, os mesmos dados não sobem de novo.
    amb.auto.mudou(entrada);
    await amb.relogio.avancar(10 * 60 * 1000); // bem mais que o silêncio dos 4 s, sem vencer o token falso
    assertEq(amb.envios.length, 1, "depois de aplicado, a assinatura bate e o motor para");
  }

  // ───────────────────────────────────────────────────────────────────────────
  // B4/B5 · o que o comprador lê na tela da Conta
  // ───────────────────────────────────────────────────────────────────────────

  console.log("\n=== B4 recado de desenvolvedor não aparece pra quem pagou ===");
  {
    const botao = fonte("components/GoogleSyncButton.tsx");
    assert(!botao.includes(".env.local"), "nada de '.env.local' na tela");
    const linhasComVariavel = botao
      .split("\n")
      .filter((l) => l.includes("NEXT_PUBLIC_GOOGLE_CLIENT_ID"))
      .filter((l) => !l.includes("process.env") && !l.includes("console.error") && !l.trimStart().startsWith("*"));
    assertEq(linhasComVariavel.length, 0, "o nome da variável só vive no process.env e no console.error");
    assert(/console\.error\([\s\S]{0,200}NEXT_PUBLIC_GOOGLE_CLIENT_ID/.test(botao), "o detalhe técnico vai pro console");
    assert(/wa\.me|WhatsApp/i.test(botao), "e a tela mostra um caminho humano: falar com o suporte");
  }

  console.log("\n=== B5 aviso honesto antes da tela de permissão do Google ===");
  {
    const botao = fonte("components/GoogleSyncButton.tsx");
    // lastIndexOf: o cabeçalho do arquivo também cita o nome do botão.
    const trecho = botao.slice(botao.indexOf("Conectar sua planilha"), botao.lastIndexOf("Conectar Google Planilhas"));
    assert(trecho.length > 0, "o trecho conferido é o que fica acima do botão de conectar");
    // O JSX quebra a frase em várias linhas; na tela ela é uma só.
    const texto = trecho.replace(/\s+/g, " ");
    assert(/permiss/i.test(texto), "avisa que o Google vai pedir permissão");
    assert(/normal/i.test(texto), "e diz que isso é normal");
    assert(/sua conta|seu Google|seu Drive/i.test(texto), "diz que a planilha nasce na conta dela");
    assert(
      /criar|criou|cria/.test(texto) && /outro arquivo|outros arquivos|mais nada|nada mais/i.test(texto),
      "e que o app só enxerga o arquivo que ele mesmo cria",
    );
  }

  console.log("\n=== B1 · a janela de 'apagar tudo' promete exatamente o que o código faz ===");
  {
    const conta = fonte("app/app/conta/page.tsx").replace(/\s+/g, " ");
    assert(/planilha Google não é apagada/.test(conta), "com planilha conectada, diz que ela NÃO é apagada");
    assert(/voltar a lançar/.test(conta), "e avisa que, lançando de novo, a planilha passa a mostrar o que é novo");
    assert(/não conectou a planilha/.test(conta), "sem planilha, continua avisando que não há de onde recuperar");
  }

  console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passaram, ${failed} falharam`);
  if (failed > 0) {
    for (const f of failures) console.error(`   · ${f}`);
    process.exit(1);
  }
}

void main();
