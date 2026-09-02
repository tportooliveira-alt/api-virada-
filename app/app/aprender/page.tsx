import { redirect } from "next/navigation";

// Rota antiga: o conteúdo agora vive em Conta.
export default function Page() {
  redirect("/app/conta");
}
