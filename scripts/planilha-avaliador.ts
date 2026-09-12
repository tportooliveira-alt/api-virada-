/**
 * planilha-avaliador.ts — mini-avaliador de fórmulas do Google Sheets em pt-BR.
 *
 * Não há credencial Google neste repositório, então ninguém vê a planilha
 * renderizar de verdade. Este módulo monta uma "pasta" em memória com os
 * valueRanges que o gerador (lib/sheets/builder.ts) produz e AVALIA as fórmulas
 * que ele grava — com a mesma sintaxe que a planilha exige: nomes em
 * português (SOMASES, CONT.SES, MÁXIMO…), ";" entre argumentos e "\" no
 * literal de matriz. Uma função em inglês ou uma vírgula aqui é #NOME?/#ERRO!
 * — igual ao que o cliente veria.
 *
 * Cobre só o que o gerador usa (ver FUNCOES_PERMITIDAS). Erros saem como o
 * texto do erro ("#DIV/0!", "#NOME?", "#VALOR!"), nunca como exceção.
 *
 * Uso (scripts/test-planilha-formulas.ts, dump-formulas.ts):
 *   const pasta = montarPasta(buildStaticValues(), buildSyncBatch(input).valueRanges);
 *   pasta.ler("Dashboard!A6");           // número
 *   pasta.definir("Filtros!B4", mesChave("2026-09")); // simula o menu escolhido
 */

export type Celula = number | string | boolean | null;
export type ValueRange = { range: string; values: unknown[][] };

/** Tudo que o gerador pode usar dentro de "=…". Nome fora daqui = #NOME?. */
export const FUNCOES_PERMITIDAS = [
  "SE", "E", "OU", "N", "ABS", "ARRED",
  "SOMA", "SOMASE", "SOMASES", "CONT.SE", "CONT.SES", "CONT.VALORES",
  "MÁXIMO", "MÍNIMO", "SPARKLINE",
] as const;

class ErroFormula extends Error {
  constructor(public codigo: string) {
    super(codigo);
  }
}

type Faixa = { aba: string; l1: number; c1: number; l2: number; c2: number };
type No =
  | { k: "num"; v: number }
  | { k: "str"; v: string }
  | { k: "bool"; v: boolean }
  | { k: "arr" }
  | { k: "ref"; aba: string | null; a1: string }
  | { k: "func"; nome: string; args: No[] }
  | { k: "bin"; op: string; a: No; b: No }
  | { k: "neg"; a: No };

type Token =
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "ref"; aba: string | null; v: string }
  | { t: "func"; v: string }
  | { t: "op"; v: string }
  | { t: "arr" }
  | { t: "fim" };

const REF_RE = /^\$?[A-Z]{1,3}\$?\d+(?::\$?[A-Z]{1,3}\$?\d*)?$/;

export function colParaIndice(col: string) {
  return col.split("").reduce((acc, ch) => acc * 26 + (ch.charCodeAt(0) - 64), 0);
}

