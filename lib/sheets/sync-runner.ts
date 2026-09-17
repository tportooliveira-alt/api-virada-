/**
 * sync-runner — o motor que fala com a planilha do cliente, FORA do React.
 *
 * Até 12/09/2026 toda essa lógica morava dentro de components/GoogleSyncButton.tsx,
 * e por isso a planilha só andava quando havia um botão na tela pra alguém
 * apertar: a "planilha plugada" que o CLAUDE.md e a página de vendas prometiam
 * simplesmente não existia. Aqui ficam três coisas, todas testáveis sem rede e
 * sem conta Google (scripts/test-auto-sync.ts injeta transporte e relógio):
 *
 *  1. `sincronizar` — a sequência de chamadas (criar / atualizar visual / mandar
 *     dados). O botão e o automático usam EXATAMENTE esta função; se um dia
 *     divergirem, a planilha do cliente vira loteria.
 *  2. `AutoSync` — a regra de QUANDO mandar sozinho: espera o silêncio, só com
 *     planilha e token na mão, só se o dado mudou de verdade, só com a aba na
 *     frente, uma de cada vez, 3 tentativas e desiste calado.
 *  3. Os acessos ao localStorage (token e meta da planilha), num lugar só — o
 *     botão e o provider liam as mesmas chaves por conta própria.
 *
 * Regra de convivência: o AUTOMÁTICO nunca mostra erro na tela nem abre popup.
 * Quem conversa com a pessoa é o botão da tela Conta.
 *
 * Teto conhecido: o app pega o token direto no navegador (fluxo implícito do
 * GIS), e esse token vale ~1 hora. NÃO existe refresh token — isso só viria com
 * um fluxo de código no servidor, guardando credencial do cliente lá, o que
 * contraria o pilar "os dados são seus, ficam no seu aparelho". Ou seja: o
 * automático trabalha enquanto a autorização estiver viva; depois disso a
 * planilha espera a pessoa tocar em "Atualizar agora" (e aí a renovação é
 * silenciosa, sem pedir consentimento de novo).
 */

import { LAYOUT_VERSION, type SyncInput } from "./builder";
import {
  SPREADSHEET_FIELDS,
  chartsCall,
  createWorkbookBody,
  growGridCall,
  layoutCall,
  missingTabsCall,
  precisaCrescer,
  pushDataCalls,
  readSheetIds,
  staticValuesCall,
  upgradeLayoutCall,
  type SpreadsheetInfo,
} from "./sync-requests";

// ─── Escopo ───────────────────────────────────────────────────────────────────

/**
 * O que o app pede ao Google. **Só `drive.file`** — e é de propósito.
 *
 * `drive.file` dá acesso apenas aos arquivos que ESTE app criou, que é
 * exatamente o que o app usa: todo `spreadsheetId` vem de `criarPlanilha`
 * (POST /spreadsheets) ou do meta gravado logo depois dela; não existe em lugar
 * nenhum do app um campo pra colar o link de uma planilha que já existe.
 * O escopo largo `.../auth/spreadsheets` (ler e escrever TODAS as planilhas da
 * conta) é SENSÍVEL: exige verificação do Google, e na tela de consentimento
 * aparece como "ver, editar e apagar todas as suas planilhas" — o que assusta,
 * com razão, quem acabou de pagar e está desconfiado.
 *
 * Se um dia alguém for "consertar" isto de volta: o ÚNICO motivo pra voltar ao
 * escopo largo seria deixar a pessoa plugar uma planilha que ela já tem. Nesse
 * dia, mude também esta explicação — e a tela de consentimento no Google.
 */
export const SCOPES = "https://www.googleapis.com/auth/drive.file";

// ─── Chaves no aparelho ───────────────────────────────────────────────────────

export const TOKEN_KEY = "virada_google_token";
export const SHEET_KEY = "virada_sheet_meta";
/** Sinal pra quem estiver na tela relê o meta (botão, provider). */
export const META_EVENT = "virada-sheet-meta-changed";

