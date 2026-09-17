"use client";

/**
 * GoogleSyncButton — o miolo do cartão "Planilha Google" da tela Conta.
 *
 * Fluxo (1 clique):
 *  1. Usuário clica "Conectar Google Planilhas"
 *  2. Popup OAuth do Google → "Permitir"
 *  3. App cria/atualiza a planilha NO DRIVE DO USUÁRIO (layout, formatos,
 *     fórmulas pt-BR, menus da aba Filtros, gráficos — ver lib/sheets/builder.ts)
 *  4. Cartão vira "Virada Financeira · Atualizada há …" com Abrir / Atualizar agora.
 *
 * Daqui pra frente ela também se atualiza SOZINHA: quem faz isso é o AutoSync
 * do providers/virada-provider.tsx, usando o MESMO motor (lib/sheets/sync-runner).
 * Este arquivo é só a interface — botão, estados e mensagens. A divisão de
 * trabalho é: o automático nunca fala com a pessoa; o botão é quem explica o
 * que houve e é o caminho pra religar quando o Google derruba a conexão.
 *
 * Sem service account, sem .env do server, sem upload manual. O token vive no
 * localStorage por ~55 min; depois disso o botão tenta renovar em silêncio e só
 * abre o consentimento se o Google exigir.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, RefreshCcw } from "lucide-react";
import { WHATSAPP_SUPORTE } from "@/lib/constants";
import { timeAgo } from "@/lib/utils";
import { useVirada } from "@/providers/virada-provider";
import { type SyncInput } from "@/lib/sheets/builder";
// O motor (sequência de chamadas ao Google, token e meta no aparelho) vive fora
// do React em lib/sheets/sync-runner.ts — é o mesmo que o automático usa.
import {
  META_EVENT,
  SCOPES,
  ehErroDeAutorizacao,
  ehPlanilhaSumiu,
  gravarMeta,
  gravarToken,
  lerMeta,
  lerToken,
  limparMeta,
  limparToken,
  sincronizar,
  tokenValido,
  type SheetMeta,
  type Token,
} from "@/lib/sheets/sync-runner";

/** Margem de segurança: não tentar usar um token que vence no meio do envio. */
const FOLGA_TOKEN_MS = 60 * 1000;
const VIDA_PADRAO_S = 3600;
/** De quanto em quanto tempo a tela reconfere se a autorização ainda está viva. */
const RELOGIO_MS = 30 * 1000;

interface TokenResponse {
  error?: string;
  error_description?: string;
  access_token?: string;
  expires_in?: number;
}

type PedidoDeToken = (opts?: { prompt?: string }) => void;

type OAuth2InitTokenClient = (cfg: {
  client_id: string;
  scope: string;
  callback: (resp: TokenResponse) => void;
  error_callback?: (err: { type?: string; message?: string }) => void;
}) => { requestAccessToken: PedidoDeToken };

