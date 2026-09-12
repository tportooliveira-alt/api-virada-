"use client";

import { useRef } from "react";
import { Check, Monitor, Smartphone, WifiOff } from "lucide-react";
import { InstallButton } from "@/components/InstallButton";
import { useInstallApp } from "@/lib/pwa/use-install-app";

const PASSOS = {
  android: {
    id: "passos-android",
    titulo: "Android",
    navegador: "Chrome",
    passos: [
      "Abra este site no Chrome.",
      "Toque nos três pontinhos, no canto de cima.",
      "Toque em Instalar aplicativo (ou Adicionar à tela inicial).",
      "Confirme. O ícone do Virada aparece junto dos outros apps.",
    ],
  },
  ios: {
    id: "passos-ios",
    titulo: "iPhone e iPad",
    navegador: "Safari",
    passos: [
      "Abra este site no Safari (no iPhone só dá por ele).",
      "Toque no botão Compartilhar, o quadradinho com a seta para cima.",
      "Role a lista e toque em Adicionar à Tela de Início.",
      "Toque em Adicionar. Depois entre pelo ícone novo, com o e-mail da compra.",
    ],
  },
} as const;

export function InstallGuide() {
  const { ready, standalone, justInstalled, platform } = useInstallApp();
  const passosRef = useRef<HTMLDivElement>(null);
  const instalado = ready && (standalone || justInstalled);

  const ordem = platform === "ios" ? (["ios", "android"] as const) : (["android", "ios"] as const);

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
        {instalado ? (
          <>
            <p className="inline-flex items-center gap-2 text-sm font-bold text-green-700">
              <Check className="h-[18px] w-[18px]" aria-hidden /> Tudo certo
            </p>
            <h2 className="mt-1 text-lg font-semibold text-ink-900">O app já está instalado.</h2>
            <p className="mt-1 text-sm text-ink-500">
              Abra sempre pelo ícone na tela inicial: é mais rápido e funciona sem internet.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-ink-900">Deixe o Virada na tela inicial</h2>
            <p className="mt-1 text-sm leading-6 text-ink-500">
              Vira um aplicativo de verdade: ícone junto dos outros, tela cheia, sem barra de navegador — e
              lançar um gasto passa a ser dois toques.
            </p>
            <InstallButton className="mt-4" onFallback={() => passosRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} />
          </>
        )}

        <ul className="mt-5 grid gap-2 border-t border-ink-200 pt-4 text-sm text-ink-600">
          <li className="flex items-start gap-2">
            <WifiOff className="mt-0.5 h-[16px] w-[16px] shrink-0 text-ink-400" aria-hidden />
            Abre sem internet. Seus lançamentos já ficam guardados no próprio celular.
          </li>
          <li className="flex items-start gap-2">
            <Smartphone className="mt-0.5 h-[16px] w-[16px] shrink-0 text-ink-400" aria-hidden />
            Não ocupa espaço como um app de loja e atualiza sozinho.
          </li>
        </ul>
      </section>

      <div ref={passosRef} className="grid gap-4 md:grid-cols-2">
        {ordem.map((chave) => {
          const bloco = PASSOS[chave];
          const seuCelular = ready && platform === chave;
          return (
            <section
              key={bloco.id}
              id={bloco.id}
              className={`rounded-2xl border bg-white p-5 shadow-card ${
                seuCelular ? "border-green-500" : "border-ink-200"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-ink-900">{bloco.titulo}</h2>
                {seuCelular && (
                  <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-800">
                    Seu aparelho
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-400">
                Pelo {bloco.navegador}
              </p>
              <ol className="mt-4 grid gap-3 text-sm leading-6 text-ink-600">
                {bloco.passos.map((passo, i) => (
                  <li key={passo} className="flex gap-3">
                    <span className="mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-ink-100 text-xs font-bold text-ink-700">
                      {i + 1}
                    </span>
                    <span>{passo}</span>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>

      {ready && platform === "desktop" && (
        <p className="flex items-start gap-2 rounded-xl border border-ink-200 bg-ink-50 p-4 text-sm text-ink-600">
          <Monitor className="mt-0.5 h-[16px] w-[16px] shrink-0 text-ink-400" aria-hidden />
          No computador, o Chrome e o Edge mostram um ícone de instalar na barra de endereço. Mas o app foi
          feito para o celular — é lá que ele rende.
        </p>
      )}
    </div>
  );
}
