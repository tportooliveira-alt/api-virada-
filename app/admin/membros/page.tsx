"use client";

/**
 * /admin/membros — painel administrativo.
 *
 * Quem pode entrar: emails listados em ADMIN_EMAILS (env do servidor).
 * Quem autoriza é o servidor, pelo cookie assinado que o /api/access/check
 * emite no login (ver app/api/admin/guard.ts). O email do localStorage aqui
 * serve só pra mostrar na tela e pro header antigo `x-admin-email`, que o
 * servidor só aceita FORA de produção (e avisa em tela quando aceita). Em
 * produção, sem segredo de sessão configurado, o admin nem abre.
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

/** Uma linha da tabela webhook_log: um aviso de venda que chegou no servidor. */
interface WebhookEntry {
  id: number;
  platform: string;
  event: string | null;
  email: string | null;
  ok: boolean;
  message: string | null;
  received_at: string;
}

interface LogSummary {
  total: number;
  falhas: number;
  ignorados: number;
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
  // Aviso do servidor: a porta abriu sem segredo de administrador (só em dev).
  const [aviso, setAviso] = useState<string | null>(null);

  // Avisos de venda (webhook_log)
  const [log, setLog] = useState<WebhookEntry[]>([]);
  const [logSummary, setLogSummary] = useState<LogSummary | null>(null);
  const [logError, setLogError] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);

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
      if (!res.ok) {
        // A explicação certa (sessão vencida, e-mail fora da lista, ou servidor
        // sem o segredo de administrador) vem do servidor — ele é quem sabe.
        // Sem este `!res.ok` um 503 caía como lista vazia, sem dizer nada.
        const erro = await res.json().catch(() => ({}));
        setAuthError(erro.message ?? "Seu e-mail não está na lista de administradores do servidor.");
        setMembers([]);
        setSummary(null);
        setAviso(null);
        return;
      }
      const data = await res.json();
      setMembers(data.members ?? []);
      setSummary(data.summary ?? null);
      setAviso(data.aviso ?? null);

      // Os avisos de venda vêm junto: é a tela que mostra a venda que NÃO
      // virou acesso. Falha aqui não pode derrubar a lista de membros.
      try {
        const logRes = await fetch("/api/admin/webhook-log?limit=100", {
          headers: { "x-admin-email": adminEmail },
        });
        const logData = await logRes.json();
        if (!logRes.ok) {
          setLogError(logData.message ?? "Não foi possível carregar os avisos de venda.");
          setLog([]);
          setLogSummary(null);
        } else {
          setLogError(null);
          setLog(logData.entries ?? []);
          setLogSummary(logData.summary ?? null);
        }
      } catch {
        setLogError("Não foi possível carregar os avisos de venda. Tente atualizar.");
      }
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
          <h1 className="text-xl font-semibold text-ink-900">Admin — não logado</h1>
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
    // O que fazer pra liberar é assunto de quem administra o servidor, não de
    // quem está na tela: vai pro console, igual ao AuthGate.
    console.error(
      `[admin] acesso negado para ${adminEmail}: ${authError}. Para liberar, inclua esse e-mail em ADMIN_EMAILS no .env.local do servidor.`,
    );
    return (
      <div className="min-h-screen bg-virada-bg p-6 text-virada-gray">
        <div className="mx-auto max-w-md rounded-lg border border-virada-line bg-virada-card p-6">
          <h1 className="text-xl font-semibold text-ink-900">Esta área é do dono do produto</h1>
          <p className="mt-2 text-sm">
            A conta <span className="text-virada-gold">{adminEmail}</span> não tem acesso ao painel de
            vendas. Se você é cliente, é só voltar pro app — não tem nada aqui pra você.
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
          <h1 className="mt-1 text-2xl font-semibold text-ink-900 md:text-3xl">Membros</h1>
          <p className="mt-1 text-sm text-virada-gray">
            Logado como <code className="text-virada-gold">{adminEmail}</code>
          </p>
        </header>

        {/* Porta aberta sem segredo de administrador: acontece só em dev, mas
            precisa aparecer, senão ninguém percebe que está assim. */}
        {aviso && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-700">
            {aviso}
          </div>
        )}

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
                  className="rounded-full border border-virada-line bg-white px-3 py-1 text-xs text-virada-gray"
                >
                  {plat}: <span className="text-ink-900">{count}</span>
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
            className="flex-1 min-w-[200px] rounded border border-virada-line bg-virada-bgSoft px-3 py-2 text-sm text-ink-900 placeholder:text-virada-slate focus:border-virada-gold focus:outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="rounded border border-virada-line bg-virada-bgSoft px-3 py-2 text-sm text-ink-900 focus:border-virada-gold focus:outline-none"
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
            className="rounded border border-virada-line px-4 py-2 text-sm text-ink-900 hover:bg-ink-100"
          >
            Atualizar
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleManualAdd}
            className="space-y-3 rounded-lg border border-virada-line bg-virada-card p-4"
          >
            <h3 className="text-sm font-semibold text-ink-900">Cadastro manual</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                type="email"
                required
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@cliente.com"
                className="rounded border border-virada-line bg-virada-bgSoft px-3 py-2 text-sm text-ink-900 placeholder:text-virada-slate"
              />
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nome (opcional)"
                className="rounded border border-virada-line bg-virada-bgSoft px-3 py-2 text-sm text-ink-900 placeholder:text-virada-slate"
              />
              <input
                type="text"
                value={formProduct}
                onChange={(e) => setFormProduct(e.target.value)}
                placeholder="Produto (opcional)"
                className="rounded border border-virada-line bg-virada-bgSoft px-3 py-2 text-sm text-ink-900 placeholder:text-virada-slate"
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
                    <td className="px-3 py-2 text-ink-900">{m.email}</td>
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
                        className="rounded border border-virada-line bg-virada-bgSoft px-2 py-1 text-xs text-ink-900"
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

        {/* ── Avisos de venda ───────────────────────────────────────────────
            A venda que não virou acesso não aparece em lugar nenhum: o
            servidor responde "ok" pra plataforma parar de reenviar e o
            registro fica só nesta tabela. Aqui o dono vê antes de o cliente
            reclamar. */}
        <section className="rounded-lg border border-virada-line bg-virada-card">
          <button
            onClick={() => setShowLog((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <span>
              <span className="block text-sm font-semibold text-ink-900">
                Últimos avisos de venda recebidos
              </span>
              <span className="block text-xs text-virada-slate">
                {logSummary
                  ? `${logSummary.total} avisos · ${logSummary.ignorados} ignorados por filtro de produto · ${logSummary.falhas} com problema`
                  : "O que cada plataforma mandou pro servidor"}
              </span>
            </span>
            <span className="text-xs text-virada-gold">{showLog ? "Esconder" : "Ver"}</span>
          </button>

          {showLog && (
            <div className="border-t border-virada-line">
              {logError ? (
                <p className="p-4 text-sm text-virada-gray">{logError}</p>
              ) : log.length === 0 ? (
                <p className="p-4 text-sm text-virada-slate">
                  Nenhum aviso recebido ainda. Quando alguém comprar, a plataforma avisa aqui.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-virada-line text-left text-xs uppercase tracking-wider text-virada-slate">
                      <tr>
                        <th className="px-3 py-2">Quando</th>
                        <th className="px-3 py-2">Plataforma</th>
                        <th className="px-3 py-2">Evento</th>
                        <th className="px-3 py-2">E-mail</th>
                        <th className="px-3 py-2">Resultado</th>
                        <th className="px-3 py-2">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {log.map((entry) => (
                        <tr key={entry.id} className="border-b border-virada-line/50 last:border-0">
                          <td className="whitespace-nowrap px-3 py-2 text-xs text-virada-slate">
                            {formatDateTime(entry.received_at)}
                          </td>
                          <td className="px-3 py-2 text-virada-gray">{entry.platform}</td>
                          <td className="px-3 py-2 text-virada-gray">{traduzEvento(entry.event)}</td>
                          <td className="px-3 py-2 text-ink-900">{entry.email || "—"}</td>
                          <td className="px-3 py-2">
                            <ResultadoBadge entry={entry} />
                          </td>
                          <td className="px-3 py-2 text-xs text-virada-gray">
                            {entry.message || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="border-t border-virada-line px-4 py-3 text-xs text-virada-slate">
                Aviso marcado como <strong>Ignorado</strong> é venda de um produto que não está na
                lista do servidor. Se essa venda deveria liberar o app, copie o código que aparece na
                coluna Motivo para a variável indicada ali (por exemplo{" "}
                <code className="text-virada-gold">KIWIFY_ALLOWED_PRODUCTS</code>) e reinicie o
                servidor. Enquanto isso, dá pra liberar a pessoa na mão em “+ Cadastrar manual”.
              </p>
            </div>
          )}
        </section>
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
      <div className={`mt-1 text-3xl font-semibold ${highlight ? "text-virada-gold" : "text-ink-900"}`}>
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "ativo" | "cancelado" | "reembolsado" }) {
  const styles: Record<typeof status, string> = {
    ativo: "bg-virada-green/15 text-virada-green border-virada-green/30",
    cancelado: "bg-white text-virada-gray border-virada-line",
    reembolsado: "bg-red-500/15 text-red-700 border-red-500/30",
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

/** "Ignorado" é diferente de "falhou": um é filtro nosso, o outro é defeito. */
function ResultadoBadge({ entry }: { entry: WebhookEntry }) {
  const ignorado = entry.ok && (entry.message ?? "").startsWith("produto fora de");
  if (!entry.ok) {
    return (
      <span className="inline-block rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-xs text-red-700">
        Não entrou
      </span>
    );
  }
  if (ignorado) {
    return (
      <span className="inline-block rounded-full border border-virada-gold/40 bg-virada-gold/15 px-2 py-0.5 text-xs text-virada-gold">
        Ignorado
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full border border-virada-green/30 bg-virada-green/15 px-2 py-0.5 text-xs text-virada-green">
      Liberado
    </span>
  );
}

/** O evento vem no jargão da plataforma; quem lê o painel é o dono. */
function traduzEvento(event: string | null): string {
  switch (event) {
    case "approved":
      return "compra aprovada";
    case "refunded":
      return "reembolso";
    case "chargeback":
      return "chargeback";
    case "cancelled":
      return "cancelamento";
    case "ignored":
      return "sem efeito";
    default:
      return event || "—";
  }
}

function formatDateTime(iso: string): string {
  // O SQLite grava "AAAA-MM-DD HH:MM:SS" em UTC (datetime('now')). Sem o "Z"
  // o navegador leria como hora local e mostraria a hora errada pro dono.
  const utc = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(iso) ? `${iso.replace(" ", "T")}Z` : iso;
  const d = new Date(utc);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