export function indiceParaCol(n: number) {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function parseA1(a1: string): { col: number; row: number } {
  const m = /^\$?([A-Z]{1,3})\$?(\d+)$/.exec(a1);
  if (!m) throw new ErroFormula("#REF!");
  return { col: colParaIndice(m[1]), row: Number(m[2]) };
}

// "Dashboard!A12:B21" | "'Fluxo de Caixa'!A2" → aba + célula inicial
function parseRange(range: string) {
  const bang = range.lastIndexOf("!");
  const aba = range.slice(0, bang).replace(/^'|'$/g, "");
  const [inicio] = range.slice(bang + 1).split(":");
  return { aba, ...parseA1(inicio) };
}

// O que a planilha guarda quando recebe o valor via USER_ENTERED. Apóstrofo
// inicial = "isto é texto": ele some da célula e o resto NUNCA é fórmula, mesmo
// começando com "=" ("'=Conta" é o texto "=Conta", não #NOME?).
function normalizar(v: unknown): { valor: Celula; texto: boolean } {
  if (v == null) return { valor: null, texto: false };
  if (typeof v === "number" || typeof v === "boolean") return { valor: v, texto: false };
  const s = String(v);
  if (s === "") return { valor: null, texto: false };
  if (s.startsWith("'")) return { valor: s.slice(1), texto: true };
  return { valor: s, texto: false };
}

export class Pasta {
  private abas = new Map<string, Map<string, Celula>>();
  /** Células que entraram com apóstrofo: texto literal, nunca passam pelo parser. */
  private literais = new Set<string>();
  private ultimaLinha = new Map<string, number>();
  private memo = new Map<string, Celula>();
  private pilha = new Set<string>();

  escrever(range: string, values: unknown[][]) {
    const { aba, col, row } = parseRange(range);
    values.forEach((linha, i) => linha.forEach((v, j) => { const n = normalizar(v); this.gravar(aba, col + j, row + i, n.valor, n.texto); }));
  }

  /** Simula o usuário digitando: `definir("Filtros!B4", "2026-09 (set)")` (apóstrofo = texto, como na planilha). */
  definir(ref: string, valor: Celula) {
    const { aba, col, row } = parseRange(ref);
    const n = normalizar(valor);
    this.gravar(aba, col, row, n.valor, n.texto);
  }

  private gravar(aba: string, col: number, row: number, valor: Celula, texto = false) {
    if (!this.abas.has(aba)) this.abas.set(aba, new Map());
    const a1 = `${indiceParaCol(col)}${row}`;
    this.abas.get(aba)!.set(a1, valor);
    if (texto) this.literais.add(`${aba}!${a1}`);
    else this.literais.delete(`${aba}!${a1}`);
    this.ultimaLinha.set(aba, Math.max(this.ultimaLinha.get(aba) ?? 0, row));
    this.memo.clear();
  }

  private ehFormula(aba: string, a1: string, v: Celula): v is string {
    return typeof v === "string" && v.startsWith("=") && !this.literais.has(`${aba}!${a1}`);
  }

  bruto(aba: string, a1: string): Celula {
    return this.abas.get(aba)?.get(a1) ?? null;
  }

  /** Valor da célula como a planilha mostraria (fórmula avaliada). Erro vira texto "#…". */
  ler(ref: string): Celula {
    const { aba, col, row } = parseRange(ref);
    try {
      return this.valor(aba, `${indiceParaCol(col)}${row}`);
    } catch (e) {
      if (e instanceof ErroFormula) return e.codigo;
      throw e;
    }
  }

  /** Toda fórmula de todas as abas, avaliada — pra provar que nada dá "#…". */
  todasAsFormulas(): Array<{ ref: string; formula: string; valor: Celula }> {
    const out: Array<{ ref: string; formula: string; valor: Celula }> = [];
    for (const [aba, cells] of this.abas) {
      for (const [a1, v] of cells) {
        if (this.ehFormula(aba, a1, v)) out.push({ ref: `${aba}!${a1}`, formula: v, valor: this.ler(`${aba}!${a1}`) });
      }
    }
    return out;
  }

  private valor(aba: string, a1: string): Celula {
    const chave = `${aba}!${a1}`;
    if (this.memo.has(chave)) return this.memo.get(chave)!;
    const bruto = this.bruto(aba, a1);
    if (!this.ehFormula(aba, a1, bruto)) return bruto;
    if (this.pilha.has(chave)) throw new ErroFormula("#REF!");
    this.pilha.add(chave);
    try {
      const v = this.avaliar(parse(bruto.slice(1)), aba);
      if (v !== null && typeof v === "object") throw new ErroFormula("#VALOR!");
      this.memo.set(chave, v as Celula);
      return v as Celula;
    } finally {
      this.pilha.delete(chave);
    }
  }

  private faixa(no: Extract<No, { k: "ref" }>, abaAtual: string): Faixa | { aba: string; a1: string } {
    const aba = no.aba ?? abaAtual;
    if (!no.a1.includes(":")) return { aba, a1: no.a1.replace(/\$/g, "") };
    const [ini, fim] = no.a1.split(":");
    const a = parseA1(ini);
    const fimLimpo = fim.replace(/\$/g, "");
    const mCol = /^([A-Z]{1,3})(\d*)$/.exec(fimLimpo);
    if (!mCol) throw new ErroFormula("#REF!");
    // "$E$2:$E" (aberto) vai até a última linha escrita na aba
    const l2 = mCol[2] ? Number(mCol[2]) : Math.max(this.ultimaLinha.get(aba) ?? 0, a.row);
    return { aba, l1: a.row, c1: a.col, l2, c2: colParaIndice(mCol[1]) };
  }

  private celulasDaFaixa(f: Faixa): Celula[] {
    const out: Celula[] = [];
    const fim = Math.min(f.l2, this.ultimaLinha.get(f.aba) ?? 0);
    for (let c = f.c1; c <= f.c2; c++) for (let l = f.l1; l <= fim; l++) out.push(this.valor(f.aba, `${indiceParaCol(c)}${l}`));
    return out;
  }

  private avaliar(no: No, aba: string): Celula | Faixa {
    switch (no.k) {
      case "num": return no.v;
      case "str": return no.v;
      case "bool": return no.v;
      case "arr": return "{matriz}";
      case "ref": {
        const f = this.faixa(no, aba);
        return "a1" in f ? this.valor(f.aba, f.a1) : f;
      }
      case "neg": return -numero(this.escalar(no.a, aba));
      case "bin": return binario(no.op, this.escalar(no.a, aba), this.escalar(no.b, aba));
      case "func": return this.funcao(no, aba);
    }
  }

  private escalar(no: No, aba: string): Celula {
    const v = this.avaliar(no, aba);
    if (v !== null && typeof v === "object") throw new ErroFormula("#VALOR!");
    return v;
  }

  private numeros(no: No, aba: string): number[] {
    const v = this.avaliar(no, aba);
    if (v !== null && typeof v === "object") return this.celulasDaFaixa(v).filter((c): c is number => typeof c === "number");
    return typeof v === "number" ? [v] : typeof v === "boolean" ? [v ? 1 : 0] : v === null ? [] : [numero(v)];
  }

  private lista(no: No, aba: string): Celula[] {
    const v = this.avaliar(no, aba);
    if (v !== null && typeof v === "object") return this.celulasDaFaixa(v);
    return [v];
  }

  private funcao(no: Extract<No, { k: "func" }>, aba: string): Celula {
    const { nome, args } = no;
    const esc = (i: number) => this.escalar(args[i], aba);
    switch (nome) {
      case "SE": {
        const cond = esc(0);
        if (typeof cond === "string") throw new ErroFormula("#VALOR!");
        const ok = typeof cond === "number" ? cond !== 0 : Boolean(cond);
        if (ok) return esc(1);
        return args.length > 2 ? esc(2) : false;
      }
      case "E": return args.every((_, i) => verdade(esc(i)));
      case "OU": return args.some((_, i) => verdade(esc(i)));
      case "N": {
        const v = esc(0);
        return typeof v === "number" ? v : typeof v === "boolean" ? Number(v) : 0;
      }
      case "ABS": return Math.abs(numero(esc(0)));
      case "ARRED": {
        const x = numero(esc(0));
        const f = Math.pow(10, args.length > 1 ? numero(esc(1)) : 0);
        return (Math.sign(x) * Math.round(Math.abs(x) * f)) / f || 0;
      }
      case "SOMA": return args.flatMap((a) => this.numeros(a, aba)).reduce((s, v) => s + v, 0);
      case "MÁXIMO": { const n = args.flatMap((a) => this.numeros(a, aba)); return n.length ? Math.max(...n) : 0; }
      case "MÍNIMO": { const n = args.flatMap((a) => this.numeros(a, aba)); return n.length ? Math.min(...n) : 0; }
      case "CONT.VALORES": return args.flatMap((a) => this.lista(a, aba)).filter((c) => c !== null).length;
      case "SOMASE": {
        const crit = this.lista(args[0], aba);
        const soma = args.length > 2 ? this.lista(args[2], aba) : crit;
        const c = esc(1);
        return crit.reduce((s: number, v, i) => (casa(c, v) && typeof soma[i] === "number" ? s + (soma[i] as number) : s), 0);
      }
      case "SOMASES": {
        const soma = this.lista(args[0], aba);
        const pares = this.pares(args.slice(1), aba);
        return soma.reduce((s: number, v, i) => (typeof v === "number" && pares.every(([faixa, c]) => casa(c, faixa[i] ?? null)) ? s + v : s), 0);
      }
      case "CONT.SE": {
        const crit = this.lista(args[0], aba);
        const c = esc(1);
        return crit.filter((v) => casa(c, v)).length;
      }
      case "CONT.SES": {
        const pares = this.pares(args, aba);
        const n = pares[0][0].length;
        let total = 0;
        for (let i = 0; i < n; i++) if (pares.every(([faixa, c]) => casa(c, faixa[i] ?? null))) total++;
        return total;
      }
      case "SPARKLINE": {
        this.lista(args[0], aba); // valida a referência; o desenho não existe aqui
        return "▬";
      }
      default:
        throw new ErroFormula("#NOME?");
    }
  }

  private pares(args: No[], aba: string): Array<[Celula[], Celula]> {
    if (args.length % 2 !== 0) throw new ErroFormula("#N/D");
    const out: Array<[Celula[], Celula]> = [];
    for (let i = 0; i < args.length; i += 2) out.push([this.lista(args[i], aba), this.escalar(args[i + 1], aba)]);
    return out;
  }
}

function verdade(v: Celula) {
  return typeof v === "number" ? v !== 0 : Boolean(v);
}

// Texto numérico vira número (a planilha faz isso); texto comum é #VALOR!.
function numero(v: Celula): number {
  if (v === null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  const n = Number(v.replace(",", "."));
  if (v.trim() === "" || !Number.isFinite(n)) throw new ErroFormula("#VALOR!");
  return n;
}

function textoDe(v: Celula): string {
  if (v === null) return "";
  if (typeof v === "boolean") return v ? "VERDADEIRO" : "FALSO";
  return String(v);
}

function binario(op: string, a: Celula, b: Celula): Celula {
  switch (op) {
    case "+": return numero(a) + numero(b);
    case "-": return numero(a) - numero(b);
    case "*": return numero(a) * numero(b);
    case "/": {
      const d = numero(b);
      if (d === 0) throw new ErroFormula("#DIV/0!");
      return numero(a) / d;
    }
    case "&": return textoDe(a) + textoDe(b);
    default: return comparar(op, a, b);
  }
}

function comparar(op: string, a: Celula, b: Celula): boolean {
  // vazio se compara como "" com texto e como 0 com número
  if (a === null) a = typeof b === "string" ? "" : typeof b === "boolean" ? false : 0;
  if (b === null) b = typeof a === "string" ? "" : typeof a === "boolean" ? false : 0;
  let cmp: number;
  if (typeof a === "number" && typeof b === "number") cmp = a - b;
  else if (typeof a === "string" && typeof b === "string") cmp = a.toLowerCase().localeCompare(b.toLowerCase());
  else if (typeof a === "boolean" && typeof b === "boolean") cmp = Number(a) - Number(b);
  else cmp = typeof a === "number" ? -1 : 1; // número < texto < lógico, e nunca iguais
  switch (op) {
    case "=": return cmp === 0;
    case "<>": return cmp !== 0;
    case "<": return cmp < 0;
    case ">": return cmp > 0;
    case "<=": return cmp <= 0;
    case ">=": return cmp >= 0;
  }
  throw new ErroFormula("#NOME?");
}

// Critério de SOMASE/CONT.SE: "Não", "*", ">0", "<>x", número… "*" NÃO casa célula vazia.
function casa(criterio: Celula, valor: Celula): boolean {
  if (typeof criterio === "number") return typeof valor === "number" ? valor === criterio : false;
  if (criterio === null) return valor === null;
  if (typeof criterio === "boolean") return valor === criterio;
  const m = /^(<>|>=|<=|=|>|<)?([\s\S]*)$/.exec(criterio)!;
  const op = m[1] ?? "=";
  const resto = m[2];
  const n = resto === "" ? NaN : Number(resto.replace(",", "."));
  if (Number.isFinite(n) && (op !== "=" || typeof valor === "number")) {
    if (typeof valor !== "number") return op === "<>";
    return comparar(op, valor, n);
  }
  if (op === "=" || op === "<>") {
    const bate = valor !== null && typeof valor !== "number" && typeof valor !== "boolean" && curinga(resto).test(valor);
    const vazio = resto === "" && valor === null;
    return op === "=" ? bate || vazio : !(bate || vazio);
  }
  if (typeof valor !== "string") return false;
  return comparar(op, valor, resto);
}

function curinga(padrao: string) {
  const esc = padrao.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/~\*/g, "\u0000").replace(/\*/g, ".*").replace(/\?/g, ".").replace(/\u0000/g, "\\*");
  return new RegExp(`^${esc}$`, "i");
}

// ─── Parser ──────────────────────────────────────────────────────────────────

function tokenizar(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  let abaPendente: string | null = null;
  while (i < src.length) {
    const ch = src[i];
    if (ch === " ") { i++; continue; }
    if (ch === '"') {
      let j = i + 1, s = "";
      for (; j < src.length; j++) {
        if (src[j] === '"') { if (src[j + 1] === '"') { s += '"'; j++; continue; } break; }
        s += src[j];
      }
      out.push({ t: "str", v: s }); i = j + 1; continue;
    }
    if (ch === "'") {
      const j = src.indexOf("'", i + 1);
      if (j < 0 || src[j + 1] !== "!") throw new ErroFormula("#ERRO!");
      abaPendente = src.slice(i + 1, j); i = j + 2; continue;
    }
    if (ch === "{") {
      const j = src.indexOf("}", i);
      if (j < 0) throw new ErroFormula("#ERRO!");
      out.push({ t: "arr" }); i = j + 1; continue;
    }
    if (/[0-9]/.test(ch)) {
      const m = /^\d+/.exec(src.slice(i))!;
      out.push({ t: "num", v: Number(m[0]) }); i += m[0].length; continue;
    }
    if (/[A-Za-zÀ-ÿ_$]/.test(ch)) {
      const m = /^[A-Za-zÀ-ÿ0-9_.$:]+/.exec(src.slice(i))!;
      const palavra = m[0];
      i += palavra.length;
      if (src[i] === "!") { abaPendente = palavra; i++; continue; }
      if (src[i] === "(") { out.push({ t: "func", v: palavra }); continue; }
      if (REF_RE.test(palavra)) { out.push({ t: "ref", aba: abaPendente, v: palavra }); abaPendente = null; continue; }
      if (palavra === "VERDADEIRO") { out.push({ t: "num", v: 1 }); continue; }
      if (palavra === "FALSO") { out.push({ t: "num", v: 0 }); continue; }
      throw new ErroFormula("#NOME?");
    }
    if (ch === ",") throw new ErroFormula("#ERRO!"); // vírgula não é separador em pt-BR
    const dois = src.slice(i, i + 2);
    if (dois === "<>" || dois === "<=" || dois === ">=") { out.push({ t: "op", v: dois }); i += 2; continue; }
    if ("+-*/&=<>();".includes(ch)) { out.push({ t: "op", v: ch }); i++; continue; }
    throw new ErroFormula("#ERRO!");
  }
  out.push({ t: "fim" });
  return out;
}

function parse(src: string): No {
  const toks = tokenizar(src);
  let p = 0;
  const olhar = () => toks[p];
  const comer = (v?: string) => {
    const t = toks[p++];
    if (v !== undefined && !(t.t === "op" && t.v === v)) throw new ErroFormula("#ERRO!");
    return t;
  };
  const ehOp = (...vs: string[]) => { const t = olhar(); return t.t === "op" && vs.includes(t.v); };

  const comparacao = (): No => {
    let a = concatenacao();
    while (ehOp("=", "<>", "<", ">", "<=", ">=")) { const op = (comer() as { v: string }).v; a = { k: "bin", op, a, b: concatenacao() }; }
    return a;
  };
  const concatenacao = (): No => {
    let a = aditiva();
    while (ehOp("&")) { comer(); a = { k: "bin", op: "&", a, b: aditiva() }; }
    return a;
  };
  const aditiva = (): No => {
    let a = multiplicativa();
    while (ehOp("+", "-")) { const op = (comer() as { v: string }).v; a = { k: "bin", op, a, b: multiplicativa() }; }
    return a;
  };
  const multiplicativa = (): No => {
    let a = unaria();
    while (ehOp("*", "/")) { const op = (comer() as { v: string }).v; a = { k: "bin", op, a, b: unaria() }; }
    return a;
  };
  const unaria = (): No => {
    if (ehOp("-")) { comer(); return { k: "neg", a: unaria() }; }
    if (ehOp("+")) { comer(); return unaria(); }
    return primaria();
  };
  const primaria = (): No => {
    const t = comer();
    if (t.t === "num") return { k: "num", v: t.v };
    if (t.t === "str") return { k: "str", v: t.v };
    if (t.t === "arr") return { k: "arr" };
    if (t.t === "ref") return { k: "ref", aba: t.aba, a1: t.v };
    if (t.t === "func") {
      if (!(FUNCOES_PERMITIDAS as readonly string[]).includes(t.v)) throw new ErroFormula("#NOME?");
      comer("(");
      const args: No[] = [];
      if (!ehOp(")")) {
        args.push(comparacao());
        while (ehOp(";")) { comer(); args.push(comparacao()); }
      }
      comer(")");
      return { k: "func", nome: t.v, args };
    }
    if (t.t === "op" && t.v === "(") { const e = comparacao(); comer(")"); return e; }
    throw new ErroFormula("#ERRO!");
  };

  const arvore = comparacao();
  if (olhar().t !== "fim") throw new ErroFormula("#ERRO!");
  return arvore;
}

/** Pasta pronta: conteúdo estático + (opcionalmente) o que o sync grava por cima. */
export function montarPasta(...lotes: ValueRange[][]): Pasta {
  const pasta = new Pasta();
  for (const lote of lotes) for (const vr of lote) pasta.escrever(vr.range, vr.values);
  return pasta;
}

/** Nomes de função usados numa fórmula (fora de literais de texto). */
export function funcoesUsadas(formula: string): string[] {
  const semTexto = formula.replace(/"(?:[^"]|"")*"/g, '""');
  return [...semTexto.matchAll(/([A-ZÀ-Ý][A-ZÀ-Ý0-9_.]*)\(/g)].map((m) => m[1]);
}
