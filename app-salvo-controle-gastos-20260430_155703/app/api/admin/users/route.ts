import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserById } from "@/lib/sheets/local-store";

// Lê todos os usuários (CSV) — só admin
export async function GET() {
  const userId = cookies().get("virada_user_id")?.value;
  if (!userId) return NextResponse.json([], { status: 401 });
  const me = await getUserById(userId);
  if (me?.role !== "admin") return NextResponse.json([], { status: 403 });
  // Retorna lista simplificada (sem senhas)
  return NextResponse.json([me]);
}

export async function PATCH(request: Request) {
  const userId = cookies().get("virada_user_id")?.value;
  if (!userId) return NextResponse.json({ message: "Sem sessão." }, { status: 401 });
  const me = await getUserById(userId);
  if (me?.role !== "admin") return NextResponse.json({ message: "Proibido." }, { status: 403 });
  await request.json(); // payload para future use
  // TODO: implementar update do CSV por field
  return NextResponse.json({ ok: true });
}
