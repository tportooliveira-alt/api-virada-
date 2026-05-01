"use client";

/**
 * /admin/membros — painel administrativo.
 *
 * Quem pode entrar: emails listados em ADMIN_EMAILS (env do servidor).
 * O acesso ao app já passa pelo AuthGate; aqui a página lê o email do
 * localStorage (chave virada_access_v2) e usa como header `x-admin-email`
 * nas chamadas de API. Se a env do servidor reconhecer, libera.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

interface Member {
  email: string;
  name: string | null;
  platform: string;
  product: string | null;
  transaction_id: string | null;
  status: "ativo" | "cancelado" | "reembolsado";
  added_at: string;
  cancelled_at: string | null;
}

interface Summary {
  total: number;
  ativos: number;
  cancelados: number;
  reembolsados: number;
  por_plataforma: Record<string, number>;
}

const STORAGE_KEY = "virada_access_v2";

function getAdminEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: string };
    return parsed.email ?? null;
  } catch {
    return null;
  }
}

export default function AdminMembrosPage() {
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "ativo" | "cancelado" | "reembolsado">("todos");
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // formulário de cadastro manual
  const [showForm, setShowForm] = useState(false);
  const [formEmail, setFormEmail] = useState("");
  const [formName, setFormName] = useState("");
  const [formProduct, setFormProduct] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setAdminEmail(getAdminEmail());
  }, []);

  const refresh = useCallback(async () => {
    if (!adminEmail) return;
    setLoading(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/admin/members", {
        headers: { "x-admin-email": adminEmail },
      });
      if (res.status === 401) {
        setAuthError("Seu email não está em ADMIN_EMAILS. Configure no .env do servidor.");
        setMembers([]);
        setSummary(null);
        return;
      }
      const data = await res.json();
      setMembers(data.members ?? []);
      setSummary(data.summary ?? null);
    } catch {
      setAuthError("Erro ao buscar dados. Servidor está rodando?");
    } finally {
      setLoading(false);
    }
  }, [adminEmail]);

  useEffect(() => {
    if (adminEmail) refresh();
  }, [adminEmail, refresh]);

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (statusFilter !== "todos" && m.status !== statusFilter) return false;
      if (!filter) return true;
      const f = filter.toLowerCase();
      return (
        m.email.toLowerCase().includes(f) ||
        (m.name ?? "").toLowerCase().includes(f) ||
        (m.product ?? "").toLowerCase().includes(f) ||
        (m.transaction_id ?? "").toLowerCase().includes(f)
      );
    });
  }, [members, filter, statusFilter]);

  async function handleManualAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!adminEmail || !formEmail) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/members/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": adminEmail,
        },
        body: JSON.stringify({
          email: formEmail,
          name: formName || undefined,
          product: formProduct || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(`Erro: ${data.message ?? "falha"}`);
      } else {
        setFeedback(`✓ ${formEmail} cadastrado.`);
        setFormEmail("");
        setFormName("");
        setFormProduct("");
        setShowForm(false);
        await refresh();
      }
    } catch {
      setFeedback("Erro de rede.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(email: string, status: "ativo" | "cancelado" | "reembolsado") {
    if (!adminEmail) return;
    if (!confirm(`Mudar status de ${email} para ${status}?`)) return;
    try {
      const res = await fetch("/api/admin/members/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": adminEmail,
        },
        body: JSON.stringify({ email, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Erro: ${data.message ?? "falha"}`);
        return;
      }
      await refresh();
    } catch {
      alert("Erro de rede.");
    }
  }

  if (!adminEmail) {
    return (
      <div className="min-h-screen bg-virada-bg p-6 text-virada-gray">
        <div className="mx-auto max-w-md rounded-lg border border-virada-line bg-virada-card p-6">
          <h1 className="text-xl font-semibold text-white">Admin — não logado</h1>
          <p className="mt-2 text-sm">
            Você precisa estar logado no app para acessar o admin. Vá para{" "}
            <a href="/app/inicio" className="text-virada-gold underline">
              /app/inicio
            </a>
            , entre com sua conta Google e volte aqui.
          </p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-virada-bg p-6 text-virada-gray">
        <div className="mx-auto max-w-md rounded-lg border border-virada-line bg-virada-card p-6">
          <h1 className="text-xl font-semibold text-white">Acesso negado</h1>
          <p className="mt-2 text-sm">{authError}</p>
          <p className="mt-3 text-xs text-virada-slate">
            Email atual: <code className="text-virada-gold">{adminEmail}</code>
          </p>
          <p className="mt-3 text-xs text-virada-slate">
            No <code>.env.local</code> do servidor adicione:{" "}
            <code className="text-virada-gold">ADMIN_EMAILS={adminEmail}</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-virada-bg p-4 text-virada-gray md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="border-b border-virada-line pb-4">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-virada-gold">
            Admin
          </span>
          <h1 className="mt-1 text-2xl font-semibold text-white md:text-3xl">Membros</h1>
          <p className="mt-1 text-sm text-virada-gray">
            Logado como <code className="text-virada-gold">{adminEmail}</code>
          </p>
        </header>

        {summary && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Total" value={summary.total} />
            <KpiCard label="Ativos" value={summary.ativos} highlight />
            <KpiCard label="Cancelados" value={summary.cancelados} />
            <KpiCard label="Reembolsados" value={summary.reembolsados} />
          </div>
        )}

        {summary && Object.keys(summary.por_plataforma).length > 0 && (
          <div className="rounded-lg border border-virada-line bg-virada-card p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-virada-slate">
              Por plataforma
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(summary.por_plataforma).map(([plat, count]) => (
                <span
                  key={plat}
                  className="rounded-full border border-virada-line bg-white/[0.045] px-3 py-1 text-xs text-virada-gray"
                >
                  {plat}: <span className="text-white">{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar por email, nome, produto..."
            className="flex-1 min-w-[200px] rounded border border-virada-line bg-virada-bgSoft px-3 py-2 text-sm text-white placeholder:text-virada-slate focus:border-virada-gold focus:outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="rounded border border-virada-line bg-virada-bgSoft px-3 py-2 text-sm text-white focus:border-virada-gold focus:outline-none"
          >
            <option value="todos">Todos</option>
            <option value="ativo">Ativos</option>
            <option value="cancelado">Cancelados</option>
            <option value="reembolsado">Reembolsados</option>
          </select>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded bg-virada-gold px-4 py-2 text-sm font-semibold text-virada-bg hover:opacity-90"
          >
            {showForm ? "Fechar" : "+ Cadastrar manual"}
          </button>
          <button
            onClick={refresh}
            className="rounded border border-virada-line px-4 py-2 text-sm text-white hover:bg-white/[0.06]"
          >
            Atualizar
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleManualAdd}
            className="space-y-3 rounded-lg border border-virada-line bg-virada-card p-4"
          >
            <h3 className="text-sm font-semibold text-white">Cadastro manual</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                type="email"
                required
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@cliente.com"
                className="rounded border border-virada-line bg-virada-bgSoft px-3 py-2 text-sm text-white placeholder:text-virada-slate"
              />
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nome (opcional)"
                className="rounded border border-virada-line bg-virada-bgSoft px-3 py-2 text-sm text-white placeholder:text-virada-slate"
              />
              <input
                type="text"
                value={formProduct}
                onChange={(e) => setFormProduct(e.target.value)}
                placeholder="Produto (opcional)"
                className="rounded border border-virada-line bg-virada-bgSoft px-3 py-2 text-sm text-white placeholder:text-virada-slate"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-virada-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Cadastrar"}
            </button>
            {feedback && <p className="text-sm text-virada-gold">{feedback}</p>}
          </form>
        )}

        <div className="overflow-x-auto rounded-lg border border-virada-line bg-virada-card">
          {loading ? (
            <div className="p-8 text-center text-sm text-virada-slate">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-virada-slate">
              {members.length === 0
                ? "Nenhum membro ainda. Webhooks vão preencher quando alguém comprar."
                : "Nenhum membro com esse filtro."}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-virada-line text-left text-xs uppercase tracking-wider text-virada-slate">
                <tr>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Plataforma</th>
                  <th className="px-3 py-2">Produto</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.email} className="border-b border-virada-line/50 last:border-0">
                    <td className="px-3 py-2 text-white">{m.email}</td>
                    <td className="px-3 py-2">{m.name || "—"}</td>
                    <td className="px-3 py-2 text-virada-gray">{m.platform}</td>
                    <td className="px-3 py-2">{m.product || "—"}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="px-3 py-2 text-xs text-virada-slate">
                      {formatDate(m.added_at)}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={m.status}
                        onChange={(e) =>
                          handleStatusChange(
                            m.email,
                            e.target.value as "ativo" | "cancelado" | "reembolsado"
                          )
                        }
                        className="rounded border border-virada-line bg-virada-bgSoft px-2 py-1 text-xs text-white"
                      >
                        <option value="ativo">Ativar</option>
                        <option value="cancelado">Cancelar</option>
                        <option value="reembolsado">Reembolsar</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-virada-slate">
          Total exibido: {filtered.length} de {members.length} membros
        </p>
      </div>
    </div>
  );
}

function KpiCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-virada-line bg-virada-card p-4">
      <span className="text-xs font-semibold uppercase tracking-wider text-virada-slate">
        {label}
      </span>
      <div className={`mt-1 text-3xl font-semibold ${highlight ? "text-virada-gold" : "text-white"}`}>
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "ativo" | "cancelado" | "reembolsado" }) {
  const styles: Record<typeof status, string> = {
    ativo: "bg-virada-green/15 text-virada-green border-virada-green/30",
    cancelado: "bg-white/[0.045] text-virada-gray border-virada-line",
    reembolsado: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs ${styles[status]}`}>
      {status}
    </span>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
