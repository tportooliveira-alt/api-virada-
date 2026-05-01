"use client";

/**
 * AuthGate — único portão do app.
 *
 * Fluxo:
 *  1) Usuário toca "Entrar com Google"
 *  2) Google devolve um ID token (JWT)
 *  3) /api/access/check valida o token e diz se o email é comprador (lista Hotmart)
 *  4) Status fica salvo no IndexedDB:
 *       { email, sub, status: "ativo"|"inativo", checkedAt }
 *  5) Próximas aberturas:
 *       • online → revalida e atualiza o status
 *       • offline + status "ativo" + sub bate → libera
 *       • offline + status "inativo" → pede pra conectar
 *
 * Não existe email/senha. Não existe código de ativação. O e-mail Google
 * é a chave: comprou com aquele e-mail → entra com aquele e-mail.
 */

import { PropsWithChildren, useCallback, useEffect, useRef, useState } from "react";

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (el: HTMLElement, cfg: object) => void;
          prompt: () => void;
          cancel: () => void;
        };
      };
    };
  }
}

const STORAGE_KEY = "virada_access_v2";

interface AccessRecord {
  email: string;
  sub: string;
  name: string;
  picture: string | null;
  status: "ativo" | "inativo";
  checkedAt: string;
}

function loadAccess(): AccessRecord | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as AccessRecord | null;
  } catch {
    return null;
  }
}

function saveAccess(r: AccessRecord) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
}

function clearAccess() {
  localStorage.removeItem(STORAGE_KEY);
}

export function logOut() {
  clearAccess();
  if (typeof window !== "undefined") window.location.reload();
}

export function getLocalUser(): AccessRecord | null {
  return loadAccess();
}

type Stage =
  | "loading"
  | "needs-login"
  | "checking"
  | "needs-online"
  | "not-member"
  | "ok";

export function AuthGate({ children }: PropsWithChildren) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

  const [stage, setStage] = useState<Stage>("loading");
  const [access, setAccess] = useState<AccessRecord | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const gisLoaded = useRef(false);

  const handleCredential = useCallback(async (credential: string) => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/access/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as Omit<AccessRecord, "checkedAt">;
      const record: AccessRecord = { ...data, checkedAt: new Date().toISOString() };
      saveAccess(record);
      setAccess(record);
      setStage(record.status === "ativo" ? "ok" : "not-member");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao validar acesso.");
      setStage("needs-login");
    } finally {
      setSubmitting(false);
    }
  }, []);

  // Dev bypass — só aparece em localhost quando não há Client ID configurado
  function handleDevLogin() {
    const record: AccessRecord = {
      email: "dev@localhost",
      sub: "dev-local",
      name: "Dev Local",
      picture: null,
      status: "ativo",
      checkedAt: new Date().toISOString(),
    };
    saveAccess(record);
    setAccess(record);
    setStage("ok");
  }

  // Carrega Google Identity Services + revalida sessão
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = loadAccess();
    setAccess(stored);

    // Sem internet?
    if (!navigator.onLine) {
      if (stored?.status === "ativo") setStage("ok");
      else if (stored?.status === "inativo") setStage("needs-online");
      else setStage("needs-online");
      return;
    }

    // Sem login ainda
    if (!stored) {
      setStage("needs-login");
      loadGisScript();
      return;
    }

    // Já logado: confia por enquanto, revalida em background
    setStage(stored.status === "ativo" ? "ok" : "not-member");
    loadGisScript();
  }, []);

  function loadGisScript() {
    if (gisLoaded.current) return;
    if (document.getElementById("gis-script")) {
      gisLoaded.current = true;
      return;
    }
    const s = document.createElement("script");
    s.id = "gis-script";
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => {
      gisLoaded.current = true;
    };
    document.head.appendChild(s);
  }

  function handleSignIn() {
    if (!clientId) {
      setError("NEXT_PUBLIC_GOOGLE_CLIENT_ID não está configurado.");
      return;
    }
    if (!window.google?.accounts?.id) {
      setError("Aguarde, carregando login Google…");
      loadGisScript();
      return;
    }
    setError("");
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        void handleCredential(response.credential);
      },
    });
    window.google.accounts.id.prompt();
  }

  // ─── UIs ──────────────────────────────────────────────────────────────────

  if (stage === "ok") return <>{children}</>;

  if (stage === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-virada-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-virada-green border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-virada-bg px-5 py-10">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-virada-green shadow-[0_0_40px_rgba(34,197,94,0.35)]">
          <span className="text-3xl">💰</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Código da Virada</h1>
        <p className="text-sm text-slate-500">Seu controle financeiro inteligente</p>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        {stage === "needs-login" && (
          <NeedsLogin
            submitting={submitting}
            error={error}
            clientId={clientId}
            onSignIn={handleSignIn}
            onDevLogin={handleDevLogin}
          />
        )}

        {stage === "checking" && (
          <p className="text-center text-sm text-slate-400">Validando acesso…</p>
        )}

        {stage === "needs-online" && (
          <NeedsOnline
            email={access?.email}
            onRetry={() => {
              setStage("loading");
              window.location.reload();
            }}
          />
        )}

        {stage === "not-member" && (
          <NotMember
            email={access?.email ?? ""}
            onSwitch={() => {
              clearAccess();
              setAccess(null);
              setStage("needs-login");
            }}
          />
        )}
      </div>

      <p className="mt-6 text-center text-xs text-slate-700">
        Seus dados ficam neste celular · Código da Virada
      </p>
    </div>
  );
}