export interface SheetMeta {
  spreadsheetId: string;
  spreadsheetUrl: string;
  lastSync: string;
  /** Layout aplicado nessa planilha. Ausente = planilha anterior ao versionamento. */
  layoutVersion?: string;
  /**
   * Assinatura do que foi enviado da última vez (ver `assinaturaDados`). É o
   * "baseline anti-loop": sem ele, toda vez que o app abre e recarrega os dados
   * do IndexedDB o automático mandaria tudo de novo, à toa.
   */
  baseline?: string;
}

export interface Token {
  access_token: string;
  expires_at: number;
}

export function tokenValido(token: Token | null | undefined, agora: number): token is Token {
  return !!token?.access_token && token.expires_at > agora;
}

function lerJson<T>(chave: string): T | null {
  try {
    const raw = localStorage.getItem(chave);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null; // localStorage bloqueado ou conteúdo corrompido: age como se não houvesse
  }
}

/**
 * O endereço que a pessoa abre. Termina em `/edit` de propósito.
 *
 * Sem o `/edit` o Google responde um redirecionamento antes de mostrar a
 * planilha, e no celular esse salto extra é onde a coisa desanda: o app do
 * Google Planilhas intercepta o link, o navegador volta pro app instalado e a
 * pessoa termina numa tela em branco ou num "arquivo não encontrado". Com a URL
 * final o destino é o próprio documento, sem intermediário.
 */
export function urlDaPlanilha(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}

/**
 * Meta gravado antes de 17/09/2026 guardava a URL sem `/edit`. Normalizar na
 * LEITURA conserta de uma vez os quatro lugares que mostram o link (o botão da
 * Conta, o card do Início, o de Relatórios e o provider) sem precisar de
 * migração nem de novo envio ao Google.
 */
export function lerMeta(): SheetMeta | null {
  const meta = lerJson<SheetMeta>(SHEET_KEY);
  if (!meta?.spreadsheetId) return null;
  return { ...meta, spreadsheetUrl: urlDaPlanilha(meta.spreadsheetId) };
}

export function gravarMeta(meta: SheetMeta): void {
  try {
    localStorage.setItem(SHEET_KEY, JSON.stringify(meta));
  } catch {
    // sem espaço / modo privado: a planilha já foi atualizada, só o carimbo se perde
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(META_EVENT));
}

/** "Desconectar planilha": some o vínculo com o arquivo, não o arquivo. */
export function limparMeta(): void {
  try {
    localStorage.removeItem(SHEET_KEY);
  } catch {
    // nada a fazer
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(META_EVENT));
}

export function lerToken(): Token | null {
  return lerJson<Token>(TOKEN_KEY);
}

export function gravarToken(token: Token): void {
  try {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
  } catch {
    // idem: sem o carimbo, na próxima vez pede autorização de novo
  }
}

/**
 * Token morto tem que SAIR do aparelho. Enquanto ficava lá, cada tentativa
 * repetia o mesmo erro genérico por até 55 minutos, e a pessoa não tinha como
 * saber que bastava religar (achado T-07).
 */
export function limparToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // nada a fazer
  }
}

// ─── Assinatura dos dados (baseline anti-loop) ────────────────────────────────

