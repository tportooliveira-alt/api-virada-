import { redirect } from "next/navigation";

// Home (raiz) redireciona direto pro dashboard do app.
// O AuthGate dentro de /app cuida do login do usuario.
export default function HomePage() {
  redirect("/app/inicio");
}
