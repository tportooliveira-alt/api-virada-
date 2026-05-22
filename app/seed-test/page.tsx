"use client";

import { useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "virada-app:v1";
const ACCOUNT_KEY = "virada-account-v1";

function id(prefix: string): string {
  return prefix + "_" + Math.random().toString(36).slice(2, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// Seed alinhado ao positioning declarado em product.yaml:
// - Avatar: CLT 28-45 anos, renda R$ 3-5k, "sair do vermelho em 30 dias"
// - Linguagem do dia-a-dia brasileiro
// - Todos os gastos do mês corrente pra aparecer no dashboard (bug #5 do agent)
const SEED_DATA = {
  expenses: [
    { id: id("exp"), description: "Mercado da semana", value: 320, category: "Mercado", date: daysAgo(2), paymentMethod: "Débito", nature: "essencial", scope: "casa", source: "app" },
    { id: id("exp"), description: "Mercado quinzenal", value: 410, category: "Mercado", date: daysAgo(15), paymentMethod: "Débito", nature: "essencial", scope: "casa", source: "app" },
    { id: id("exp"), description: "Aluguel", value: 1200, category: "Aluguel", date: daysAgo(8), paymentMethod: "Boleto", nature: "essencial", scope: "casa", source: "app" },
    { id: id("exp"), description: "Conta de luz", value: 145, category: "Energia", date: daysAgo(10), paymentMethod: "Boleto", nature: "essencial", scope: "casa", source: "app" },
    { id: id("exp"), description: "Internet", value: 89, category: "Internet", date: daysAgo(12), paymentMethod: "Boleto", nature: "essencial", scope: "casa", source: "app" },
    { id: id("exp"), description: "Uber pro trabalho", value: 28, category: "Transporte", date: daysAgo(1), paymentMethod: "Pix", nature: "essencial", scope: "casa", source: "app" },
    { id: id("exp"), description: "Combustível", value: 180, category: "Transporte", date: daysAgo(5), paymentMethod: "Débito", nature: "essencial", scope: "casa", source: "app" },
    { id: id("exp"), description: "iFood (final de semana)", value: 75, category: "Delivery", date: daysAgo(3), paymentMethod: "Pix", nature: "impulso", scope: "casa", source: "app" },
    { id: id("exp"), description: "Cerveja com amigos", value: 60, category: "Lazer", date: daysAgo(6), paymentMethod: "Dinheiro", nature: "impulso", scope: "casa", source: "app" },
    { id: id("exp"), description: "Spotify + Netflix", value: 42, category: "Lazer", date: daysAgo(14), paymentMethod: "Crédito", nature: "essencial", scope: "casa", source: "app" },
    { id: id("exp"), description: "Remédio", value: 65, category: "Saúde", date: daysAgo(7), paymentMethod: "Débito", nature: "essencial", scope: "casa", source: "app" },
    { id: id("exp"), description: "Padaria", value: 38, category: "Mercado", date: daysAgo(4), paymentMethod: "Pix", nature: "impulso", scope: "casa", source: "app" },
  ],
  incomes: [
    { id: id("inc"), description: "Salário CLT", value: 3500, category: "Salário", date: daysAgo(5), scope: "casa", source: "app" },
    { id: id("inc"), description: "Freela design", value: 480, category: "Freelance", date: daysAgo(11), scope: "casa", source: "app" },
  ],
  debts: [
    { id: id("debt"), name: "Cartão de crédito (rotativo)", totalValue: 2300, installmentValue: 230, dueDate: daysAgo(-7), priority: "alta", status: "aberta" },
    { id: id("debt"), name: "Cheque especial", totalValue: 850, installmentValue: 850, dueDate: daysAgo(-2), priority: "alta", status: "aberta" },
    { id: id("debt"), name: "Crediário Magazine", totalValue: 680, installmentValue: 170, dueDate: daysAgo(-12), priority: "média", status: "aberta" },
  ],
  goals: [
    { id: id("goal"), name: "Reserva de emergência (1 mês)", targetValue: 1000, currentValue: 250, type: "reserva" },
    { id: id("goal"), name: "Quitar cheque especial", targetValue: 850, currentValue: 0, type: "dívida" },
    { id: id("goal"), name: "Renda extra mensal (R$ 500)", targetValue: 500, currentValue: 480, type: "reserva" },
  ],
  missionStatus: {},
};

const ACCOUNT_DATA = {
  name: "Thiago Porto Oliveira",
  email: "tportooliveira@gmail.com",
};

export default function SeedTestPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  function popular() {
    setStatus("loading");
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
      localStorage.setItem(ACCOUNT_KEY, JSON.stringify(ACCOUNT_DATA));
      setTimeout(() => setStatus("done"), 600);
    } catch (e) {
      alert("Erro: " + e);
      setStatus("idle");
    }
  }

  function limpar() {
    if (!confirm("Tem certeza que quer apagar TODOS os dados do app?")) return;
    localStorage.removeItem(STORAGE_KEY);
    setStatus("idle");
    alert("Dados apagados!");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#07111F", color: "#CBD5E1", padding: "40px 20px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <h1 style={{ color: "#F5C542", fontSize: 28 }}>🧪 Página de teste — Seed</h1>
        <p style={{ marginTop: 16 }}>Esta página popula seu app com <strong style={{ color: "#fff" }}>dados de teste</strong> pra você ver como fica a planilha cheia.</p>

        <div style={{ marginTop: 24, padding: 20, background: "rgba(11, 16, 32, 0.78)", border: "1px solid rgba(203, 213, 225, 0.12)", borderRadius: 12 }}>
          <h2 style={{ color: "#fff", fontSize: 18, marginBottom: 12 }}>O que será criado:</h2>
          <ul style={{ lineHeight: 1.8, paddingLeft: 20 }}>
            <li>10 gastos (ração, vacinação, diesel, mercado, etc.)</li>
            <li>5 entradas (venda de bezerros, leite, boi, serviços)</li>
            <li>3 dívidas (crédito rural, cartão, trator)</li>
            <li>3 metas (trator novo, reserva, quitar crédito)</li>
          </ul>
        </div>

        {status === "idle" && (
          <button onClick={popular} style={{ marginTop: 24, padding: "16px 32px", background: "#22C55E", color: "#fff", border: 0, borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: "pointer", width: "100%" }}>
            🚀 Popular dados de teste
          </button>
        )}

        {status === "loading" && (
          <div style={{ marginTop: 24, padding: 16, textAlign: "center", color: "#F5C542" }}>Populando dados...</div>
        )}

        {status === "done" && (
          <div style={{ marginTop: 24, padding: 20, background: "rgba(34, 197, 94, 0.15)", border: "1px solid #22C55E", borderRadius: 8 }}>
            <p style={{ color: "#22C55E", fontWeight: 700, fontSize: 18 }}>✅ Dados populados!</p>
            <p style={{ marginTop: 8 }}>Agora você pode:</p>
            <Link href="/app/inicio" style={{ display: "block", marginTop: 12, padding: 12, background: "#22C55E", color: "#fff", textAlign: "center", borderRadius: 6, textDecoration: "none", fontWeight: 600 }}>
              Ir pro app →
            </Link>
            <Link href="/app/evolucao" style={{ display: "block", marginTop: 8, padding: 12, background: "#F5C542", color: "#07111F", textAlign: "center", borderRadius: 6, textDecoration: "none", fontWeight: 600 }}>
              Exportar planilha →
            </Link>
          </div>
        )}

        <button onClick={limpar} style={{ marginTop: 16, padding: 8, background: "transparent", color: "#94A3B8", border: "1px solid rgba(203, 213, 225, 0.12)", borderRadius: 6, fontSize: 13, cursor: "pointer", width: "100%" }}>
          Apagar todos os dados (reset)
        </button>
      </div>
    </div>
  );
}
