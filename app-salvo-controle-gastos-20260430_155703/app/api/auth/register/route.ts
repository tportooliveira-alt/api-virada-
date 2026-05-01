import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createUser } from "@/lib/sheets/local-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = createUser({
      fullName: String(body.fullName ?? ""),
      email: String(body.email ?? ""),
      whatsapp: String(body.whatsapp ?? ""),
      password: String(body.password ?? ""),
      sheetProvider: body.sheetProvider === "excel" ? "excel" : "google_sheets",
      sheetUrl: String(body.sheetUrl ?? ""),
    });

    cookies().set("virada_user_id", user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao criar cadastro." },
      { status: 400 },
    );
  }
}
