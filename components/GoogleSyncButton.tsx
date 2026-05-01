"use client";

/**
 * GoogleSyncButton — exporta planilha profissional pra conta Google do usuário.
 *
 * Fluxo (1 clique):
 *  1. Usuário clica "Exportar minha planilha"
 *  2. Popup OAuth do Google → "Permitir"
 *  3. App cria/atualiza planilha NO DRIVE DO USUÁRIO com:
 *     • Banner navy/dourado igual ao app
 *     • 4 KPI cards + 4 gráficos
 *     • Formatos BRL, datas, percentuais, zebra, condicionais
 *     • Tudo travado read-only
 *  4. Botão "Abrir no Google Planilhas" aparece — pronto.
 *
 * Sem service account, sem .env do server, sem upload manual. Token vive
 * no localStorage por 55 min (re-auth silencioso depois).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, RefreshCcw, Unlink } from "lucide-react";
import {
  buildChartRequests,
  buildLayoutRequests,
  buildSheetSpecs,
  buildStaticValues,
  buildSyncBatch,
  type SyncInput,
} from "@/lib/sheets/builder";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");

const STORAGE_KEY = "virada_google_token";
const SHEET_KEY = "virada_sheet_meta";

interface SheetMeta {
  spreadsheetId: string;
  spreadsheetUrl: string;
  lastSync: string;
}

interface Token {
  access_token: string;
  expires_at: number;
}

type OAuth2InitTokenClient = (cfg: {
  client_id: string;
  scope: string;
  callback: (resp: { error?: string; access_token?: string }) => void;
}) => { requestAccessToken: () => void };

function getInitTokenClient(): OAuth2InitTokenClient | null {
  const g = (window as unknown as { google?: { accounts?: { oauth2?: { initTokenClient?: OAuth2InitTokenClient } } } }).google;
  return g?.accounts?.oauth2?.initTokenClient ?? null;
}

async function googleFetch(method: string, endpoint: string, token: string, body?: unknown): Promise<unknown> {
  const url = endpoint.startsWith("http") ? endpoint : `https://sheets.googleapis.com/v4${endpoint}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

interface CreateResp {
  spreadsheetId: string;
  sheets?: { properties?: { title?: string; sheetId?: number } }[];
}

async function createWorkbook(token: string, email: string): Promise<{ spreadsheetId: string; spreadsheetUrl: string; ids: Record<string, number> }> {
  const created = (await googleFetch("POST", "/spreadsheets", token, {
    properties: { title: `Virada Financeira — ${email}`, locale: "pt_BR", timeZone: "America/Sao_Paulo" },
    sheets: buildSheetSpecs(),
  })) as CreateResp;

  const ids: Record<string, number> = {};
  for (const s of created.sheets ?? []) {
    if (s.properties?.title && typeof s.properties.sheetId === "number") {
      ids[s.properties.title] = s.properties.sheetId;
    }
  }

  // Layout: banner, kpi, formatos, proteção, ajuda
  await googleFetch("POST", `/spreadsheets/${created.spreadsheetId}:batchUpdate`, token, {
    requests: buildLayoutRequests(ids),
  });

  // Conteúdo estático: cabeçalhos, banner, ajuda
  await googleFetch("POST", `/spreadsheets/${created.spreadsheetId}/values:batchUpdate`, token, {
    valueInputOption: "USER_ENTERED",
    data: buildStaticValues(),
  });

  // Gráficos
  await googleFetch("POST", `/spreadsheets/${created.spreadsheetId}:batchUpdate`, token, {
    requests: buildChartRequests(ids),
  });

  return {
    spreadsheetId: created.spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${created.spreadsheetId}`,
    ids,
  };
}

async function pushData(token: string, spreadsheetId: string, input: SyncInput): Promise<void> {
  const batch = buildSyncBatch(input);
  if (batch.clearRanges.length) {
    await googleFetch("POST", `/spreadsheets/${spreadsheetId}/values:batchClear`, token, {
      ranges: batch.clearRanges,
    });
  }
  if (batch.valueRanges.length) {
    await googleFetch("POST", `/spreadsheets/${spreadsheetId}/values:batchUpdate`, token, {
      valueInputOption: "USER_ENTERED",
      data: batch.valueRanges,
    });
  }
}

interface Props {
  expenses: SyncInput["expenses"];
  incomes: SyncInput["incomes"];
  debts: SyncInput["debts"];
  goals: SyncInput["goals"];
  userEmail: string;
}

export function GoogleSyncButton({ expenses, incomes, debts, goals, userEmail }: Props) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  const tokenClientRef = useRef<{ requestAccessToken: () => void } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [meta, setMeta] = useState<SheetMeta | null>(null);
  const [token, setToken] = useState<Token | null>(null);
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [errMsg, setErrMsg] = useState("");
  const [gisLoaded, setGisLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !clientId) return;
    if (document.getElementById("gis-script")) {
      setGisLoaded(true);
      return;
    }
    const s = document.createElement("script");
    s.id = "gis-script";
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => setGisLoaded(true);
    document.head.appendChild(s);
  }, [clientId]);

  useEffect(() => {
    try {
      const savedMeta = localStorage.getItem(SHEET_KEY);
      const savedToken = localStorage.getItem(STORAGE_KEY);
      if (savedMeta) setMeta(JSON.parse(savedMeta) as SheetMeta);
      if (savedToken) {
        const t = JSON.parse(savedToken) as Token;
        if (t.expires_at > Date.now()) setToken(t);
      }
    } catch { /* ignore */ }
  }, []);

  const doSync = useCallback(async (accessToken: string) => {
    setSyncing(true);
    setStatus("idle");
    setErrMsg("");
    try {
      let sheetId = meta?.spreadsheetId;
      let sheetUrl = meta?.spreadsheetUrl;
      if (!sheetId) {
        const created = await createWorkbook(accessToken, userEmail);
        sheetId = created.spreadsheetId;
        sheetUrl = created.spreadsheetUrl;
      }
      await pushData(accessToken, sheetId, { expenses, incomes, debts, goals });
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

  useEffect(() => {
    const init = getInitTokenClient();
    if (!gisLoaded || !init || !clientId) return;
    tokenClientRef.current = init({
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
          expires_at: Date.now() + 55 * 60 * 1000,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newToken));
        setToken(newToken);
        await doSync(newToken.access_token);
      },
    });
  }, [gisLoaded, clientId, doSync]);

  function handleConnect() {
    if (!tokenClientRef.current) return;
    setSyncing(true);
    if (token && token.expires_at > Date.now()) void doSync(token.access_token);
    else tokenClientRef.current.requestAccessToken();
  }

  function handleDisconnect() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SHEET_KEY);
    setToken(null);
    setMeta(null);
    setStatus("idle");
  }

  if (!clientId) {
    return (
      <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-200">
        <p className="font-semibold">Exportação para Google Planilhas indisponível</p>
        <p className="mt-1 text-xs text-slate-400">
          Configure <code className="rounded bg-white/10 px-1">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> no .env.local
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Exportar minha planilha
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
            {syncing ? "Atualizando planilha…" : "Atualizar minha planilha"}
          </button>
          <a
            href={meta.spreadsheetUrl}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/5 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/10"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir no Google Planilhas
          </a>
        </div>
      )}

      {status === "ok" && (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300">
          Planilha atualizada.
          {meta?.lastSync && (
            <span className="ml-2 text-xs font-normal opacity-70">
              {new Date(meta.lastSync).toLocaleString("pt-BR")}
            </span>
          )}
        </p>
      )}

      {status === "err" && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <p className="font-semibold">Não consegui exportar:</p>
          <p className="mt-0.5 text-xs opacity-80">{errMsg}</p>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>A planilha fica na sua conta Google. Só este app acessa.</span>
        {meta && (
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-1 text-slate-500 transition hover:text-red-400"
          >
            <Unlink className="h-3 w-3" /> Desconectar
          </button>
        )}
      </div>
    </div>
  );
}
