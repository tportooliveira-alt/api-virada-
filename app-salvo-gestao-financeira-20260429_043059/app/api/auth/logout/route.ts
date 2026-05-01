import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  cookies().delete("virada_user_id");
  return NextResponse.json({ ok: true });
}
