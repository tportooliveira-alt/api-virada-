import { redirect } from "next/navigation";

// Rota antiga: o conteúdo agora vive em Relatórios.
export default function Page() {
  redirect("/app/relatorios?aba=dividas");
}