/** FNV-1a: pequeno, determinístico e suficiente pra responder "mudou?". */
function hash32(texto: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * Resumo do que seria enviado. Guardar o JSON inteiro no localStorage não cabe
 * (são milhares de lançamentos), então guardamos um hash + os tamanhos: o hash
 * pega qualquer edição, os tamanhos deixam o valor legível quando alguém for
 * depurar. Falso "mudou" só custa um envio a mais; falso "não mudou" é o que
 * seria grave — e exigiria colisão de hash com o MESMO número de linhas.
 *
 * O formato é `e.i.d.g-hash-layout`, e cada pedaço está aí por um motivo:
 *  · os tamanhos, além de legíveis, dizem se o último envio levava alguma coisa
 *    (é o que `apagariaAPlanilha` consulta);
 *  · a VERSÃO DO LAYOUT entrou em 12/09/2026 porque quem atualizava o app e não
 *    lançava nada ficava com a planilha no visual velho: a assinatura só olhava
 *    os dados e respondia "nada mudou" pra sempre. Não vira loop porque
 *    `sincronizar` carimba o baseline com a MESMA constante logo depois de
 *    aplicar o layout novo — no envio seguinte a assinatura já bate.
 */
export function assinaturaDados(input: SyncInput): string {
  const corpo = JSON.stringify([input.expenses, input.incomes, input.debts, input.goals, input.settings ?? null]);
  const tamanhos = [input.expenses.length, input.incomes.length, input.debts.length, input.goals.length].join(".");
  return `${tamanhos}-${hash32(corpo)}-${LAYOUT_VERSION}`;
}

/** Nem lançamento, nem dívida, nem meta: mandar isto é ESVAZIAR a planilha. */
export function estaVazio(dados: SyncInput): boolean {
  return dados.expenses.length === 0 && dados.incomes.length === 0 && dados.debts.length === 0 && dados.goals.length === 0;
}

/**
 * Cinto e suspensórios do "Apagar tudo" (o bloqueio que o juiz provou no
 * navegador em 12/09/2026: o app limpava a planilha do cliente sozinho).
 *
 * Esvaziar a planilha é destrutivo e é a única coisa que o automático não pode
 * fazer por conta própria: a pessoa que apagou os dados DESTE aparelho foi
 * avisada, na mesma janela, de que a planilha continua intacta — ela é o backup.
 * Se alguém realmente quiser a planilha vazia, o caminho é o botão "Atualizar
 * agora", que é gesto explícito.
 *
 * Só liberamos o envio vazio quando o último envio também era vazio (aí não há
 * nada a perder) — e o prefixo de tamanhos da assinatura responde isso sem
 * guardar cópia dos dados.
 */
export function apagariaAPlanilha(dados: SyncInput, baseline?: string): boolean {
  const ultimoEnvioEraVazio = !!baseline && baseline.startsWith("0.0.0.0-");
  return estaVazio(dados) && !ultimoEnvioEraVazio;
}

// ─── Transporte ───────────────────────────────────────────────────────────────

export type GoogleFetch = (method: string, endpoint: string, token: string, body?: unknown) => Promise<unknown>;

/**
 * O Google recusou por causa da autorização (token vencido/revogado ou escopo
 * insuficiente). Separado do resto porque o tratamento é outro: insistir não
 * adianta — tem que apagar o token e pedir pra religar.
 */
export class ErroDeAutorizacao extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErroDeAutorizacao";
  }
}

export function ehErroDeAutorizacao(err: unknown): boolean {
  return err instanceof ErroDeAutorizacao || (err instanceof Error && err.name === "ErroDeAutorizacao");
}

/**
 * O id que está gravado no aparelho não aponta mais pra nenhuma planilha: a
 * pessoa mandou o arquivo pra lixeira, esvaziou a lixeira, ou o id ficou órfão
 * de alguma outra forma.
 *
 * Isso tem que ser um erro À PARTE porque o tratamento é o oposto de insistir:
 * enquanto o id morto ficava no aparelho, TODA tentativa devolvia 404 — o
 * automático desistia calado e o botão só sabia dizer "tente de novo em alguns
 * segundos", pra sempre. A pessoa ficava com um cartão "Atualizada há 3 dias" e
 * um botão "Abrir planilha" que leva a "arquivo não encontrado", sem nenhum
 * caminho de volta a não ser Desconectar (que ninguém adivinha).
 */
export class ErroPlanilhaSumiu extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErroPlanilhaSumiu";
  }
}

export function ehPlanilhaSumiu(err: unknown): boolean {
  return err instanceof ErroPlanilhaSumiu || (err instanceof Error && err.name === "ErroPlanilhaSumiu");
}

