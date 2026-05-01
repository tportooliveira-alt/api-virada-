import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authenticateUser } from "@/lib/sheets/local-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = authenticateUser(String(body.email ?? ""), String(body.password ?? ""));

    cookies().set("virada_user_id", user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao entrar." },
      { status: 401 },
    );
  }
}
