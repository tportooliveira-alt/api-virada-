"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Profile } from "@/lib/types";
import { useVirada } from "@/providers/virada-provider";

export default function AdminUsuariosPage() {
  const data = useVirada();
  const [users, setUsers] = useState<Profile[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!data.isAdmin) return;
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((rows: Profile[]) => setUsers(rows))
      .catch((err: unknown) => setMessage(String(err)));
  }, [data.isAdmin]);

  async function updateUser(id: string, field: "plan" | "access_status", value: string) {
    if (!data.isAdmin) return;
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, field, value }),
    });
    if (!res.ok) { setMessage("Erro ao atualizar."); return; }
    setUsers((cur) =>
      cur.map((u) =>
        u.id === id
          ? {
              ...u,
              plan: field === "plan" ? (value as Profile["plan"]) : u.plan,
              accessStatus: field === "access_status" ? (value as Profile["accessStatus"]) : u.accessStatus,
            }
          : u,
      ),
    );
  }

  if (!data.isReady) {
    return <main className="grid min-h-screen place-items-center text-virada-gray">Carregando...</main>;
  }

  if (!data.isAdmin) {
    return (
      <main className="grid min-h-screen place-items-center px-4 text-center">
        <section className="max-w-md rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
          <h1 className="text-2xl font-semibold text-white">Acesso admin necessário</h1>
          <p className="mt-3 text-sm leading-6 text-virada-gray">Somente usuários admin acessam este painel.</p>
          <Link href="/app/inicio" className="mt-5 inline-flex rounded-md bg-emerald-500 px-5 py-3 font-semibold text-slate-950">
            Voltar ao app
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8">
      <section className="rounded-lg border border-virada-line bg-white/[0.045] p-5 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-virada-gold">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Usuários</h1>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-md bg-white/5 p-4">
            <p className="text-sm text-virada-gray">Total de usuários</p>
            <strong className="mt-2 block text-2xl text-white">{users.length}</strong>
          </div>
          <div className="rounded-md bg-white/5 p-4">
            <p className="text-sm text-virada-gray">Premium</p>
            <strong className="mt-2 block text-2xl text-amber-300">
              {users.filter((u) => u.plan === "premium").length}
            </strong>
          </div>
          <div className="rounded-md bg-white/5 p-4">
            <p className="text-sm text-virada-gray">Ativos</p>
            <strong className="mt-2 block text-2xl text-emerald-300">
              {users.filter((u) => u.accessStatus === "active").length}
            </strong>
          </div>
        </div>
      </section>

      {message ? <p className="mt-4 rounded-md bg-amber-300/10 p-3 text-sm text-amber-100">{message}</p> : null}

      <section className="mt-6 grid gap-3">
        {users.map((user) => (
          <article key={user.id} className="rounded-lg border border-virada-line bg-white/[0.045] p-4 shadow-panel">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div>
                <h2 className="font-semibold text-white">{user.fullName || "Sem nome"}</h2>
                <p className="text-sm text-virada-gray">{user.email}</p>
              </div>
              <select
                value={user.plan}
                onChange={(e) => void updateUser(user.id, "plan", e.target.value)}
                className="rounded-md border border-virada-line bg-slate-950 px-3 py-2 text-white"
              >
                <option value="basic">basic</option>
                <option value="premium">premium</option>
              </select>
              <select
                value={user.accessStatus}
                onChange={(e) => void updateUser(user.id, "access_status", e.target.value)}
                className="rounded-md border border-virada-line bg-slate-950 px-3 py-2 text-white"
              >
                <option value="active">active</option>
                <option value="blocked">blocked</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