function NeedsLogin({
  submitting,
  error,
  clientId,
  onSignIn,
  onDevLogin,
}: {
  submitting: boolean;
  error: string;
  clientId: string;
  onSignIn: () => void;
  onDevLogin: () => void;
}) {
  return (
    <>
      <p className="text-xs font-bold uppercase tracking-widest text-virada-gold">Acesse com sua conta Google</p>
      <h2 className="mt-1 text-xl font-semibold text-white">Entre em 1 clique</h2>
      <p className="mt-1 mb-5 text-sm text-slate-500">
        Use o mesmo e-mail que você usou na compra. É só apertar e pronto.
      </p>

      {!clientId && (
        <p className="mb-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-200">
          Login Google não configurado. Defina <code className="rounded bg-white/10 px-1">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> no servidor.
        </p>
      )}

      <button
        type="button"
        onClick={onSignIn}
        disabled={submitting || !clientId}
        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white py-3.5 text-sm font-bold text-slate-900 transition hover:bg-slate-100 disabled:opacity-50"
      >
        {submitting ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
        ) : (
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
        )}
        Entrar com Google
      </button>

      {error && (
        <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {error}
        </p>
      )}

      <p className="mt-5 text-center text-xs text-slate-500">
        Ainda não comprou? <a href="https://hotmart.com" className="text-virada-gold hover:underline" target="_blank" rel="noreferrer">Compre agora</a>.
      </p>

      {/* Botão dev — aparece APENAS em localhost, invisível em produção */}
      {typeof window !== "undefined" && window.location.hostname === "localhost" && (
        <button
          type="button"
          onClick={onDevLogin}
          className="mt-4 w-full rounded-xl border border-dashed border-slate-700 py-2.5 text-xs text-slate-600 transition hover:border-slate-500 hover:text-slate-400"
        >
          ⚙ Entrar como Dev (localhost)
        </button>
      )}
    </>
  );
}

function NotMember({ email, onSwitch }: { email: string; onSwitch: () => void }) {
  return (
    <>
      <p className="text-xs font-bold uppercase tracking-widest text-amber-300">Conta não encontrada na lista</p>
      <h2 className="mt-1 text-xl font-semibold text-white">Comprou com outro e-mail?</h2>
      <p className="mt-1 mb-5 text-sm text-slate-400">
        Você entrou como <span className="font-semibold text-white">{email}</span>, mas esse e-mail não aparece como comprador.
        Verifique no seu recibo da Hotmart com qual e-mail a compra foi feita.
      </p>
      <button
        type="button"
        onClick={onSwitch}
        className="flex w-full items-center justify-center rounded-xl border border-virada-green/40 bg-virada-green/10 py-3 text-sm font-semibold text-virada-green transition hover:bg-virada-green/20"
      >
        Tentar com outra conta Google
      </button>
      <p className="mt-4 text-center text-xs text-slate-500">
        Comprou agora? Pode levar 1-2 min até o pagamento aparecer aqui.
      </p>
    </>
  );
}

function NeedsOnline({ email, onRetry }: { email?: string; onRetry: () => void }) {
  return (
    <>
      <p className="text-xs font-bold uppercase tracking-widest text-amber-300">Sem internet</p>
      <h2 className="mt-1 text-xl font-semibold text-white">Conecte uma vez para validar</h2>
      <p className="mt-1 mb-5 text-sm text-slate-400">
        {email ? `Você entrou como ${email}, mas precisa de internet uma vez para confirmar a compra.` : "Conecte-se à internet uma vez para entrar."}
        <br />
        Depois disso, o app funciona offline.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="flex w-full items-center justify-center rounded-xl bg-virada-green py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
      >
        Tentar de novo
      </button>
    </>
  );
}
