/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Mostra, célula a célula, as FÓRMULAS que o gerador coloca dentro da planilha
 * Google — e o valor que cada uma dá sobre os dados de exemplo, calculado pelo
 * mini-avaliador (scripts/planilha-avaliador.ts). Sem credencial, sem criar
 * planilha de verdade.
 *
 * Roda com: npx tsx scripts/dump-formulas.ts
 */
import { buildStaticValues, buildSyncBatch } from "../lib/sheets/builder";
import { montarPasta } from "./planilha-avaliador";

const isFormula = (v: unknown) => typeof v === "string" && v.startsWith("=");

// Dados de exemplo no mês corrente (os KPIs filtram o mês de referência).
const hoje = new Date();
const mes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
const input = {
  incomes: [
    { id: "i1", description: "Salário", value: 3000, category: "Salário", date: `${mes}-05` },
    { id: "i2", description: "Venda", value: 500, category: "Renda extra", date: `${mes}-20` },
  ],
  expenses: [
    { id: "e1", description: "Mercado", value: 800, category: "Mercado", date: `${mes}-05`, nature: "essencial", paymentMethod: "Pix" },
    { id: "e2", description: "Lazer", value: 250, category: "Lazer", date: `${mes}-10`, nature: "impulso", paymentMethod: "Crédito" },
    { id: "e3", description: "Cartão", value: 1200, category: "Cartão", date: `${mes}-22`, nature: "essencial", paymentMethod: "Boleto" },
    { id: "e4", description: "Lanche (estornado)", value: 40, category: "Delivery", date: `${mes}-23`, nature: "impulso", paymentMethod: "Pix", estornadoEm: `${mes}-24` },
  ],
  debts: [
    { id: "d1", name: "Cartão Nubank", totalValue: 1800, installmentValue: 600, dueDate: `${mes}-05`, priority: "alta", status: "aberta", paidValue: 600 },
    { id: "d2", name: "Dívida antiga", totalValue: 300, installmentValue: 300, dueDate: "2026-01-01", priority: "alta", status: "quitada", paidValue: 300 },
  ],
  goals: [
    { id: "g1", name: "Reserva 6 meses", targetValue: 12000, currentValue: 3000, type: "reserva" },
    { id: "g2", name: "Quitar cartão", targetValue: 1800, currentValue: 1800, type: "dívida" },
  ],
  settings: { expectedIncome: 3500, budgetPhase: "organizando" as const },
};

const COLS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
function cellRef(rangeStart: string, rowOffset: number, colIndex: number): string {
  // rangeStart ex: "Dívidas!A2" ou "Lançamentos!O4:O7" -> resolve aba + col/linha base
  const [tab, a1] = rangeStart.split("!");
  const start = a1.split(":")[0]; // "O4"
  const baseRow = parseInt(start.replace(/[A-Z]/g, ""), 10);
  const baseCol = start.replace(/[0-9]/g, "").split("").reduce((acc, ch) => acc * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
  return `${tab}!${COLS[baseCol + colIndex]}${baseRow + rowOffset}`;
}

const estatico = buildStaticValues();
const batch = buildSyncBatch(input as any);
const pasta = montarPasta(estatico, batch.valueRanges);
const mostra = (v: unknown) => (typeof v === "number" ? String(Math.round(v * 100) / 100) : JSON.stringify(v));

function listar(lotes: any[]) {
  for (const d of lotes) {
    const rows = d.values ?? [];
    rows.forEach((row: any[], ri: number) => {
      row.forEach((cell, ci) => {
        if (!isFormula(cell)) return;
        const ref = cellRef(d.range, ri, ci);
        console.log(`  ${ref.padEnd(22)} ${String(cell).padEnd(96)} → ${mostra(pasta.ler(ref))}`);
      });
    });
  }
}

console.log("\n══════════════════════════════════════════════════════════");
console.log("  FÓRMULAS QUE ENTRAM NA PLANILHA GOOGLE (os 'códigos')");
console.log(`  mês de referência: ${mes} · valor = o que a célula mostraria`);
console.log("══════════════════════════════════════════════════════════");

console.log("\n── FIXAS (Dashboard, Filtros, Bolsos — criadas 1x, recalculam sozinhas) ──");
listar(estatico);

console.log("\n── POR LINHA (Dívidas, Metas, Fluxo, Resumo — gravadas a cada sync) ──");
listar(batch.valueRanges);

const erros = pasta.todasAsFormulas().filter((f) => typeof f.valor === "string" && f.valor.startsWith("#"));
console.log(erros.length ? `\n⚠ ${erros.length} fórmula(s) com erro: ${erros.map((e) => `${e.ref}=${e.valor}`).join(", ")}` : "\n✓ nenhuma fórmula dá erro sobre os dados de exemplo");
console.log("");
