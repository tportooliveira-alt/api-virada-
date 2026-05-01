import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exportUserSheet } from "@/lib/sheets/local-store";

export async function GET(request: Request) {
  try {
    const userId = cookies().get("virada_user_id")?.value ?? "";
    if (!userId) {
      return NextResponse.json({ message: "Sessão necessária." }, { status: 401 });
    }

    const url = new URL(request.url);
    const sheet = url.searchParams.get("sheet") ?? "lancamentos.csv";
    const csv = exportUserSheet(userId, sheet);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${sheet.endsWith(".csv") ? sheet : `${sheet}.csv`}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao exportar planilha." },
      { status: 400 },
    );
  }
}
