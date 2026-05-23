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
import { ExternalLink, Palette, RefreshCcw, Unlink } from "lucide-react";
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

// Margem de seguranca para considerar o token "quase expirado". Cria/atualizar
// planilha faz ate 4 chamadas HTTP — se o token tem menos de 5 minutos de vida,
// pedimos um novo ANTES de iniciar pra evitar 401 no meio da operacao.
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

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

/**
 * Apaga a planilha do Drive do usuário. 404 não é erro (já estava apagada).
 * Usa Drive API v3 — scope `drive.file` é suficiente pois só apaga arquivos
 * criados por este app.
 */
async function deleteSpreadsheet(token: string, spreadsheetId: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `HTTP ${res.status}`);
  }
}

function isNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : "";
  return msg.includes("not found") || msg.includes("404") || msg.includes("requested entity was not found");
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
  const oauthPopupTimeoutRef = useRef<number | null>(null);
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

  /**
   * Recriar planilha do zero — apaga a antiga no Drive e cria nova com
   * paleta + layout sempre corretos. Resolve o problema de planilhas
   * antigas que não atualizam estilos por causa de proteções/banding
   * já aplicados (substituiu o caminho idempotente `reapplyLayout`).
   */
  const doRecreate = useCallback(async (accessToken: string) => {
    setSyncing(true);
    setStatus("idle");
    setErrMsg("");
    try {
      if (meta?.spreadsheetId) {
        try {
          await deleteSpreadsheet(accessToken, meta.spreadsheetId);
        } catch (err) {
          // 404 já tratado dentro de deleteSpreadsheet. Outros erros: log e segue.
          if (!isNotFoundError(err)) {
            console.warn("Falha ao apagar planilha antiga:", err);
          }
        }
      }
      localStorage.removeItem(SHEET_KEY);
      const created = await createWorkbook(accessToken, userEmail);
      await pushData(accessToken, created.spreadsheetId, { expenses, incomes, debts, goals });
      const newMeta: SheetMeta = {
        spreadsheetId: created.spreadsheetId,
        spreadsheetUrl: created.spreadsheetUrl,
        lastSync: new Date().toISOString(),
      };
      localStorage.setItem(SHEET_KEY, JSON.stringify(newMeta));
      window.dispatchEvent(new Event("virada-sheet-meta-changed"));
      setMeta(newMeta);
      setStatus("ok");
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Erro desconhecido.");
      setStatus("err");
    }
    setSyncing(false);
  }, [meta, expenses, incomes, debts, goals, userEmail]);

  const doSync = useCallback(async (accessToken: string) => {
    setSyncing(true);
    setStatus("idle");
    setErrMsg("");

    const createFresh = async () => {
      const created = await createWorkbook(accessToken, userEmail);
      await pushData(accessToken, created.spreadsheetId, { expenses, incomes, debts, goals });
      return { spreadsheetId: created.spreadsheetId, spreadsheetUrl: created.spreadsheetUrl };
    };

    try {
      let target: { spreadsheetId: string; spreadsheetUrl: string };

      if (!meta?.spreadsheetId) {
        target = await createFresh();
      } else {
        try {
          await pushData(accessToken, meta.spreadsheetId, { expenses, incomes, debts, goals });
          target = {
            spreadsheetId: meta.spreadsheetId,
            spreadsheetUrl: meta.spreadsheetUrl ?? `https://docs.google.com/spreadsheets/d/${meta.spreadsheetId}`,
          };
        } catch (err) {
          if (!isNotFoundError(err)) throw err;
          // Planilha foi apagada do Drive manualmente — limpa meta e recria.
          localStorage.removeItem(SHEET_KEY);
          target = await createFresh();
        }
      }

      const newMeta: SheetMeta = {
        spreadsheetId: target.spreadsheetId,
        spreadsheetUrl: target.spreadsheetUrl,
        lastSync: new Date().toISOString(),
      };
      localStorage.setItem(SHEET_KEY, JSON.stringify(newMeta));
      window.dispatchEvent(new Event("virada-sheet-meta-changed"));
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
        if (oauthPopupTimeoutRef.current !== null) {
          window.clearTimeout(oauthPopupTimeoutRef.current);
          oauthPopupTimeoutRef.current = null;
        }
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
        await runAction(pendingActionRef.current, newToken.access_token);
      },
    });
  }, [gisLoaded, clientId, doSync, doRecreate]);

  const pendingActionRef = useRef<"sync" | "recreate">("sync");
  const [showRecreateConfirm, setShowRecreateConfirm] = useState(false);

  function runAction(action: "sync" | "recreate", accessToken: string) {
    if (action === "recreate") return doRecreate(accessToken);
    return doSync(accessToken);
  }

  function handleRecreateRequest() {
    if (!meta?.spreadsheetId) return;
    setShowRecreateConfirm(true);
  }

  function handleRecreateConfirm() {
    setShowRecreateConfirm(false);
    pendingActionRef.current = "recreate";
    triggerAuthAndRun();
  }

  function handleConnect() {
    pendingActionRef.current = "sync";
    triggerAuthAndRun();
  }

  function triggerAuthAndRun() {
    if (!tokenClientRef.current) {
      setStatus("err");
      setErrMsg("Login Google ainda não inicializou neste navegador. Aguarde 2 segundos e tente novamente.");

      // Tenta reanexar o script GIS caso tenha carregado parcialmente.
      const existing = document.getElementById("gis-script");
      if (existing) {
        existing.remove();
      }
      setGisLoaded(false);
      const s = document.createElement("script");
      s.id = "gis-script";
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.onload = () => setGisLoaded(true);
      document.head.appendChild(s);
      return;
    }

    setSyncing(true);
    // Token com menos de TOKEN_REFRESH_THRESHOLD_MS de vida e tratado como
    // "quase expirado": preferimos pedir um novo agora a arriscar 401 no meio
    // de createWorkbook (4 chamadas HTTP sequenciais).
    if (token && token.expires_at > Date.now() + TOKEN_REFRESH_THRESHOLD_MS) {
      void runAction(pendingActionRef.current, token.access_token);
    } else {
      // Em alguns navegadores o popup OAuth pode ser bloqueado sem callback.
      // Este timeout evita botão travado em estado "criando".
      if (oauthPopupTimeoutRef.current !== null) {
        window.clearTimeout(oauthPopupTimeoutRef.current);
      }
      oauthPopupTimeoutRef.current = window.setTimeout(() => {
        oauthPopupTimeoutRef.current = null;
        setSyncing(false);
        setStatus("err");
        setErrMsg("Não consegui abrir o popup do Google. Libere popups para este site e tente novamente.");
      }, 12000);

      tokenClientRef.current.requestAccessToken();
    }
  }

  function handleDisconnect() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SHEET_KEY);
    window.dispatchEvent(new Event("virada-sheet-meta-changed"));
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
            disabled={syncing || !gisLoaded}
            className="flex w-full min-h-14 items-center justify-center gap-3 rounded-2xl bg-emerald-500 text-base font-extrabold text-slate-950 shadow-[0_0_30px_rgba(34,197,94,0.3)] transition hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCcw className={`h-5 w-5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Atualizando planilha…" : "Atualizar minha planilha"}
          </button>
          {!showRecreateConfirm ? (
            <button
              onClick={handleRecreateRequest}
              disabled={syncing || !gisLoaded}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 py-3 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
              title={gisLoaded ? "Apaga a planilha antiga e cria uma nova com paleta e layout sempre corretos" : "Aguarde o login Google carregar..."}
            >
              <Palette className="h-4 w-4" />
              {gisLoaded ? "Recriar planilha (visual perfeito)" : "Aguardando login Google…"}
            </button>
          ) : (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="text-xs font-semibold text-amber-200">
                Isto apaga sua planilha antiga no Google Drive e cria uma nova com paleta e layout corretos. Os dados são sempre reenviados a partir do app.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={handleRecreateConfirm}
                  className="flex-1 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-400"
                >
                  Sim, recriar
                </button>
                <button
                  onClick={() => setShowRecreateConfirm(false)}
                  className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
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
