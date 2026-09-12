"use client";

/**
 * AuthGate — único portão do app.
 *
 * Fluxo:
 *  1) Usuário toca "Entrar com Google"
 *  2) Abre o popup OAuth na hora do clique (popup fora do gesto do usuário é
 *     bloqueado por Safari e Chrome — foi por isso que o One Tap saiu daqui)
 *  3) /api/access/check valida e diz se o email é comprador (lista de compradores)
 *
 * A lógica que dá pra provar sem navegador mora nas funções exportadas no topo
 * (isRotaPublica, criarTentativaDeLogin, promptDoLogin) e é testada por
 * scripts/test-authgate.ts. O resto é React puro.
 */

import { PropsWithChildren, useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { WHATSAPP_SUPORTE } from "@/lib/constants";

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
            use_fedcm_for_prompt?: boolean;
          }) => void;
          renderButton: (el: HTMLElement, cfg: object) => void;
          prompt: (momentListener?: (notification: {
            isNotDisplayed: () => boolean;
            isSkippedMoment: () => boolean;
            isDismissedMoment: () => boolean;
          }) => void) => void;
          cancel: () => void;
        };
        oauth2?: {
          initTokenClient: (cfg: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string; error_description?: string }) => void;
          }) => {
            requestAccessToken: (opts?: { prompt?: string }) => void;
          };
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

// ─── Regras que dá pra provar sem navegador (scripts/test-authgate.ts) ──────

/**
 * Páginas que precisam abrir SEM login.
 *
 * /obrigado é a mais importante: é pra lá que a Kiwify manda quem acabou de
 * pagar, e é lá que está o aviso "entre com o MESMO e-mail da compra". Se ela
 * nascer atrás da tela de login, o comprador bate numa parede logo depois de
 * pagar — que é exatamente a hora em que ele mais desconfia.
 *
 * "/" e "/vendas" só chegam aqui por teimosia: o next.config.mjs reescreve as
 * duas pra public/vendas.html, que é arquivo estático e nem passa pelo React.
 * Ficam na lista porque custam nada e evitam que uma mudança de rewrite derrube
 * a landing.
 */
export const ROTAS_PUBLICAS = ["/", "/vendas", "/obrigado"] as const;

/**
 * As páginas .html soltas em `public/` — servidas como arquivo estático, nunca
 * renderizadas por este componente. Estão aqui pra que a resposta desta função
 * case com a realidade de quem clica no link.
 *
 * A lista é EXPLÍCITA de propósito. Antes bastava terminar em ".html"
 * (`rota.endsWith(".html")`) e qualquer caminho passava — inclusive
 * "/app/inicio.html" e "/admin/membros.html". Hoje nenhuma rota do app termina
 * assim, então nada vazava; mas era uma porta aberta esperando alguém criar o
 * arquivo errado. `scripts/test-authgate.ts` compara esta lista com o conteúdo
 * real de `public/`: pôr um .html novo lá quebra o teste e obriga a decidir se
 * ele é público mesmo.
 */
export const ARQUIVOS_PUBLICOS = [
  "/vendas.html",
  "/politica-privacidade.html",
  "/termos-de-uso.html",
  "/planilha-preview.html",
] as const;

export function isRotaPublica(pathname: string | null | undefined): boolean {
  if (!pathname) return false; // sem saber onde estamos, protege
  // tira barra do fim e normaliza caixa: link digitado à mão vale igual
  const rota = (pathname.replace(/\/+$/, "") || "/").toLowerCase();
  if (ROTAS_PUBLICAS.includes(rota as (typeof ROTAS_PUBLICAS)[number])) return true;
  return ARQUIVOS_PUBLICOS.includes(rota as (typeof ARQUIVOS_PUBLICOS)[number]);
}

/** Mensagens que o comprador lê. Exportadas pro teste conferir qual apareceu. */
export const MSG_DEMORA =
  "A janela do Google está demorando. Se ela não abriu, o navegador pode ter bloqueado: libere as janelas pop-up para este site e toque de novo. Se ela abriu, é só terminar por lá que a gente entra sozinho.";
export const MSG_LOGIN_FALHOU =
  "Não deu para entrar com o Google agora. Toque em entrar de novo em alguns segundos.";
export const MSG_SEM_GOOGLE =
  "Não consegui abrir o login do Google neste navegador. Tente abrir o app no Chrome ou no Safari.";

export interface RespostaOAuth {
  access_token?: string;
  error?: string;
  error_description?: string;
}

export interface TentativaDeLoginDeps {
  setSubmitting: (v: boolean) => void;
  setError: (msg: string) => void;
  /** chamado uma única vez, quando o Google devolve um token bom */
  onToken: (accessToken: string) => void;
  /** timers injetados pra o teste rodar sem navegador */
  agendar: (fn: () => void, ms: number) => number;
  cancelar: (id: number) => void;
  esperaMs?: number;
}