export const googleFetch: GoogleFetch = async (method, endpoint, token, body) => {
  const url = endpoint.startsWith("http") ? endpoint : `https://sheets.googleapis.com/v4${endpoint}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string; status?: string } };
    const detalhe = `HTTP ${res.status} ${err.error?.status ?? ""} — ${err.error?.message ?? "sem detalhe"}`.trim();
    // 401 é sempre token. 403 só conta como autorização quando o Google diz
    // PERMISSION_DENIED — 403 também é a resposta de "passou da cota", e apagar
    // o token nesse caso faria a pessoa reautorizar à toa.
    if (res.status === 401 || (res.status === 403 && err.error?.status === "PERMISSION_DENIED")) {
      throw new ErroDeAutorizacao(detalhe);
    }
    // 404 = o arquivo não existe mais. Ver ErroPlanilhaSumiu: quem chama recria.
    if (res.status === 404 || err.error?.status === "NOT_FOUND") {
      throw new ErroPlanilhaSumiu(detalhe);
    }
    throw new Error(detalhe);
  }
  return res.json();
};

async function etapa<T>(nome: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    // não embrulha: quem trata precisa reconhecer pelo tipo
    if (ehErroDeAutorizacao(err) || ehPlanilhaSumiu(err)) throw err;
    throw new Error(`[${nome}] ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ─── As três operações na planilha ────────────────────────────────────────────

/**
 * Cria a planilha no Drive da pessoa e a deixa pronta (visual, cabeçalhos,
 * gráficos).
 *
 * `aoNascer` é o conserto do bug nº 1 desta tela (17/09/2026). O POST
 * /spreadsheets já cria o ARQUIVO; as três chamadas seguintes só o enfeitam. Se
 * qualquer uma delas falhava — rede do celular oscilando, cota do Google, aba
 * fechada no meio —, o erro subia, o meta NUNCA era gravado, e o cartão da tela
 * Conta voltava pro estado "Conectar sua planilha": sem link, sem id, como se
 * nada tivesse acontecido. O próximo toque criava OUTRA planilha. Foi assim que
 * o Drive do dono acumulou mais de dez "Virada Financeira — <email>" enquanto
 * ele dizia "não consigo abrir no Planilhas" — ele nunca chegou a receber um
 * link, e nenhuma das dez estava terminada.
 *
 * Avisando aqui, o aparelho já guarda o id no instante em que o arquivo existe:
 * o cartão passa a mostrar "Abrir planilha" na hora, e a tentativa seguinte cai
 * no caminho de ATUALIZAR essa mesma planilha (o `layoutVersion` fica ausente,
 * então o `atualizarLayout` termina o serviço) em vez de criar mais uma.
 */
async function criarPlanilha(
  fetcher: GoogleFetch,
  token: string,
  email: string,
  aoNascer?: (spreadsheetId: string, spreadsheetUrl: string) => void,
) {
  const created = (await fetcher("POST", "/spreadsheets", token, createWorkbookBody(email))) as SpreadsheetInfo & {
    spreadsheetId: string;
  };
  const spreadsheetUrl = urlDaPlanilha(created.spreadsheetId);
  // A partir desta linha o arquivo EXISTE no Drive. Avisar antes de qualquer
  // outra chamada é o que impede a planilha duplicada (ver acima).
  try {
    aoNascer?.(created.spreadsheetId, spreadsheetUrl);
  } catch (err) {
    // Gravar o carimbo é melhor-esforço: se o localStorage recusar, seguimos —
    // o meta final ainda é devolvido por `sincronizar`.
    console.warn("[sync] não consegui guardar o endereço da planilha recém-criada:", err);
  }
  const ids = readSheetIds(created);

  // Layout: banner, kpi, formatos, proteção, ajuda
  await etapa("layout", () => fetcher("POST", `/spreadsheets/${created.spreadsheetId}:batchUpdate`, token, layoutCall(ids)));
  // Conteúdo estático: cabeçalhos, banner, ajuda
  await etapa("conteúdo", () => fetcher("POST", `/spreadsheets/${created.spreadsheetId}/values:batchUpdate`, token, staticValuesCall()));
  // Gráficos
  await etapa("gráficos", () => fetcher("POST", `/spreadsheets/${created.spreadsheetId}:batchUpdate`, token, chartsCall(ids)));

  return { spreadsheetId: created.spreadsheetId, spreadsheetUrl };
}

/**
 * Reaplica o visual numa planilha que já existe — é o que faz a planilha do
 * cliente "se ajeitar sozinha" quando o layout do app muda, sem precisar
 * desconectar e conectar de novo. Idempotente: recria as abas que faltarem e
 * apaga os gráficos antigos antes de inserir os novos (senão duplicariam).
 */
async function atualizarLayout(
  fetcher: GoogleFetch,
  token: string,
  spreadsheetId: string,
  versaoAnterior?: string,
): Promise<void> {
  const info = (await fetcher("GET", `/spreadsheets/${spreadsheetId}?fields=${SPREADSHEET_FIELDS}`, token)) as SpreadsheetInfo;

  let ids = readSheetIds(info);

  // planilha de uma versão antiga pode não ter todas as abas de hoje
  const faltando = missingTabsCall(ids);
  if (faltando) {
    await fetcher("POST", `/spreadsheets/${spreadsheetId}:batchUpdate`, token, faltando);
    ids = readSheetIds(
      (await fetcher("GET", `/spreadsheets/${spreadsheetId}?fields=sheets.properties(sheetId,title)`, token)) as SpreadsheetInfo,
    );
  }

  await fetcher("POST", `/spreadsheets/${spreadsheetId}:batchUpdate`, token, upgradeLayoutCall(info, ids, versaoAnterior));
  await fetcher("POST", `/spreadsheets/${spreadsheetId}/values:batchUpdate`, token, staticValuesCall());
  await fetcher("POST", `/spreadsheets/${spreadsheetId}:batchUpdate`, token, chartsCall(ids));
}

async function mandarDados(fetcher: GoogleFetch, token: string, spreadsheetId: string, input: SyncInput): Promise<void> {
  const { clear, update, linhas } = pushDataCalls(input);
  // Acima de ~1.009 lançamentos a grade da aba acaba e o batchUpdate é recusado
  // INTEIRO. Só nesse caso busca o tamanho real (com os ids de proteção e zebra,
  // que crescem junto) e cresce o que falta, já formatado.
  if (precisaCrescer(linhas)) {
    const info = (await fetcher("GET", `/spreadsheets/${spreadsheetId}?fields=${SPREADSHEET_FIELDS}`, token)) as SpreadsheetInfo;
    const grow = growGridCall(info, linhas);
    if (grow) await etapa("grade", () => fetcher("POST", `/spreadsheets/${spreadsheetId}:batchUpdate`, token, grow));
  }
  if (clear) await fetcher("POST", `/spreadsheets/${spreadsheetId}/values:batchClear`, token, clear);
  if (update) await fetcher("POST", `/spreadsheets/${spreadsheetId}/values:batchUpdate`, token, update);
}

// ─── A sincronização inteira ──────────────────────────────────────────────────

export interface SincronizarArgs {
  token: string;
  /** null = ainda não existe planilha; será criada. */
  meta: SheetMeta | null;
  dados: SyncInput;
  /** Vai no título da planilha nova. Só usado quando `meta` é null. */
  email: string;
  /** Injetável pra testar offline. */
  fetcher?: GoogleFetch;
  agora?: () => number;
  /** Avisa a tela que o visual está sendo reaplicado (é a etapa demorada). */
  aoAtualizarLayout?: (ativo: boolean) => void;
  /**
   * Chamado no INSTANTE em que a planilha nasce no Drive, antes de ela estar
   * enfeitada — e chamado de novo quando uma planilha órfã é substituída. Quem
   * recebe tem uma obrigação: gravar esse meta no aparelho AGORA. É isso que
   * garante que a pessoa tenha o link mesmo se o resto do envio falhar, e que a
   * próxima tentativa continue a mesma planilha em vez de criar outra.
   * O padrão já grava; quem quiser também atualizar a tela passa o seu.
   */
  aoCriar?: (meta: SheetMeta) => void;
  /**
   * Pode substituir uma planilha que sumiu do Drive (404) por uma nova?
   *
   * Só o BOTÃO passa `true`. O automático fica de fora de propósito: o 404 pode
   * ser passageiro (arquivo na lixeira, id ainda propagando no Google) e criar
   * arquivo no Drive de alguém que não tocou em nada é justamente o que a
   * decisão #4(a) proíbe — além de ser como nascem planilhas duplicadas. Sem
   * permissão, o erro sobe: o automático desiste calado, a tela Conta passa a
   * dizer "Atualização automática parada" e quem decide é a pessoa, no botão.
   */
  permitirRecriar?: boolean;
}

/**
 * Fila de UMA planilha de cada vez — compartilhada pelo botão e pelo automático.
 *
 * A trava interna do AutoSync (`rodando`) só enxergava o automático. Quem tocasse
 * em "Atualizar agora" no meio de um envio automático disparava duas sequências
 * `batchClear` + `batchUpdate` na MESMA planilha: a limpeza de uma podia cair
 * depois da gravação da outra e deixar faixas vazias na planilha do cliente.
 * Como todo caminho passa por `sincronizar`, a fila mora aqui — não dá pra
 * esquecer de usá-la.
 *
 * Serializa em vez de descartar: o segundo pedido costuma ser o do botão, com
 * dados mais novos, e quem apertou merece ver o envio acontecer.
 *
 * Teto conhecido: um pedido que nunca responde segura a fila. É de propósito —
 * liberar a fila por tempo traria de volta exatamente o risco de a limpeza de um
 * envio zumbi cair em cima da gravação do outro. Na prática o navegador derruba
 * a requisição, o erro sobe e a fila anda.
 */
let filaDeEnvio: Promise<unknown> = Promise.resolve();

/**
 * Cria (se preciso), ajeita o visual (se a planilha for de um layout antigo) e
 * manda os dados. Devolve o meta NOVO — quem chama decide se grava.
 *
 * Espera a vez se já houver um envio em andamento (ver `filaDeEnvio`).
 */
export function sincronizar(args: SincronizarArgs): Promise<SheetMeta> {
  // O erro de quem estava na frente não pode travar a fila: os dois ramos do
  // `then` chamam o mesmo trabalho.
  const meuEnvio = filaDeEnvio.then(() => enviarPlanilha(args), () => enviarPlanilha(args));
  filaDeEnvio = meuEnvio.then(
    () => undefined,
    () => undefined,
  );
  return meuEnvio;
}

async function enviarPlanilha(args: SincronizarArgs): Promise<SheetMeta> {
  const {
    token,
    meta,
    dados,
    email,
    fetcher = googleFetch,
    agora = Date.now,
    aoAtualizarLayout,
    aoCriar = gravarMeta,
    permitirRecriar = false,
  } = args;

  // Carimbo do "acabou de nascer": sem layoutVersion nem baseline de propósito.
  // Assim, se o envio parar no meio, a próxima tentativa vê uma planilha "de
  // layout desconhecido" e vai pelo caminho do `atualizarLayout`, que termina o
  // serviço na MESMA planilha.
  const carimbarNova = (spreadsheetId: string, spreadsheetUrl: string) =>
    aoCriar({ spreadsheetId, spreadsheetUrl, lastSync: new Date(agora()).toISOString() });

  const nascerEEnviar = async (): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
    const criada = await criarPlanilha(fetcher, token, email, carimbarNova);
    await mandarDados(fetcher, token, criada.spreadsheetId, dados);
    return criada;
  };

  const usarExistente = async (spreadsheetId: string): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
    if (meta?.layoutVersion !== LAYOUT_VERSION) {
      // planilha antiga (ou criada pela metade): traz o visual novo antes dos dados
      aoAtualizarLayout?.(true);
      try {
        await atualizarLayout(fetcher, token, spreadsheetId, meta?.layoutVersion);
      } finally {
        aoAtualizarLayout?.(false);
      }
    }
    await mandarDados(fetcher, token, spreadsheetId, dados);
    return { spreadsheetId, spreadsheetUrl: urlDaPlanilha(spreadsheetId) };
  };

  let alvo: { spreadsheetId: string; spreadsheetUrl: string };
  if (!meta?.spreadsheetId) {
    alvo = await nascerEEnviar();
  } else {
    try {
      alvo = await usarExistente(meta.spreadsheetId);
    } catch (err) {
      // Só o 404 tem saída automática. Erro de autorização e erro de rede sobem:
      // criar uma planilha nova porque a internet caiu seria o mesmo estrago que
      // este conserto veio evitar.
      if (!ehPlanilhaSumiu(err) || !permitirRecriar) throw err;
      console.warn("[sync] a planilha gravada neste aparelho não existe mais no Drive; criando outra:", err);
      alvo = await nascerEEnviar();
    }
  }

  return {
    spreadsheetId: alvo.spreadsheetId,
    spreadsheetUrl: alvo.spreadsheetUrl,
    lastSync: new Date(agora()).toISOString(),
    layoutVersion: LAYOUT_VERSION,
    baseline: assinaturaDados(dados),
  };
}

