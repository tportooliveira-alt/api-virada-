"use client";

import { useState } from "react";
import { Check, Download } from "lucide-react";
import { useInstallApp } from "@/lib/pwa/use-install-app";

/**
 * Botão "Instalar o app".
 *
 * Quando o navegador deixa (Chrome/Android, Edge, Chrome no desktop) instala em
 * um clique. Quando não deixa (Safari/iPhone, navegador dentro do Instagram) leva
 * para o passo a passo em vez de deixar o comprador travado num botão morto.
 */
export function InstallButton({
  fallbackHref = "/app/instalar",
  onFallback,
  className = "",
}: {
  fallbackHref?: string;
  onFallback?: () => void;
  className?: string;
}) {
  const { ready, standalone, canPrompt, justInstalled, platform, promptInstall } = useInstallApp();
  const [recusou, setRecusou] = useState(false);

  if (ready && (standalone || justInstalled)) {
    return (
      <p className={`inline-flex items-center gap-2 text-sm font-semibold text-green-700 ${className}`}>
        <Check className="h-[18px] w-[18px]" aria-hidden />
        App instalado no seu celular.
      </p>
    );
  }

  async function handleClick() {
    if (!canPrompt) {
      if (onFallback) onFallback();
      else window.location.assign(fallbackHref);
      return;
    }
    const outcome = await promptInstall();
    if (outcome === "dismissed") setRecusou(true);
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void handleClick()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3.5 text-sm font-bold text-green-900 transition-colors duration-150 hover:bg-green-400"
      >
        <Download className="h-[18px] w-[18px]" aria-hidden />
        {ready && !canPrompt ? "Ver como instalar" : "Instalar o app"}
      </button>
      {recusou && (
        <p className="mt-2 text-xs text-ink-500">
          Sem problema. Quando quiser, o botão continua aqui — ou use o menu do navegador,
          em <span className="font-semibold text-ink-700">Instalar aplicativo</span>.
        </p>
      )}
      {ready && !canPrompt && platform === "ios" && (
        <p className="mt-2 text-xs text-ink-500">No iPhone a instalação é pelo Safari, em Compartilhar.</p>
      )}
    </div>
  );
}