/**
 * Uma tentativa de login pelo popup do Google.
 *
 * O cronômetro aqui serve pra UMA coisa só: destravar a interface se o Google
 * demorar, porque botão travado em "carregando" parece app quebrado. Ele NÃO
 * cancela a tentativa. Antes cancelava — e quem tem senha longa, verificação em
 * duas etapas ou celular lento terminava o login no Google e o app jogava fora
 * uma resposta legítima ("if (finished) return"). Agora a resposta que chega
 * atrasada vale do mesmo jeito e o aviso de demora some sozinho.
 *
 * Devolve o callback que vai ser entregue ao initTokenClient do Google.
 */
export function criarTentativaDeLogin(deps: TentativaDeLoginDeps): (r: RespostaOAuth) => void {
  const espera = deps.esperaMs ?? 12000;
  let respondido = false; // o Google às vezes chama o callback mais de uma vez

  const cronometro = deps.agendar(() => {
    if (respondido) return;
    deps.setSubmitting(false);
    deps.setError(MSG_DEMORA);
  }, espera);

  return (resposta: RespostaOAuth) => {
    if (respondido) return;
    respondido = true;
    deps.cancelar(cronometro);

    if (resposta.error || !resposta.access_token) {
      deps.setError(MSG_LOGIN_FALHOU);
      deps.setSubmitting(false);
      return;
    }

    deps.setError(""); // se o aviso de demora já tinha aparecido, apaga
    deps.setSubmitting(true); // volta pro "carregando" enquanto confere a compra
    deps.onToken(resposta.access_token);
  };
}

/**
 * Qual `prompt` mandar pro Google.
 *
 * NUNCA "consent": isso obrigava a tela de permissão a aparecer em TODO login,
 * inclusive pra quem já tinha autorizado — e tela de permissão repetida, pra
 * quem acabou de pagar, tem cara de golpe.
 *  - "" → reaproveita a autorização que já existe; o Google só pergunta quando
 *    realmente precisa.
 *  - "select_account" → só quando a pessoa disse "entrei com a conta errada".
 *    Sem isso ela ficaria presa na conta que o Google escolhe sozinho.
 */
export function promptDoLogin(trocandoDeConta: boolean): "" | "select_account" {
  return trocandoDeConta ? "select_account" : "";
}

// ─── Componente ─────────────────────────────────────────────────────────────

type Stage =
  | "loading"
  | "needs-login"
  | "checking"
  | "needs-online"
  | "not-member"
  | "ok";

