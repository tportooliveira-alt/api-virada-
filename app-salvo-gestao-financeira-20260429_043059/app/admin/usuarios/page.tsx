"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Profile } from "@/lib/types";
import { useVirada } from "@/providers/virada-provider";

export default function AdminUsuariosPage() {
  const data = useVirada();
  const [users, setUsers] = useState<Profile[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !data.isAdmin) return;

    supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data: rows, error }) => {
        if (error) {
          setMessage(error.message);
          return;
        }
        setUsers(
          (rows ?? []).map((row) => ({
            id: row.id,
            fullName: row.full_name,
            email: row.email,
            role: row.role,
            plan: row.plan,
            accessStatus: row.access_status,
          })),
        );
      });
  }, [data.isAdmin]);

  async function updateUser(id: string, field: "plan" | "access_status", value: string) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !data.isAdmin) return;

    const { error } = await supabase.from("profiles").update({ [field]: value }).eq("id", id);
    if (error) {
      setMessage(error.message);
      return;
    }

    setUsers((current) =>
      current.map((user) =>
        user.id === id
          ? {
              ...user,
              plan: field === "plan" ? (value as Profile["plan"]) : user.plan,
              accessStatus: field === "access_status" ? (value as Profile["accessStatus"]) : user.accessStatus,
            }
          : user,
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
              {users.filter((user) => user.plan === "premium").length}
            </strong>
          </div>
          <div className="rounded-md bg-white/5 p-4">
            <p className="text-sm text-virada-gray">Ativos</p>
            <strong className="mt-2 block text-2xl text-emerald-300">
              {users.filter((user) => user.accessStatus === "active").length}
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
                onChange={(event) => void updateUser(user.id, "plan", event.target.value)}
                className="rounded-md border border-virada-line bg-slate-950 px-3 py-2 text-white"
              >
                <option value="basic">basic</option>
                <option value="premium">premium</option>
              </select>
              <select
                value={user.accessStatus}
                onChange={(event) => void updateUser(user.id, "access_status", event.target.value)}
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
