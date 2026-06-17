/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Mostra, célula a célula, as FÓRMULAS que o gerador coloca dentro da planilha
 * Google — sem precisar de credencial nem criar planilha de verdade.
 *
 * Roda com: npx tsx scripts/dump-formulas.ts
 */
import { buildStaticValues, buildSyncBatch } from "../lib/sheets/builder";

const isFormula = (v: unknown) => typeof v === "string" && v.startsWith("=");

// Dados de exemplo (mesmos do teste) para gerar fórmulas com linhas reais.
const input = {
  incomes: [
    { id: "i1", description: "Salário", value: 3000, category: "Salário", date: "2026-06-05" },
    { id: "i2", description: "Venda", value: 500, category: "Renda extra", date: "2026-06-20" },
  ],
  expenses: [
    { id: "e1", description: "Mercado", value: 800, category: "Mercado", date: "2026-06-05", nature: "essencial" },
    { id: "e2", description: "Lazer", value: 250, category: "Lazer", date: "2026-06-10", nature: "impulso" },
    { id: "e3", description: "Cartão", value: 1200, category: "Cartão", date: "2026-06-22", nature: "essencial" },
  ],
  debts: [
    { id: "d1", name: "Cartão Nubank", totalValue: 1800, installmentValue: 600, dueDate: "2026-07-05", priority: "alta", status: "aberta" },
    { id: "d2", name: "Dívida antiga", totalValue: 300, installmentValue: 300, dueDate: "2026-01-01", priority: "alta", status: "quitada" },
  ],
  goals: [
    { id: "g1", name: "Reserva 6 meses", targetValue: 12000, currentValue: 3000, type: "reserva" },
    { id: "g2", name: "Quitar cartão", targetValue: 1800, currentValue: 1800, type: "dívida" },
  ],
};

const COLS = "ABCDEFGHIJKL".split("");
function cellRef(rangeStart: string, rowOffset: number, colIndex: number): string {
  // rangeStart ex: "Dívidas!A2" ou "Lançamentos!K4:K7" -> resolve aba + col/linha base
  const [tab, a1] = rangeStart.split("!");
  const start = a1.split(":")[0]; // "K4"
  const baseRow = parseInt(start.replace(/[A-Z]/g, ""), 10);
  const baseCol = start.replace(/[0-9]/g, "").split("").reduce((acc, ch) => acc * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
  return `${tab}!${COLS[baseCol + colIndex]}${baseRow + rowOffset}`;
}

console.log("\n══════════════════════════════════════════════════════════");
console.log("  FÓRMULAS QUE ENTRAM NA PLANILHA GOOGLE (os 'códigos')");
console.log("══════════════════════════════════════════════════════════");

console.log("\n── DASHBOARD (fórmulas fixas, criadas 1x e que recalculam) ──");
for (const d of buildStaticValues() as any[]) {
  const rows = d.values ?? [];
  rows.forEach((row: any[], ri: number) => {
    row.forEach((cell, ci) => {
      if (isFormula(cell)) console.log(`  ${cellRef(d.range, ri, ci).padEnd(26)} ${cell}`);
    });
  });
}

console.log("\n── ABAS DE DADOS (fórmulas por linha, recalculam ao editar) ──");
const batch = buildSyncBatch(input as any);
for (const d of batch.valueRanges as any[]) {
  const rows = d.values ?? [];
  rows.forEach((row: any[], ri: number) => {
    row.forEach((cell, ci) => {
      if (isFormula(cell)) console.log(`  ${cellRef(d.range, ri, ci).padEnd(26)} ${cell}`);
    });
  });
}
console.log("");