export function AuthGate({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

  const [stage, setStage] = useState<Stage>("loading");
  const [access, setAccess] = useState<AccessRecord | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Ligado só quando a pessoa disse "entrei com a conta errada" — aí o próximo
  // login mostra o seletor de contas do Google (ver promptDoLogin).
  const [trocandoDeConta, setTrocandoDeConta] = useState(false);
  const gisLoaded = useRef(false);
  const idInitialized = useRef(false);

  const authenticate = useCallback(async (payload: { credential?: string; accessToken?: string }) => {
    setSubmitting(true);
    setError("");
    setStage("checking");
    try {
      const res = await fetch("/api/access/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const loadGisScript = useCallback(() => {
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
      if (window.google?.accounts?.id && !idInitialized.current && clientId) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          use_fedcm_for_prompt: false,
          callback: (response) => {
            void authenticate({ credential: response.credential });
          },
        });
        idInitialized.current = true;
      }
    };
    document.head.appendChild(s);
  }, [authenticate, clientId]);


  const startOAuthPopupFallback = useCallback((trocarDeConta: boolean) => {
    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2?.initTokenClient) {
      setError(MSG_SEM_GOOGLE);
      setSubmitting(false);
      return;
    }

    setSubmitting(true);

    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: "openid email profile",
      callback: criarTentativaDeLogin({
        setSubmitting,
        setError,
        onToken: (accessToken) => void authenticate({ accessToken }),
        agendar: (fn, ms) => window.setTimeout(fn, ms),
        cancelar: (id) => window.clearTimeout(id),
      }),
    });

    tokenClient.requestAccessToken({ prompt: promptDoLogin(trocarDeConta) });
  }, [authenticate, clientId]);

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

  const isPublic = isRotaPublica(pathname);

  // O detalhe técnico fica aqui, onde só quem mantém o app olha. Na tela, o
  // comprador vê um caminho pra resolver — não o nome de uma variável.
  useEffect(() => {
    if (!isPublic && !clientId) {
      console.error(
        "[AuthGate] NEXT_PUBLIC_GOOGLE_CLIENT_ID não foi definido no build. Sem ele o login do Google não abre.",
      );
    }
  }, [isPublic, clientId]);

  // Carrega Google Identity Services + revalida sessão
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isPublic) return;

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

    // Já logado: o app abre a partir do registro gravado no aparelho. Não há
    // reconferência com o servidor aqui — é o que permite abrir sem internet, e
    // é exatamente o que a política de privacidade descreve (item 9). Se um dia
    // alguém acrescentar a reconferência, a política precisa mudar junto.
    setStage(stored.status === "ativo" ? "ok" : "not-member");
    loadGisScript();
  }, [pathname, isPublic, loadGisScript]);

  if (isPublic) return <>{children}</>;

  function handleSignIn() {
    setError("");
    // Abre o popup do Google AGORA, no clique. Antes tentávamos o One Tap e só
    // caíamos no popup depois de um setTimeout — e popup que não nasce do gesto
    // do usuário é bloqueado pelo Safari e pelo Chrome. Era aí que o comprador
    // via "não consegui abrir a janela do Google" e desistia.
    //
    // Este onClick NÃO pode receber parâmetro: o React passa o evento do clique
    // como primeiro argumento, e um evento é sempre "verdadeiro". Por isso a
    // troca de conta vem do estado, não de um argumento.
    startOAuthPopupFallback(trocandoDeConta);
    setTrocandoDeConta(false);
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
        {/* Marca do app — o handoff proíbe emoji na interface */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" aria-hidden className="h-16 w-16 rounded-2xl shadow-[0_0_40px_rgba(34,197,94,0.35)]" />
        <h1 className="text-2xl font-bold text-ink-900">Código da Virada</h1>
        <p className="text-sm text-ink-500">Seu controle financeiro inteligente</p>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-ink-200 bg-white p-6 shadow-2xl">
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
          <p className="text-center text-sm text-ink-500">Validando acesso…</p>
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
              setTrocandoDeConta(true);
              setStage("needs-login");
            }}
          />
        )}
      </div>

      <p className="mt-6 text-center text-xs text-ink-700">
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
      <h2 className="mt-1 text-xl font-semibold text-ink-900">Entre em 1 clique</h2>
      <p className="mt-1 mb-5 text-sm text-ink-500">
        Use o mesmo e-mail que você usou na compra. É só apertar e pronto.
      </p>

      {/* Falta configuração do lado do servidor. Quem está na tela pagou e não
          tem nada a ver com isso: o detalhe técnico vai pro console (ver o
          useEffect lá em cima) e aqui fica só o caminho pra resolver. */}
      {!clientId && (
        <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-ink-900">Estamos com um problema no login.</p>
          <p className="mt-1 text-sm text-ink-700">
            É aqui do nosso lado, não é com a sua compra. Chama a gente no WhatsApp que a gente libera seu acesso.
          </p>
          <a
            href={WHATSAPP_SUPORTE}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center justify-center rounded-xl border border-green-700/40 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 transition hover:bg-green-100"
          >
            Falar no WhatsApp
          </a>
        </div>
      )}

      <button
        type="button"
        onClick={onSignIn}
        disabled={submitting || !clientId}
        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white py-3.5 text-sm font-bold text-ink-900 transition hover:bg-ink-100 disabled:opacity-50"
      >
        {submitting ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-300 border-t-transparent" />
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
        <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      <p className="mt-5 text-center text-xs text-ink-500">
        Ainda não comprou?{" "}
        <a href="/vendas.html" className="font-semibold text-virada-green underline underline-offset-2">
          Conheça o app
        </a>
      </p>

      {/* Botão dev — aparece APENAS em localhost, invisível em produção */}
      {typeof window !== "undefined" && window.location.hostname === "localhost" && (
        <button
          type="button"
          onClick={onDevLogin}
          className="mt-4 w-full rounded-xl border border-dashed border-ink-300 py-2.5 text-xs text-ink-600 transition hover:border-ink-300 hover:text-ink-500"
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
      <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Conta não encontrada na lista</p>
      <h2 className="mt-1 text-xl font-semibold text-ink-900">Comprou com outro e-mail?</h2>
      <p className="mt-1 mb-5 text-sm text-ink-500">
        Você entrou como <span className="font-semibold text-ink-900">{email}</span>, mas esse e-mail não aparece como comprador.
        Confira no e-mail de confirmação da compra com qual e-mail ela foi feita.
      </p>
      <button
        type="button"
        onClick={onSwitch}
        className="flex w-full items-center justify-center rounded-xl border border-virada-green/40 bg-virada-green/10 py-3 text-sm font-semibold text-virada-green transition hover:bg-virada-green/20"
      >
        Tentar com outra conta Google
      </button>
      <p className="mt-4 text-center text-xs text-ink-500">
        Comprou agora? Pode levar 1-2 min até o pagamento aparecer aqui.
      </p>
    </>
  );
}

function NeedsOnline({ email, onRetry }: { email?: string; onRetry: () => void }) {
  return (
    <>
      <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Sem internet</p>
      <h2 className="mt-1 text-xl font-semibold text-ink-900">Conecte uma vez para validar</h2>
      <p className="mt-1 mb-5 text-sm text-ink-500">
        {email ? `Você entrou como ${email}, mas precisa de internet uma vez para confirmar a compra.` : "Conecte-se à internet uma vez para entrar."}
        <br />
        Depois disso, o app funciona offline.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="flex w-full items-center justify-center rounded-xl bg-green-500 py-3 text-sm font-bold text-green-900 transition hover:bg-green-400"
      >
        Tentar de novo
      </button>
    </>
  );
}
