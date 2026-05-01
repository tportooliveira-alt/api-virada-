"use client";

import { PropsWithChildren, useEffect, useRef, useState } from "react";

// ─── Tipos Google Identity Services ──────────────────────────────────────────
declare global {
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
        oauth2: {
          initTokenClient: (cfg: {
            client_id: string;
            scope: string;
            callback: (r: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

// ─── Chaves do localStorage ───────────────────────────────────────────────────
const ACCOUNT_KEY = "virada-account-v1";
const SESSION_KEY = "virada-session-v1";

interface Account {
  name: string;
  email: string;
  passwordHash?: string;
  provider: "local" | "google";
  createdAt: string;
}

// ─── Crypto (SHA-256 nativo do browser, sem dependências) ─────────────────────
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Decodificar JWT do Google (sem verificar assinatura — apenas extrair payload) ─
function decodeJWT(token: string): { name?: string; email?: string; picture?: string } {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64)) as { name?: string; email?: string };
  } catch { return {}; }
}

// ─── Helpers de armazenamento ─────────────────────────────────────────────────
function getAccount(): Account | null {
  try { return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "null") as Account | null; }
  catch { return null; }
}
function saveAccount(a: Account) { localStorage.setItem(ACCOUNT_KEY, JSON.stringify(a)); }
function getSession(): boolean { return localStorage.getItem(SESSION_KEY) === "true"; }
function saveSession() { localStorage.setItem(SESSION_KEY, "true"); }
export function clearSession() { localStorage.removeItem(SESSION_KEY); }

// ─── Campo de input reutilizável ──────────────────────────────────────────────
function Field({
  label, type = "text", placeholder, value, onChange, error,
}: {
  label: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void; error?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold text-slate-400">{label}</span>
      <input
        type={type} placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded-xl border px-4 py-3.5 text-sm text-white outline-none transition ${
          error ? "border-red-500/50 bg-red-500/10"
                : "border-white/[0.08] bg-white/5 focus:border-emerald-500/50"
        }`}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </label>
  );
}

// ─── Botão Google SVG ─────────────────────────────────────────────────────────
function GoogleBtn({ onClick, loading, label }: { onClick: () => void; loading: boolean; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
      ) : (
        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      )}
      {label}
    </button>
  );
}

// ─── AuthGate principal ───────────────────────────────────────────────────────
export function AuthGate({ children }: PropsWithChildren) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

  const [status, setStatus]       = useState<"loading"|"cadastro"|"login"|"logado">("loading");
  const [tab, setTab]             = useState<"google"|"email">("google");
  const [loading, setLoading]     = useState(false);
  const [globalError, setGlobalError] = useState("");
  const gisRef = useRef(false);

  // Campos cadastro
  const [cNome, setCNome]     = useState("");
  const [cEmail, setCEmail]   = useState("");
  const [cSenha, setCSenha]   = useState("");
  const [cConf, setCConf]     = useState("");
  const [erros, setErros]     = useState<Record<string,string>>({});

  // Campos login
  const [lEmail, setLEmail] = useState("");
  const [lSenha, setLSenha] = useState("");

  // Estado inicial
  useEffect(() => {
    const acc = getAccount();
    if (!acc) { setStatus("cadastro"); return; }
    if (getSession()) { setStatus("logado"); return; }
    setStatus("login");
  }, []);

  // Carregar Google Identity Services
  useEffect(() => {
    if (gisRef.current || !clientId || typeof window === "undefined") return;
    const existing = document.getElementById("gis-script");
    if (existing) { gisRef.current = true; return; }
    const s = document.createElement("script");
    s.id = "gis-script";
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true; s.defer = true;
    s.onload = () => { gisRef.current = true; };
    document.head.appendChild(s);
  }, [clientId]);

  // ── Login com Google ────────────────────────────────────────────────────────
  function handleGoogleLogin() {
    if (!clientId || !window.google) {
      setGlobalError("Google não configurado. Use email e senha.");
      return;
    }
    setLoading(true);
    setGlobalError("");
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        const payload = decodeJWT(response.credential);
        if (!payload.email) {
          setGlobalError("Não foi possível obter os dados do Google.");
          setLoading(false);
          return;
        }
        const acc: Account = {
          name: payload.name ?? payload.email,
          email: payload.email,
          provider: "google",
          createdAt: new Date().toISOString(),
        };
        saveAccount(acc);
        saveSession();
        setStatus("logado");
        setLoading(false);
      },
    });
    window.google.accounts.id.prompt();
    // Timeout se o popup não aparecer
    setTimeout(() => { if (loading) setLoading(false); }, 10000);
  }

  // ── Cadastro manual ─────────────────────────────────────────────────────────
  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError("");
    const errs: Record<string,string> = {};
    if (!cNome.trim()) errs.nome = "Informe seu nome.";
    if (!cEmail.includes("@")) errs.email = "Email inválido.";
    if (cSenha.length < 6) errs.senha = "Mínimo 6 caracteres.";
    if (cSenha !== cConf) errs.conf = "Senhas não coincidem.";
    if (Object.keys(errs).length) { setErros(errs); return; }
    setLoading(true);
    const hash = await sha256(cSenha.trim());
    saveAccount({ name: cNome.trim(), email: cEmail.trim().toLowerCase(), passwordHash: hash, provider: "local", createdAt: new Date().toISOString() });
    saveSession();
    setStatus("logado");
    setLoading(false);
  }

  // ── Login manual ────────────────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError("");
    if (!lEmail.trim() || !lSenha.trim()) { setGlobalError("Preencha email e senha."); return; }
    setLoading(true);
    const acc = getAccount();
    const hash = await sha256(lSenha.trim());
    if (acc && acc.email === lEmail.trim().toLowerCase() && acc.passwordHash === hash) {
      saveSession(); setStatus("logado");
    } else {
      setGlobalError("Email ou senha incorretos.");
    }
    setLoading(false);
  }

  if (status === "loading") return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
    </div>
  );

  if (status === "logado") return <>{children}</>;

  const account = getAccount();
  const firstName = account?.name?.split(" ")[0];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-5 py-10">

      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 shadow-[0_0_40px_rgba(34,197,94,0.35)]">
          <span className="text-3xl">💰</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Virada App</h1>
        <p className="text-sm text-slate-500">Fluxo de caixa no celular</p>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">

        {/* Título */}
        {status === "cadastro" ? (
          <>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Primeira vez</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Crie sua conta</h2>
            <p className="mt-1 mb-5 text-sm text-slate-500">Gratuito. Seus dados ficam só no celular.</p>
          </>
        ) : (
          <>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Bem-vindo de volta</p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              {firstName ? `Olá, ${firstName} 👋` : "Entre na sua conta"}
            </h2>
            <p className="mt-1 mb-5 text-sm text-slate-500">Seus dados continuam salvos aqui.</p>
          </>
        )}

        {/* Botão Google — destaque principal */}
        {clientId && (
          <div className="mb-4 space-y-3">
            <GoogleBtn
              onClick={handleGoogleLogin}
              loading={loading && tab === "google"}
              label={status === "cadastro" ? "Cadastrar com Google" : "Entrar com Google"}
            />
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-slate-600">ou use email e senha</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
          </div>
        )}

        {/* Erro global */}
        {globalError && (
          <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
            {globalError}
          </p>
        )}

        {/* ── CADASTRO com email ───────────────────────────────────── */}
        {status === "cadastro" && (
          <form onSubmit={handleCadastro} className="space-y-3">
            <Field label="Nome completo" placeholder="Seu nome" value={cNome} onChange={setCNome} error={erros.nome} />
            <Field label="Email" type="email" placeholder="seu@email.com" value={cEmail} onChange={setCEmail} error={erros.email} />
            <Field label="Senha" type="password" placeholder="Mínimo 6 caracteres" value={cSenha} onChange={setCSenha} error={erros.senha} />
            <Field label="Confirmar senha" type="password" placeholder="Repita a senha" value={cConf} onChange={setCConf} error={erros.conf} />
            <button
              type="submit" disabled={loading}
              className="mt-1 flex w-full items-center justify-center rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" /> : "Criar conta"}
            </button>
          </form>
        )}

        {/* ── LOGIN com email ──────────────────────────────────────── */}
        {status === "login" && (
          <>
            {/* Se conta Google, mostrar apenas botão */}
            {account?.provider === "google" ? (
              <p className="text-center text-sm text-slate-500">Use o botão Google acima para entrar.</p>
            ) : (
              <form onSubmit={handleLogin} className="space-y-3">
                <Field label="Email" type="email" placeholder="seu@email.com" value={lEmail} onChange={setLEmail} />
                <Field label="Senha" type="password" placeholder="Sua senha" value={lSenha} onChange={setLSenha} />
                <button
                  type="submit" disabled={loading}
                  className="mt-1 flex w-full items-center justify-center rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" /> : "Entrar"}
                </button>
              </form>
            )}

            <button
              onClick={() => {
                clearSession();
                localStorage.removeItem(ACCOUNT_KEY);
                setStatus("cadastro");
                setErros({});
              }}
              className="mt-4 w-full text-center text-xs text-slate-600 hover:text-slate-400 transition"
            >
              Trocar de conta
            </button>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-slate-700">
        Dados guardados apenas neste celular · Virada App
      </p>
    </div>
  );
}

// ─── Utilitários exportados ───────────────────────────────────────────────────
export function getLocalUser() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "null") as Account | null; }
  catch { return null; }
}

export function logOut() {
  clearSession();
  window.location.reload();
}
