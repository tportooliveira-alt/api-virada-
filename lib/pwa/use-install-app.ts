"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Estado de instalação do app (PWA) — a parte "baixe o app" da entrega.
 *
 * O Chrome/Android guarda o convite de instalação num evento (`beforeinstallprompt`)
 * que só dispara uma vez e precisa ser capturado antes de o usuário clicar. Por isso
 * o hook escuta desde a montagem e guarda o evento para disparar no clique.
 *
 * O iPhone não tem esse evento: no Safari a instalação é manual (Compartilhar →
 * Adicionar à Tela de Início), então lá a saída é mostrar o passo a passo.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallPlatform = "ios" | "android" | "desktop";

export interface InstallState {
  /** Só vira true depois de montar no cliente — evita divergência com o SSR. */
  ready: boolean;
  /** O app está rodando instalado (tela cheia, sem barra do navegador). */
  standalone: boolean;
  /** Dá para instalar com um clique agora (evento capturado). */
  canPrompt: boolean;
  /** O navegador confirmou a instalação nesta sessão. */
  justInstalled: boolean;
  platform: InstallPlatform;
  /** Abre o instalador do navegador. Devolve o que o usuário escolheu. */
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone;
}

function detectPlatform(): InstallPlatform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  // iPad moderno se apresenta como Mac; o toque é o que entrega.
  const isIpad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || isIpad) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

export function useInstallApp(): InstallState {
  const [ready, setReady] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>("desktop");
  const [justInstalled, setJustInstalled] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setReady(true);
    setPlatform(detectPlatform());
    setStandalone(detectStandalone());

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault(); // sem isso o Chrome mostra a barrinha dele e some com o evento
      setDeferred(event as BeforeInstallPromptEvent);
    }

    function onInstalled() {
      setDeferred(null);
      setJustInstalled(true);
    }

    const display = window.matchMedia("(display-mode: standalone)");
    function onDisplayChange(e: MediaQueryListEvent) {
      setStandalone(e.matches);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    display.addEventListener("change", onDisplayChange);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      display.removeEventListener("change", onDisplayChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return "unavailable" as const;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // O evento é de uso único: aceito ou recusado, ele não serve mais.
    setDeferred(null);
    return outcome;
  }, [deferred]);

  return { ready, standalone, canPrompt: deferred !== null, justInstalled, platform, promptInstall };
}
