import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { SELLER_NAME, SUPPORT_EMAIL } from "@/config/site";

export const metadata = {
  title: "Termos de Uso — Código da Virada Financeira",
};

export default function TermosPage() {
  return (
    <>
      <Header />
      <main className="section">
        <div className="container-narrow">
          <div className="mx-auto max-w-3xl">
            <h1 className="h1">Termos de Uso</h1>
            <p className="mt-2 text-sm text-ink-subtle">
              Última atualização: {new Date().toLocaleDateString("pt-BR")}
            </p>

            <div className="mt-8 space-y-6 text-ink-muted">
              <h2 className="font-display text-2xl font-bold text-ink">
                1. Sobre o produto
              </h2>
              <p>
                O e-book &ldquo;O Código da Virada Financeira&rdquo; e seus
                bônus são produtos digitais de{" "}
                <strong className="text-ink">caráter educacional e
                informativo</strong>. Não constituem recomendação de
                investimento, consultoria financeira, jurídica ou contábil
                personalizada.
              </p>

              <h2 className="font-display text-2xl font-bold text-ink">
                2. Licença de uso
              </h2>
              <p>
                Ao adquirir o produto, você recebe licença pessoal e
                intransferível de uso. É proibido revender, redistribuir,
                copiar, modificar ou compartilhar o conteúdo total ou parcial
                sem autorização expressa por escrito.
              </p>

              <h2 className="font-display text-2xl font-bold text-ink">
                3. Resultados
              </h2>
              <p>
                Os resultados variam conforme aplicação, esforço, contexto
                financeiro e disciplina de cada pessoa. Não garantimos
                resultado financeiro específico, retorno percentual ou prazo
                de quitação de dívidas.
              </p>

              <h2 className="font-display text-2xl font-bold text-ink">
                4. Forma de entrega
              </h2>
              <p>
                Após a confirmação do pagamento, o acesso é enviado
                automaticamente por e-mail, dentro do prazo informado pela
                plataforma utilizada. Em caso de atraso, contate{" "}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-brand-green underline"
                >
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>

              <h2 className="font-display text-2xl font-bold text-ink">
                5. Garantia
              </h2>
              <p>
                Aplica-se a garantia incondicional de 7 dias, conforme nossa{" "}
                <a
                  href="/politica-de-reembolso"
                  className="text-brand-green underline"
                >
                  Política de Reembolso
                </a>
                .
              </p>

              <h2 className="font-display text-2xl font-bold text-ink">
                6. Propriedade intelectual
              </h2>
              <p>
                Todos os conteúdos, marcas, layout, textos e arquivos são de
                propriedade de {SELLER_NAME} e protegidos pela Lei nº
                9.610/1998 (Lei de Direitos Autorais).
              </p>

              <h2 className="font-display text-2xl font-bold text-ink">
                7. Alterações
              </h2>
              <p>
                Estes termos podem ser atualizados a qualquer momento. A
                versão vigente é sempre a publicada nesta página.
              </p>

              <h2 className="font-display text-2xl font-bold text-ink">
                8. Contato
              </h2>
              <p>
                Dúvidas sobre estes termos:{" "}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-brand-green underline"
                >
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
