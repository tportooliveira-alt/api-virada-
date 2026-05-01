"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setMessage(body?.message ?? "Não foi possível entrar.");
      return;
    }

    router.push("/app/inicio");
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-virada-gold">
          Virada App
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Entrar</h1>
        <p className="mt-2 text-sm leading-6 text-virada-gray">
          Acesse seu fluxo de caixa e seus lançamentos salvos na base de planilhas.
        </p>

        <div className="mt-5 grid gap-3">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="Email"
            className="rounded-md border border-virada-line bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            required
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="Senha"
            className="rounded-md border border-virada-line bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            required
          />
          <button
            disabled={isSubmitting}
            className="min-h-12 rounded-md bg-emerald-500 px-5 py-3 font-semibold text-slate-950 disabled:opacity-60"
          >
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </div>

        {message ? <p className="mt-4 text-sm text-amber-200">{message}</p> : null}

        <p className="mt-5 text-sm text-virada-gray">
          Não tem conta? <Link href="/cadastro" className="font-semibold text-emerald-300">Cadastre-se</Link>
        </p>
      </form>
    </main>
  );
}