// ─── AutoSync: a regra de quando mandar sozinho ───────────────────────────────

export type AutoSyncEstado = "desligado" | "sincronizando" | "em dia";

export interface AutoSyncAviso {
  estado: AutoSyncEstado;
  /** ISO do último envio que deu certo (do meta), pra tela mostrar a hora. */
  ultimoEnvio: string | null;
}

export interface AutoSyncDeps {
  agora(): number;
  agendar(fn: () => void, ms: number): unknown;
  cancelar(handle: unknown): void;
  /** A aba está na frente? Em aba de fundo não vale gastar bateria e rede. */
  visivel(): boolean;
  lerMeta(): SheetMeta | null;
  gravarMeta(meta: SheetMeta): void;
  lerToken(): Token | null;
  limparToken(): void;
  enviar(token: string, meta: SheetMeta, dados: SyncInput): Promise<SheetMeta>;
  avisar(aviso: AutoSyncAviso): void;
}

/** Silêncio que o app espera antes de mandar: digitar um lançamento não dispara nada. */
export const DEBOUNCE_MS = 4000;
/** Espera crescente entre as tentativas (a 1ª é imediata). */
export const ESPERAS_MS = [8000, 20000];
export const MAX_TENTATIVAS = 3;

export class AutoSync {
  private readonly deps: AutoSyncDeps;
  private timer: unknown = null;
  private pendente: SyncInput | null = null;
  private rodando = false;
  private tentativa = 0;
  private esperandoVisibilidade = false;
  private parado = false;
  private ultimoEnvio: string | null;