function getInitTokenClient(): OAuth2InitTokenClient | null {
  const g = (window as unknown as { google?: { accounts?: { oauth2?: { initTokenClient?: OAuth2InitTokenClient } } } }).google;
  return g?.accounts?.oauth2?.initTokenClient ?? null;
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
  // Renda esperada e fase dos bolsos (aba Bolsos da planilha) vêm do contexto,
  // não de prop: o cartão da Conta não precisa saber que a planilha as usa.
  const { settings } = useVirada();
  const tokenClientRef = useRef<{ requestAccessToken: PedidoDeToken } | null>(null);
  const oauthPopupTimeoutRef = useRef<number | null>(null);
  // A renovação silenciosa (prompt vazio) pode ser recusada pelo Google quando o
  // consentimento precisa ser mostrado de novo. Esta marca diz se o pedido que
  // falhou era o silencioso — só nesse caso vale reabrir com consentimento.
  const pedidoSilenciosoRef = useRef(false);
  const [syncing, setSyncing] = useState(false);
  const [meta, setMeta] = useState<SheetMeta | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [errDetail, setErrDetail] = useState("");
  const [token, setToken] = useState<Token | null>(null);
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [errMsg, setErrMsg] = useState("");
  const [gisLoaded, setGisLoaded] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);

  // Enquanto houver token na mão, a conexão está de pé. É o que separa
  // "Atualizada há 2 h, tudo certo" de "parou de atualizar e você não sabia".
  const conexaoAtiva = tokenValido(token, Date.now());

  // O nome da variável de ambiente só existe aqui, onde só quem mantém o app
  // olha. Na tela, o comprador vê um caminho pra resolver.
  useEffect(() => {
    if (!clientId) {
      console.error("[GoogleSync] NEXT_PUBLIC_GOOGLE_CLIENT_ID não foi definido no build. Sem ele a planilha não conecta.");
    }
  }, [clientId]);

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

  // Estado inicial: meta da planilha e token do aparelho. Token vencido é
  // APAGADO aqui — deixá-lo ali fazia o mesmo erro genérico se repetir por até
  // 55 minutos, sem ninguém entender que bastava religar.
  useEffect(() => {
    setMeta(lerMeta());
    const salvo = lerToken();
    if (tokenValido(salvo, Date.now())) setToken(salvo);
    else if (salvo) limparToken();
  }, []);

  // A autorização do Google vive ~1 h e NÃO tem renovação automática (ver o
  // cabeçalho do sync-runner). Até 17/09/2026 o cartão continuava com o pontinho
  // verde e "Atualizada há 2 h" depois de ela vencer: o automático já tinha
  // parado, a planilha estava congelada, e quem pagou não tinha como saber.
  // Este relógio é o que deixa a tela contar a verdade sem ninguém clicar.
  useEffect(() => {
    const id = window.setInterval(() => {
      setToken((atual) => {
        if (!atual || tokenValido(atual, Date.now())) return atual;
        limparToken(); // token morto não fica apodrecendo no aparelho
        return null;
      });
    }, RELOGIO_MS);
    return () => window.clearInterval(id);
  }, []);

  // O automático também grava a meta (hora do último envio). Sem ouvir isso, o
  // cartão ficaria dizendo "Atualizada há 3 h" com a planilha recém-atualizada.
  useEffect(() => {
    function reler() {
      setMeta(lerMeta());
    }
    window.addEventListener(META_EVENT, reler);
    return () => window.removeEventListener(META_EVENT, reler);
  }, []);

  const doSync = useCallback(async (accessToken: string) => {
    setSyncing(true);
    setStatus("idle");
    setErrMsg("");
    setErrDetail("");
    try {
      const novo = await sincronizar({
        token: accessToken,
        meta: lerMeta(), // sempre o mais recente: o automático pode ter gravado no meio
        dados: { expenses, incomes, debts, goals, settings },
        email: userEmail,
        aoAtualizarLayout: setUpgrading,
        // No instante em que a planilha nasce no Drive já mostramos o botão
        // "Abrir planilha". Se o resto do envio falhar, a pessoa continua com o
        // endereço na mão e a próxima tentativa termina ESTA planilha em vez de
        // criar outra — foi o que encheu o Drive do dono de duplicatas.
        aoCriar: (parcial) => {
          gravarMeta(parcial);
          setMeta(parcial);
        },
        // Só o botão pode substituir uma planilha que sumiu do Drive: é gesto
        // explícito de quem está olhando a tela (ver `permitirRecriar`).
        permitirRecriar: true,
      });
      gravarMeta(novo);
      setMeta(novo);
      setStatus("ok");
    } catch (err) {
      console.error("[GoogleSync] falha ao sincronizar:", err);
      setUpgrading(false);
      if (ehErroDeAutorizacao(err)) {
        // Token morto/revogado: apagar é o que destrava — senão a pessoa clica,
        // clica, e leva o mesmo erro até o token "vencer" sozinho.
        limparToken();
        setToken(null);
        setErrMsg("O Google desligou a conexão por segurança. Toque para religar.");
      } else if (ehPlanilhaSumiu(err)) {
        // Chega aqui quando nem a planilha nova conseguiu nascer.
        setErrMsg("Sua planilha não está mais no Google Drive e não consegui criar outra agora. Tente de novo em alguns segundos.");
      } else {
        setErrMsg("Não deu para atualizar a planilha agora. Tente de novo em alguns segundos.");
      }
      setErrDetail(err instanceof Error ? err.message : String(err));
      setStatus("err");
    }
    setSyncing(false);
  }, [expenses, incomes, debts, goals, settings, userEmail]);

  // O token client é criado UMA vez (o script do Google não gosta de ser
  // reinicializado a cada tecla digitada no app). Como o callback precisa dos
  // dados mais novos e da função de pedir token, ele os alcança por referência.
  const doSyncRef = useRef(doSync);
  doSyncRef.current = doSync;

  const pedirToken = useCallback((silencioso: boolean) => {
    if (!tokenClientRef.current) return;
    pedidoSilenciosoRef.current = silencioso;
    if (oauthPopupTimeoutRef.current !== null) window.clearTimeout(oauthPopupTimeoutRef.current);
    // Em alguns navegadores o popup OAuth pode ser bloqueado sem callback
    // nenhum. Este tempo limite evita botão travado em "criando".
    oauthPopupTimeoutRef.current = window.setTimeout(() => {
      oauthPopupTimeoutRef.current = null;
      setSyncing(false);
      setStatus("err");
      setErrMsg("Não consegui abrir a janela do Google. Libere popups para este site e tente de novo.");
    }, 12000);
    // prompt vazio = renovar sem incomodar quem já autorizou antes; o Google só
    // mostra tela se realmente precisar (e aí caímos no consentimento normal).
    tokenClientRef.current.requestAccessToken(silencioso ? { prompt: "" } : { prompt: "consent" });
  }, []);

  const pedirTokenRef = useRef(pedirToken);
  pedirTokenRef.current = pedirToken;

  // Quem toca no botão ANTES de o script do Google chegar fica na fila. Isso
  // acontece de verdade ao abrir /app/conta direto (recarregando, por link, ou
  // voltando pro app já nessa tela): o primeiro toque não fazia nada e só o
  // segundo funcionava. Agora o pedido dispara sozinho quando o cliente fica
  // pronto.
  const pedidoPendenteRef = useRef(false);
  const conectarAgoraRef = useRef<() => void>(() => {});

  useEffect(() => {
    const init = getInitTokenClient();
    if (!gisLoaded || !init || !clientId) return;

    function falhou(motivo: string) {
      if (oauthPopupTimeoutRef.current !== null) {
        window.clearTimeout(oauthPopupTimeoutRef.current);
        oauthPopupTimeoutRef.current = null;
      }
      console.error("[GoogleSync] OAuth:", motivo);
      // Se o que falhou foi a renovação em silêncio, ainda há uma carta na
      // manga: abrir o consentimento de verdade.
      if (pedidoSilenciosoRef.current) {
        pedidoSilenciosoRef.current = false;
        setTimeout(() => pedirTokenRef.current(false), 0);
        return;
      }
      setErrMsg("Não deu para entrar com o Google agora. Tente de novo em alguns segundos.");
      setStatus("err");
      setSyncing(false);
    }

    tokenClientRef.current = init({
      client_id: clientId,
      scope: SCOPES,
      callback: async (resp) => {
        if (resp.error || !resp.access_token) {
          falhou(resp.error_description ?? resp.error ?? "sem token");
          return;
        }
        if (oauthPopupTimeoutRef.current !== null) {
          window.clearTimeout(oauthPopupTimeoutRef.current);
          oauthPopupTimeoutRef.current = null;
        }
        pedidoSilenciosoRef.current = false;
        const novo: Token = {
          access_token: resp.access_token,
          expires_at: Date.now() + ((resp.expires_in ?? VIDA_PADRAO_S) * 1000 - FOLGA_TOKEN_MS),
        };
        gravarToken(novo);
        setToken(novo);
        await doSyncRef.current(novo.access_token);
      },
      // Popup fechado na cara, bloqueado pelo navegador etc.
      error_callback: (err) => falhou(err.type ?? err.message ?? "popup"),
    });

    if (pedidoPendenteRef.current) {
      pedidoPendenteRef.current = false;
      conectarAgoraRef.current();
    }
  }, [gisLoaded, clientId]);

  function conectarAgora() {
    setSyncing(true);
    if (tokenValido(token, Date.now())) {
      void doSync(token.access_token);
      return;
    }
    // Sem token válido. Se já existe planilha, essa pessoa já autorizou um dia:
    // tenta renovar em silêncio antes de jogar um consentimento na cara dela.
    pedirToken(Boolean(meta));
  }
  conectarAgoraRef.current = conectarAgora;

  function handleConnect() {
    if (!tokenClientRef.current) {
      // Não é erro: o script do Google só não chegou ainda. Entra na fila e
      // dispara sozinho (ver pedidoPendenteRef), sem exigir segundo toque.
      pedidoPendenteRef.current = true;
      setStatus("idle");
      setErrMsg("");
      setSyncing(true);

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

    conectarAgora();
  }

  // Saída de emergência do "não consigo abrir no Planilhas": em celular o toque
  // no link às vezes cai no app do Google Planilhas logado em OUTRA conta, e a
  // pessoa leva um "você precisa de permissão" sem entender por quê. Com o
  // endereço copiado ela abre onde quiser, na conta certa.
  async function copiarLink() {
    if (!meta) return;
    try {
      await navigator.clipboard.writeText(meta.spreadsheetUrl);
    } catch {
      return; // navegador sem permissão de área de transferência: o link continua clicável
    }
    setLinkCopiado(true);
    window.setTimeout(() => setLinkCopiado(false), 2500);
  }

  function handleDisconnect() {
    limparToken();
    limparMeta();
    setToken(null);
    setMeta(null);
    setStatus("idle");
  }

  // Falta configuração do nosso lado. Quem está na tela pagou e não tem nada a
  // ver com isso: o detalhe técnico vai pro console (mesmo padrão do AuthGate) e
  // aqui fica só o caminho pra resolver.
  if (!clientId) {
    return (
      <div className="rounded-xl border border-amber-300 bg-white px-4 py-3">
        <p className="text-sm font-bold text-ink-900">A planilha está indisponível agora.</p>
        <p className="mt-1 text-[13px] leading-[1.45] text-ink-700">
          É aqui do nosso lado, não é com a sua compra — seus lançamentos continuam salvos neste aparelho. Chama a gente no
          WhatsApp que a gente resolve.
        </p>
        <a
          href={WHATSAPP_SUPORTE}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-green-700/40 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 transition-colors duration-150 hover:bg-green-100"
        >
          Falar no WhatsApp
        </a>
      </div>
    );
  }

  return (
    <>
      {!meta ? (
        <>
          <h3 className="text-lg font-bold text-ink-900">Conectar sua planilha</h3>
          <p className="text-sm leading-[1.5] text-ink-600">
            Seus lançamentos, dívidas e metas vão para uma planilha completa no seu Google Drive.
          </p>
          {/* A segunda tela (a do Google, pedindo permissão) assusta quem acabou
              de pagar e some com o clique. Dizer o que vai acontecer ANTES evita
              a desistência — e é a verdade: o escopo pedido é só drive.file. */}
          <div className="rounded-xl border border-amber-200 bg-white px-3.5 py-3 text-[13px] leading-[1.5] text-ink-700">
            <p className="font-semibold text-ink-900">O Google vai pedir sua permissão. É normal.</p>
            <p className="mt-1">
              A planilha nasce na sua conta do Google e é sua. O app só enxerga a planilha que ele mesmo cria — nenhum outro
              arquivo do seu Drive.
            </p>
          </div>
          <button
            type="button"
            onClick={handleConnect}
            disabled={syncing || !gisLoaded}
            className="flex min-h-[52px] w-full items-center justify-center gap-3 rounded-xl bg-green-500 text-[15px] font-bold text-green-900 transition-colors duration-150 hover:bg-green-400 disabled:opacity-60"
          >
            {syncing ? (
              <>
                <RefreshCcw className="h-5 w-5 animate-spin" /> Criando sua planilha…
              </>
            ) : (
              <>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Conectar Google Planilhas
              </>
            )}
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2.5">
            <h3 className="text-lg font-bold text-ink-900">Virada Financeira</h3>
            {/* Verde só quando a conexão está de pé. Conexão vencida em verde,
                dizendo "Atualizada há 2 h", é mentira confortável: a planilha
                parou de andar e ninguém avisou. */}
            <span
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${
                conexaoAtiva || syncing || upgrading ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"
              }`}
            >
              <i className={`h-[7px] w-[7px] rounded-full ${conexaoAtiva || syncing || upgrading ? "bg-green-500" : "bg-amber-500"}`} />
              {upgrading
                ? "Aplicando o visual novo…"
                : syncing
                  ? "Atualizando…"
                  : conexaoAtiva
                    ? `Atualizada ${timeAgo(meta.lastSync)}`
                    : "Conexão pausada"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {/* target=_blank + rel: no app instalado (PWA em tela cheia) é o que
                manda a planilha pro navegador, em vez de engolir o app do
                Virada dentro do Google Planilhas e não ter como voltar. */}
            <a
              href={meta.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] border border-amber-300 bg-white text-sm font-bold text-amber-800 transition-colors duration-150 hover:bg-amber-100"
            >
              Abrir planilha <ExternalLink className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={handleConnect}
              disabled={syncing}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] bg-green-500 text-sm font-bold text-green-900 transition-colors duration-150 hover:bg-green-400 disabled:opacity-60"
            >
              {syncing && <RefreshCcw className="h-4 w-4 animate-spin" />}
              {syncing ? "Atualizando…" : conexaoAtiva ? "Atualizar agora" : "Religar e atualizar"}
            </button>
          </div>
          {!conexaoAtiva && !syncing && (
            <p className="text-[13px] leading-[1.45] text-amber-800">
              O Google encerra a autorização sozinho depois de cerca de 1 hora — é normal e não some com nada. Enquanto isso a
              planilha fica parada no último envio. Toque em <b className="font-semibold">Religar e atualizar</b> para mandar o
              que ficou faltando.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <button
              type="button"
              onClick={handleDisconnect}
              className="py-1 text-[13px] font-semibold text-amber-800 underline transition-colors duration-150 hover:text-amber-700"
            >
              Desconectar planilha
            </button>
            {/* Se o toque no link não abrir (celular com o app do Google
                Planilhas logado em outra conta), o endereço na mão resolve. */}
            <button
              type="button"
              onClick={copiarLink}
              className="py-1 text-[13px] font-semibold text-amber-800 underline transition-colors duration-150 hover:text-amber-700"
            >
              {linkCopiado ? "Link copiado" : "Copiar link da planilha"}
            </button>
          </div>
          <p className="text-xs leading-[1.45] text-ink-500">
            A planilha abre na conta Google que você autorizou. Se aparecer &quot;você precisa de permissão&quot;, é porque o
            celular abriu com outra conta — troque de conta no Google Planilhas ou cole o link no navegador.
          </p>
        </>
      )}

      {status === "err" && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          <p>{errMsg}</p>
          {errDetail && (
            <details className="mt-1.5">
              <summary className="cursor-pointer text-xs font-semibold">Ver detalhe técnico</summary>
              <p className="mt-1 break-words text-xs font-normal text-red-800">{errDetail}</p>
            </details>
          )}
        </div>
      )}
    </>
  );
}
