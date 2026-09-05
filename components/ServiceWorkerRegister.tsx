"use client";

import { useEffect } from "react";

/**
 * Registra o service worker (public/sw.js), que faz o app abrir sem internet.
 *
 * Só em produção: em `next dev` o SW atrapalha o hot reload e serviria chunks
 * velhos a cada save. Em dev, se sobrou um SW de uma build de produção testada
 * nesta mesma origem (localhost), ele é removido — senão o dev server passa a
 * servir código antigo e a pessoa perde a tarde procurando o motivo.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker
        .getRegistrations()
        .then((rs) => rs.forEach((r) => void r.unregister()))
        .catch(() => undefined);
      return;
    }

    const register = () => {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    };

    // Espera o load pra não disputar banda com o primeiro render.
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
