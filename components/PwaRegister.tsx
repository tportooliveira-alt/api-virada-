"use client";

import { useEffect } from "react";

/**
 * Liga o service worker (`public/sw.js`).
 *
 * Sem ele o Chrome não oferece instalar o app e nada abre offline. Em
 * desenvolvimento fica desligado — e desregistra o que já estiver instalado,
 * senão o localhost serve chunk velho de cache e a gente debuga fantasma.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((reg) => void reg.unregister()));
      return;
    }

    const register = () => {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Navegador sem suporte, aba privada ou HTTP: o app segue funcionando sem cache.
      });
    };

    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