  constructor(deps: AutoSyncDeps) {
    this.deps = deps;
    this.ultimoEnvio = deps.lerMeta()?.lastSync ?? null;
  }

  /** O app mudou alguma coisa. Reinicia a contagem do silêncio. */
  mudou(dados: SyncInput): void {
    if (this.parado) return;
    this.pendente = dados;
    this.tentativa = 0; // dado novo merece uma chance nova
    this.reagendar(DEBOUNCE_MS);
  }

  /** A aba voltou pra frente: o que ficou esperando pode ir agora. */
  aoFicarVisivel(): void {
    if (this.parado || !this.esperandoVisibilidade) return;
    this.esperandoVisibilidade = false;
    void this.disparar();
  }

  /**
   * "Apagar todos os dados deste celular": o motor esquece o que estava na fila.
   *
   * Sem isto, um envio já agendado (a espera dos 4 s) dispararia DEPOIS do
   * reset, carregando o estado vazio — exatamente o que o "apagar tudo" promete
   * que não acontece. Diferente de `parar()`: o motor continua vivo, e o próximo
   * lançamento sincroniza normalmente.
   */
  esquecer(): void {
    this.cancelarTimer();
    this.pendente = null;
    this.esperandoVisibilidade = false;
    this.tentativa = 0;
  }

