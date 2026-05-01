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

const SEED_DATA = {
  expenses: [
    { id: id("exp"), description: "Ração para o gado", value: 850, category: "Fornecedor", date: daysAgo(2), paymentMethod: "Pix", nature: "essencial", scope: "empresa", source: "app" },
    { id: id("exp"), description: "Sal mineral", value: 350, category: "Fornecedor", date: daysAgo(5), paymentMethod: "Dinheiro", nature: "essencial", scope: "empresa", source: "app" },
    { id: id("exp"), description: "Vacinação do rebanho", value: 1200, category: "Saúde", date: daysAgo(7), paymentMethod: "Pix", nature: "essencial", scope: "empresa", source: "app" },
    { id: id("exp"), description: "Diesel da camionete", value: 280, category: "Transporte", date: daysAgo(3), paymentMethod: "Crédito", nature: "essencial", scope: "empresa", source: "app" },
    { id: id("exp"), description: "Conta de luz da fazenda", value: 420, category: "Energia", date: daysAgo(10), paymentMethod: "Boleto", nature: "essencial", scope: "empresa", source: "app" },
    { id: id("exp"), description: "Mercado mensal", value: 680, category: "Mercado", date: daysAgo(8), paymentMethod: "Débito", nature: "essencial", scope: "casa", source: "app" },
    { id: id("exp"), description: "Pizza no domingo", value: 95, category: "Delivery", date: daysAgo(4), paymentMethod: "Pix", nature: "impulso", scope: "casa", source: "app" },
    { id: id("exp"), description: "Cerveja no bar", value: 80, category: "Lazer", date: daysAgo(6), paymentMethod: "Dinheiro", nature: "impulso", scope: "casa", source: "app" },
    { id: id("exp"), description: "Internet rural", value: 230, category: "Internet", date: daysAgo(15), paymentMethod: "Boleto", nature: "essencial", scope: "casa", source: "app" },
    { id: id("exp"), description: "Manutenção do trator", value: 1850, category: "Compra", date: daysAgo(20), paymentMethod: "Pix", nature: "essencial", scope: "empresa", source: "app" },
  ],
  incomes: [
    { id: id("inc"), description: "Venda de 3 bezerros", value: 7800, category: "Venda", date: daysAgo(1), scope: "empresa", source: "app" },
    { id: id("inc"), description: "Venda de leite (semanal)", value: 950, category: "Venda", date: daysAgo(7), scope: "empresa", source: "app" },
    { id: id("inc"), description: "Venda de leite (semanal)", value: 920, category: "Venda", date: daysAgo(14), scope: "empresa", source: "app" },
    { id: id("inc"), description: "Pagamento de serviço prestado", value: 1500, category: "Serviço", date: daysAgo(12), scope: "empresa", source: "app" },
    { id: id("inc"), description: "Venda de boi gordo", value: 4200, category: "Venda", date: daysAgo(25), scope: "empresa", source: "app" },
  ],
  debts: [
    { id: id("debt"), name: "Crédito rural - banco", totalValue: 25000, installmentValue: 2100, dueDate: daysAgo(-10), priority: "alta", status: "aberta" },
    { id: id("debt"), name: "Cartão de crédito", totalValue: 1850, installmentValue: 1850, dueDate: daysAgo(-5), priority: "média", status: "aberta" },
    { id: id("debt"), name: "Parcelamento do trator", totalValue: 8500, installmentValue: 850, dueDate: daysAgo(-15), priority: "média", status: "negociando" },
  ],
  goals: [
    { id: id("goal"), name: "Comprar trator novo", targetValue: 50000, currentValue: 12500, type: "reserva" },
    { id: id("goal"), name: "Reserva de emergência", targetValue: 10000, currentValue: 6800, type: "reserva" },
    { id: id("goal"), name: "Quitar crédito rural", targetValue: 25000, currentValue: 5000, type: "dívida" },
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
