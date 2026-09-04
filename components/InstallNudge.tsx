"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Smartphone, X } from "lucide-react";
import { useInstallApp } from "@/lib/pwa/use-install-app";

/**
 * Convite discreto para instalar o app, no topo das telas.
 *
 * Quem compra abre o app pelo link do e-mail, usa no navegador e nunca mais acha
 * o endereço — o produto some. Este aviso resolve isso no primeiro uso e some de
 * vez quando o app está instalado. Dispensou? Fica quieto por uma semana.
 */
const CHAVE = "virada:instalar-dispensado";
const SILENCIO_MS = 7 * 24 * 60 * 60 * 1000;

function dispensadoRecentemente(): boolean {
  try {
    const marca = Number(localStorage.getItem(CHAVE) ?? 0);
    return Number.isFinite(marca) && Date.now() - marca < SILENCIO_MS;
  } catch {
    return false;
  }
}

export function InstallNudge() {
  const { ready, standalone, canPrompt, justInstalled, platform, promptInstall } = useInstallApp();
  const [dispensado, setDispensado] = useState(true); // começa escondido: evita piscar antes de ler o localStorage

  useEffect(() => {
    setDispensado(dispensadoRecentemente());
  }, []);

  function dispensar() {
    setDispensado(true);
    try {
      localStorage.setItem(CHAVE, String(Date.now()));
    } catch {
      // aba privada: some só nesta sessão
    }
  }

  const celular = platform === "ios" || platform === "android";
  if (!ready || dispensado || standalone || justInstalled || !celular) return null;
  // Android sem convite do navegador normalmente é o navegador de dentro do
  // Instagram/WhatsApp, onde instalar não funciona. Aí não vale incomodar.
  if (platform === "android" && !canPrompt) return null;

  return (
    <div className="relative rounded-2xl border border-green-500/40 bg-green-50 p-4">
      <button
        type="button"
        onClick={dispensar}
        aria-label="Dispensar o aviso de instalação"
        className="absolute right-1.5 top-1.5 grid h-9 w-9 place-items-center rounded-[10px] text-ink-500 transition-colors duration-150 hover:bg-green-100 hover:text-ink-700"
      >
        <X className="h-[16px] w-[16px]" aria-hidden />
      </button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3 pr-9">
          <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-green-700" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-900">Deixe o app na tela inicial</p>
            <p className="mt-0.5 text-xs leading-[18px] text-ink-600">
              Abre em um toque, sem procurar o link, e funciona sem internet.
            </p>
          </div>
        </div>

        {canPrompt ? (
          <button
            type="button"
            onClick={() => void promptInstall()}
            className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-[10px] bg-green-500 px-4 text-sm font-bold text-green-900 transition-colors duration-150 hover:bg-green-400 sm:h-10 sm:w-auto sm:text-[13px]"
          >
            <Download className="h-[15px] w-[15px]" aria-hidden /> Instalar
          </button>
        ) : (
          <Link
            href="/app/instalar"
            className="inline-flex h-11 w-full shrink-0 items-center justify-center rounded-[10px] bg-green-500 px-4 text-sm font-bold text-green-900 transition-colors duration-150 hover:bg-green-400 sm:h-10 sm:w-auto sm:text-[13px]"
          >
            Como instalar
          </Link>
        )}
      </div>
    </div>
  );
}
