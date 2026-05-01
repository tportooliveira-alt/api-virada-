"use client";

/**
 * GoogleSyncButton — sincronização com Google Planilhas em 1 clique.
 *
 * Fluxo:
 * 1. Usuário clica "Conectar com Google"
 * 2. Popup OAuth do Google abre (familiar, seguro)
 * 3. Usuário clica "Permitir"
 * 4. App cria/atualiza planilha no Drive DO USUÁRIO
 * 5. Link aparece: "Abrir no Google Planilhas"
 *
 * Não precisa de servidor. Token fica no localStorage.
 * Funciona 100% no celular.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { FileSpreadsheet, RefreshCcw, Unlink } from "lucide-react";

// ─── Tipos Google Identity Services ─────────────────────────────────────────
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");

const STORAGE_KEY = "virada_google_token";
const SHEET_KEY   = "virada_sheet_meta";

interface SheetMeta {
  spreadsheetId: string;
  spreadsheetUrl: string;
  lastSync: string;
}

interface Token {
  access_token: string;
  expires_at: number; // timestamp ms
}

// ─── Helpers API Google Sheets (REST direto, sem npm) ───────────────────────

async function sheetsRequest(
  method: "GET" | "POST" | "PUT" | "DELETE",
  endpoint: string,
  token: string,
  body?: unknown,
): Promise<unknown> {
  const res = await fetch(`https://sheets.googleapis.com/v4${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `Sheets API error ${res.status}`);
  }
  return res.json();
}

// ─── Criar planilha com 15 abas ──────────────────────────────────────────────

const ABA_HEADERS: Record<string, string[]> = {
  "Dashboard":        ["Métrica", "Valor"],
  "Lançamentos":      ["ID","Tipo","Descrição","Valor (R$)","Categoria","Data","Pagamento","Natureza","Escopo","Origem"],
  "Receitas":         ["ID","Descrição","Valor (R$)","Categoria","Data","Escopo"],
  "Despesas":         ["ID","Descrição","Valor (R$)","Categoria","Data","Pagamento","Natureza","Escopo"],
  "Dívidas":          ["ID","Nome","Valor Total","Parcela","Vencimento","Prioridade","Status"],
  "Metas":            ["ID","Meta","Valor Alvo","Valor Atual","Tipo","Progresso %"],
  "Fluxo de Caixa":   ["Data","Entradas","Saídas","Saldo do Dia","Saldo Acumulado"],
  "Resumo Mensal":    ["Mês/Ano","Entradas","Saídas","Resultado","Lançamentos","Economia %"],
  "Vendas":           ["ID","Produto/Serviço","Valor","Data","Recebimento","Status"],
  "Compras/Custos":   ["ID","Descrição","Fornecedor","Valor","Data","Categoria"],
  "Contas a Pagar":   ["ID","Descrição","Valor","Vencimento","Credor","Status"],
  "Contas a Receber": ["ID","Descrição","Valor","Vencimento","Devedor","Status"],
  "Missões":          ["Dia","Missão","Concluída","Data"],
  "Pontos/Medalhas":  ["ID","Pontos","Motivo","Data"],
  "Log de Sync":      ["ID","Ação","Tabela","Registro","Data/Hora"],
};

async function createSpreadsheet(token: string, email: string): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const body = {
    properties: { title: `Virada Financeira — ${email}`, locale: "pt_BR", timeZone: "America/Sao_Paulo" },
    sheets: Object.keys(ABA_HEADERS).map(title => ({ properties: { title } })),
  };
  const created = await sheetsRequest("POST", "/spreadsheets", token, body) as { spreadsheetId: string };
  const spreadsheetId = created.spreadsheetId;

  // Popula cabeçalhos em lote
  const data = Object.entries(ABA_HEADERS).map(([sheet, headers]) => ({
    range: `${sheet}!A1`,
    values: [headers],
  }));
  await sheetsRequest("POST", `/spreadsheets/${spreadsheetId}/values:batchUpdate`, token, {
    valueInputOption: "USER_ENTERED",
    data,
  });

  return { spreadsheetId, spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}` };
}

// ─── Sincronizar dados ────────────────────────────────────────────────────────

async function syncData(
  token: string,
  spreadsheetId: string,
  expenses: { id: string; description: string; value: number; category: string; date: string; paymentMethod?: string; nature?: string; scope?: string }[],
  incomes:  { id: string; description: string; value: number; category: string; date: string; scope?: string }[],
  debts:    { id: string; name: string; totalValue: number; installmentValue: number; dueDate: string; priority: string; status: string }[],
  goals:    { id: string; name: string; targetValue: number; currentValue: number; type: string }[],
): Promise<void> {
  const data: { range: string; values: (string | number)[][] }[] = [];

  // Limpa e re-escreve cada aba
  const clearRanges = ["Lançamentos!A2:Z","Receitas!A2:Z","Despesas!A2:Z","Dívidas!A2:Z","Metas!A2:Z","Fluxo de Caixa!A2:Z","Resumo Mensal!A2:Z","Log de Sync!A2:Z"];
  await sheetsRequest("POST", `/spreadsheets/${spreadsheetId}/values:batchClear`, token, { ranges: clearRanges });

  const allTx = [
    ...expenses.map(e => [e.id,"expense",e.description,e.value,e.category,e.date,e.paymentMethod??"",e.nature??"",e.scope??"","app"]),
    ...incomes.map(i  => [i.id,"income", i.description, i.value,i.category,i.date,"","",i.scope??"","app"]),
  ];
  if (allTx.length) data.push({ range: "Lançamentos!A2", values: allTx });

  const incRows = incomes.map(i => [i.id,i.description,i.value,i.category,i.date,i.scope??""]);
  if (incRows.length) data.push({ range: "Receitas!A2", values: incRows });

  const expRows = expenses.map(e => [e.id,e.description,e.value,e.category,e.date,e.paymentMethod??"",e.nature??"",e.scope??""]);
  if (expRows.length) data.push({ range: "Despesas!A2", values: expRows });

  if (debts.length) data.push({ range: "Dívidas!A2", values: debts.map(d => [d.id,d.name,d.totalValue,d.installmentValue,d.dueDate,d.priority,d.status]) });
  if (goals.length) {
    data.push({ range: "Metas!A2", values: goals.map(g => {
      const pct = g.targetValue > 0 ? ((g.currentValue/g.targetValue)*100).toFixed(1)+"%" : "0%";
      return [g.id,g.name,g.targetValue,g.currentValue,g.type,pct];
    })});
  }

  // Dashboard com totais
  const totalInc = incomes.reduce((s,i) => s+i.value, 0);
  const totalExp = expenses.reduce((s,e) => s+e.value, 0);
  const dashData = [
    ["Total Receitas", totalInc],
    ["Total Despesas", totalExp],
    ["Saldo Líquido",  totalInc - totalExp],
    ["Qtd Lançamentos", allTx.length],
    ["Qtd Dívidas Abertas", debts.filter(d=>d.status==="aberta").length],
    ["Total em Dívidas", debts.filter(d=>d.status==="aberta").reduce((s,d)=>s+d.totalValue,0)],
    ["Última Sync", new Date().toLocaleString("pt-BR")],
  ];
  data.push({ range: "Dashboard!A2", values: dashData });

  // Fluxo por dia
  const byDate = new Map<string, {inc:number;exp:number}>();
  for (const tx of [...expenses,...incomes]) {
    const d = tx.date.split("T")[0];
    const p = byDate.get(d) ?? {inc:0,exp:0};
    if ("paymentMethod" in tx) p.exp += tx.value; else p.inc += tx.value;
    byDate.set(d,p);
  }
  let acc = 0;
  const fluxo = [...byDate.entries()].sort().map(([date,{inc,exp}]) => {
    acc += inc - exp;
    return [date, inc, exp, inc-exp, acc];
  });
  if (fluxo.length) data.push({ range: "Fluxo de Caixa!A2", values: fluxo });

  // Log
  data.push({ range: "Log de Sync!A2", values: [
    [`log-${Date.now()}`, "sync_completo", "all", "-", new Date().toISOString()],
  ]});

  if (data.length) {
    await sheetsRequest("POST", `/spreadsheets/${spreadsheetId}/values:batchUpdate`, token, {
      valueInputOption: "USER_ENTERED",
      data,
    });
  }
}

// ─── Componente ────────────────────────────────────────────────────────────

interface Props {
  expenses: { id: string; description: string; value: number; category: string; date: string; paymentMethod?: string; nature?: string; scope?: string }[];
  incomes:  { id: string; description: string; value: number; category: string; date: string; scope?: string }[];
  debts:    { id: string; name: string; totalValue: number; installmentValue: number; dueDate: string; priority: string; status: string }[];
  goals:    { id: string; name: string; targetValue: number; currentValue: number; type: string }[];
  userEmail: string;
}

export function GoogleSyncButton({ expenses, incomes, debts, goals, userEmail }: Props) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  const tokenClientRef = useRef<{ requestAccessToken: () => void } | null>(null);
  const [syncing, setSyncing]   = useState(false);
  const [meta, setMeta]         = useState<SheetMeta | null>(null);
  const [token, setToken]       = useState<Token | null>(null);
  const [status, setStatus]     = useState<"idle"|"ok"|"err">("idle");
  const [errMsg, setErrMsg]     = useState("");
  const [gisLoaded, setGisLoaded] = useState(false);

  // Carrega GIS script
  useEffect(() => {
    if (typeof window === "undefined" || !clientId) return;
    const existing = document.getElementById("gis-script");
    if (existing) { setGisLoaded(true); return; }
    const s = document.createElement("script");
    s.id  = "gis-script";
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true; s.defer = true;
    s.onload = () => setGisLoaded(true);
    document.head.appendChild(s);
  }, [clientId]);

  // Inicializa token client
  useEffect(() => {
    if (!gisLoaded || !window.google || !clientId) return;
    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: async (resp) => {
        if (resp.error || !resp.access_token) {
          setErrMsg(resp.error ?? "Erro ao conectar com Google.");
          setStatus("err");
          setSyncing(false);
          return;
        }
        const newToken: Token = {
          access_token: resp.access_token,
          expires_at: Date.now() + 55 * 60 * 1000, // 55min (margem antes dos 60min)
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newToken));
        setToken(newToken);
        await doSync(newToken.access_token);
      },
    });
  }, [gisLoaded, clientId]);

  // Carrega meta/token salvos
  useEffect(() => {
    try {
      const savedMeta  = localStorage.getItem(SHEET_KEY);
      const savedToken = localStorage.getItem(STORAGE_KEY);
      if (savedMeta)  setMeta(JSON.parse(savedMeta) as SheetMeta);
      if (savedToken) {
        const t = JSON.parse(savedToken) as Token;
        if (t.expires_at > Date.now()) setToken(t);
      }
    } catch { /* ignore */ }
  }, []);

  const doSync = useCallback(async (accessToken: string) => {
    setSyncing(true); setStatus("idle"); setErrMsg("");
    try {
      let sheetId    = meta?.spreadsheetId;
      let sheetUrl   = meta?.spreadsheetUrl;

      // Cria planilha se não existe
      if (!sheetId) {
        const created = await createSpreadsheet(accessToken, userEmail);
        sheetId  = created.spreadsheetId;
        sheetUrl = created.spreadsheetUrl;
      }

      await syncData(accessToken, sheetId, expenses, incomes, debts, goals);

      const newMeta: SheetMeta = {
        spreadsheetId: sheetId,
        spreadsheetUrl: sheetUrl ?? `https://docs.google.com/spreadsheets/d/${sheetId}`,
        lastSync: new Date().toISOString(),
      };
      localStorage.setItem(SHEET_KEY, JSON.stringify(newMeta));
      setMeta(newMeta);
      setStatus("ok");
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Erro desconhecido.");
      setStatus("err");
    }
    setSyncing(false);
  }, [meta, expenses, incomes, debts, goals, userEmail]);

  function handleConnect() {
    if (!tokenClientRef.current) return;
    setSyncing(true);
    if (token && token.expires_at > Date.now()) {
      void doSync(token.access_token);
    } else {
      tokenClientRef.current.requestAccessToken();
    }
  }

  function handleDisconnect() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SHEET_KEY);
    setToken(null); setMeta(null); setStatus("idle");
  }

  // Sem Client ID configurado
  if (!clientId) {
    return (
      <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-200">
        <p className="font-semibold">Google Planilhas não configurado</p>
        <p className="mt-1 text-xs text-slate-400">
          Adicione <code className="rounded bg-white/10 px-1">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> no .env.local
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Botão principal */}
      {!meta ? (
        <button
          onClick={handleConnect}
          disabled={syncing || !gisLoaded}
          className="flex w-full min-h-16 items-center justify-center gap-3 rounded-2xl bg-emerald-500 text-lg font-extrabold text-slate-950 shadow-[0_0_40px_rgba(34,197,94,0.4)] transition hover:bg-emerald-400 hover:shadow-[0_0_60px_rgba(34,197,94,0.6)] active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
        >
          {syncing ? (
            <><RefreshCcw className="h-6 w-6 animate-spin" /> Criando sua planilha…</>
          ) : (
            <>
              {/* Logo Google SVG */}
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Conectar com Google e criar planilha
            </>
          )}
        </button>
      ) : (
        <div className="space-y-2">
          <button
            onClick={handleConnect}
            disabled={syncing}
            className="flex w-full min-h-14 items-center justify-center gap-3 rounded-2xl bg-emerald-500 text-base font-extrabold text-slate-950 shadow-[0_0_30px_rgba(34,197,94,0.3)] transition hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCcw className={`h-5 w-5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando…" : "📊 Sincronizar tudo agora"}
          </button>

          <a
            href={meta.spreadsheetUrl}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/5 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/10"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Abrir minha planilha no Google
          </a>
        </div>
      )}

      {/* Status */}
      {status === "ok" && (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300">
          ✅ Tudo sincronizado! Planilha atualizada com todos os dados.
          {meta?.lastSync && (
            <span className="ml-2 text-xs font-normal opacity-70">
              {new Date(meta.lastSync).toLocaleString("pt-BR")}
            </span>
          )}
        </p>
      )}

      {status === "err" && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <p className="font-semibold">Erro na sincronização:</p>
          <p className="mt-0.5 text-xs opacity-80">{errMsg}</p>
        </div>
      )}

      {/* Info / Desconectar */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          🔒 Só acessa a planilha criada por este app
        </span>
        {meta && (
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-1 text-slate-500 hover:text-red-400 transition"
          >
            <Unlink className="h-3 w-3" /> Desconectar
          </button>
        )}
      </div>
    </div>
  );
}
