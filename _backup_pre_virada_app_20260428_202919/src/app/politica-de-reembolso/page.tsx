import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { SELLER_NAME, SUPPORT_EMAIL } from "@/config/site";

export const metadata = {
  title: "Política de Reembolso — Código da Virada Financeira",
};

export default function ReembolsoPage() {
  return (
    <>
      <Header />
      <main className="section">
        <div className="container-narrow">
          <div className="mx-auto max-w-3xl">
            <h1 className="h1">Política de Reembolso</h1>
            <p className="mt-2 text-sm text-ink-subtle">
              Última atualização: {new Date().toLocaleDateString("pt-BR")}
            </p>

            <div className="prose-spacing mt-8 space-y-6 text-ink-muted">
              <p>
                Em conformidade com o Código de Defesa do Consumidor (Lei nº
                8.078/1990, art. 49) e com as regras da plataforma utilizada
                para a venda, oferecemos garantia incondicional de{" "}
                <strong className="text-ink">7 (sete) dias corridos</strong>{" "}
                contados a partir da data da compra.
              </p>

              <h2 className="font-display text-2xl font-bold text-ink">
                Como solicitar o reembolso
              </h2>
              <p>
                Para solicitar reembolso, você pode:
              </p>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Solicitar diretamente pela área do cliente da plataforma
                  utilizada na compra (Cakto, Hotmart, Kiwify, Eduzz ou
                  similar);
                </li>
                <li>
                  Ou enviar um e-mail para{" "}
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="text-brand-green underline"
                  >
                    {SUPPORT_EMAIL}
                  </a>{" "}
                  com seu nome completo, e-mail da compra e o motivo (opcional).
                </li>
              </ul>

              <h2 className="font-display text-2xl font-bold text-ink">
                Prazo de processamento
              </h2>
              <p>
                Após a solicitação, o reembolso é processado em até 7 dias
                úteis no mesmo meio de pagamento utilizado. Em compras no
                cartão de crédito, o estorno pode aparecer em até 2 faturas,
                conforme política do emissor.
              </p>

              <h2 className="font-display text-2xl font-bold text-ink">
                Acesso após reembolso
              </h2>
              <p>
                Em caso de reembolso, o acesso ao material digital e aos
                bônus é encerrado automaticamente.
              </p>

              <h2 className="font-display text-2xl font-bold text-ink">
                Sem perguntas, sem burocracia
              </h2>
              <p>
                Você não precisa justificar. Se o material não for para você,
                respeitamos. O risco é todo nosso.
              </p>

              <p className="text-sm text-ink-subtle">
                Esta política se aplica a compras realizadas em{" "}
                {SELLER_NAME}.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