  /** Desmontou a tela / saiu do app: nada mais dispara. */
  parar(): void {
    this.parado = true;
    this.cancelarTimer();
  }

  private cancelarTimer() {
    if (this.timer !== null) {
      this.deps.cancelar(this.timer);
      this.timer = null;
    }
  }

  private reagendar(ms: number) {
    this.cancelarTimer();
    this.timer = this.deps.agendar(() => {
      this.timer = null;
      void this.disparar();
    }, ms);
  }

  private anunciar(estado: AutoSyncEstado) {
    this.deps.avisar({ estado, ultimoEnvio: this.ultimoEnvio });
  }

  private async disparar(): Promise<void> {
    if (this.parado) return;
    const dados = this.pendente;
    if (!dados) return;
    // (e) uma de cada vez: quem está rodando reagenda ao terminar
    if (this.rodando) return;

    // (a) sem planilha criada, não há o que sincronizar — e criar planilha
    // sozinho, sem a pessoa pedir, seria invasivo.
    const meta = this.deps.lerMeta();
    if (!meta?.spreadsheetId) {
      this.anunciar("desligado");
      return;
    }

    // (b) sem token válido o automático simplesmente não roda: NUNCA abrir popup
    // sem a pessoa ter tocado em nada.
    const token = this.deps.lerToken();
    if (!tokenValido(token, this.deps.agora())) {
      if (token) this.deps.limparToken(); // token morto não fica apodrecendo no aparelho
      this.anunciar("desligado");
      return;
    }

    // (d) aba de fundo: guarda a vez pro momento em que a pessoa voltar
    if (!this.deps.visivel()) {
      this.esperandoVisibilidade = true;
      return;
    }

    // (c) mudou de verdade? Sem isso o app reenviaria tudo a cada abertura, já
    // que o provider recarrega o IndexedDB na montagem.
    const assinatura = assinaturaDados(dados);
    if (assinatura === meta.baseline) {
      this.pendente = null;
      this.anunciar("em dia");
      return;
    }

    // (g) rede de segurança do "Apagar tudo": o automático nunca esvazia a
    // planilha do cliente (ver `apagariaAPlanilha`). Avisa "em dia" de propósito:
    // "desligado" mandaria a pessoa tocar em "Atualizar agora", que é justamente
    // o gesto que apagaria a planilha.
    if (apagariaAPlanilha(dados, meta.baseline)) {
      this.pendente = null;
      console.warn("[AutoSync] recusei enviar um estado vazio: isso limparia a planilha do cliente sem ninguém pedir.");
      this.anunciar("em dia");
      return;
    }

    this.rodando = true;
    this.anunciar("sincronizando");
    try {
      const novo = await this.deps.enviar(token.access_token, meta, dados);
      this.rodando = false;
      this.deps.gravarMeta(novo);
      this.ultimoEnvio = novo.lastSync;
      this.tentativa = 0;
      const chegouCoisaNova = this.pendente !== dados;
      if (!chegouCoisaNova) this.pendente = null;
      this.anunciar("em dia");
      if (chegouCoisaNova && !this.parado) this.reagendar(DEBOUNCE_MS);
    } catch (err) {
      this.rodando = false;
      // (f) erro NUNCA sobe pra tela aqui — quem fala com a pessoa é o botão.
      console.warn("[AutoSync] não consegui atualizar a planilha agora:", err);
      if (ehErroDeAutorizacao(err)) {
        // Insistir não resolve: o Google desligou a conexão. Some com o token pro
        // botão poder religar, e para por aqui.
        this.deps.limparToken();
        this.anunciar("desligado");
        return;
      }
      this.tentativa += 1;
      if (this.tentativa >= MAX_TENTATIVAS || this.parado) {
        this.anunciar("desligado");
        return;
      }
      this.reagendar(ESPERAS_MS[this.tentativa - 1] ?? ESPERAS_MS[ESPERAS_MS.length - 1]);
    }
  }
}
