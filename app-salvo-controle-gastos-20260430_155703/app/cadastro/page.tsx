"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CadastroPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [sheetProvider, setSheetProvider] = useState<"google_sheets" | "excel">("google_sheets");
  const [sheetUrl, setSheetUrl] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, whatsapp, password, sheetProvider, sheetUrl }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setMessage(body?.message ?? "Não foi possível criar cadastro.");
      return;
    }

    router.push("/app/inicio");
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-virada-gold">
          Fluxo de caixa simples
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Criar conta</h1>
        <p className="mt-2 text-sm leading-6 text-virada-gray">
          Cadastre seus dados e escolha a base de planilha que vai organizar tudo por trás.
        </p>

        <div className="mt-5 grid gap-3">
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Nome"
            className="rounded-md border border-virada-line bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            required
          />
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="Email"
            className="rounded-md border border-virada-line bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            required
          />
          <input
            value={whatsapp}
            onChange={(event) => setWhatsapp(event.target.value)}
            placeholder="WhatsApp"
            className="rounded-md border border-virada-line bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            minLength={6}
            placeholder="Senha"
            className="rounded-md border border-virada-line bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            required
          />
          <label className="grid gap-2 text-sm text-virada-gray">
            Base completa
            <select
              value={sheetProvider}
              onChange={(event) => setSheetProvider(event.target.value as "google_sheets" | "excel")}
              className="rounded-md border border-virada-line bg-white/5 px-4 py-3 text-white outline-none"
            >
              <option className="bg-slate-950" value="google_sheets">Google Planilhas</option>
              <option className="bg-slate-950" value="excel">Excel / CSV</option>
            </select>
          </label>
          <input
            value={sheetUrl}
            onChange={(event) => setSheetUrl(event.target.value)}
            placeholder="Link da planilha completa (opcional)"
            className="rounded-md border border-virada-line bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
          />
          <button
            disabled={isSubmitting}
            className="min-h-12 rounded-md bg-emerald-500 px-5 py-3 font-semibold text-slate-950 disabled:opacity-60"
          >
            {isSubmitting ? "Criando..." : "Criar conta"}
          </button>
        </div>

        {message ? <p className="mt-4 text-sm text-amber-200">{message}</p> : null}

        <p className="mt-5 text-sm text-virada-gray">
          Já tem conta? <Link href="/login" className="font-semibold text-emerald-300">Entrar</Link>
        </p>
      </form>
    </main>
  );
}
