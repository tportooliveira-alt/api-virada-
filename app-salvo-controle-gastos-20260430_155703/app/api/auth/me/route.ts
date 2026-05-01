import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserById } from "@/lib/sheets/local-store";

export async function GET() {
  try {
    const userId = cookies().get("virada_user_id")?.value;
    if (!userId) return NextResponse.json({ message: "Não autenticado." }, { status: 401 });

    const user = await getUserById(userId);
    if (!user) return NextResponse.json({ message: "Usuário não encontrado." }, { status: 401 });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      plan: user.plan,
    });
  } catch {
    return NextResponse.json({ message: "Erro." }, { status: 500 });
  }
}
