import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { SELLER_NAME, SUPPORT_EMAIL } from "@/config/site";

export const metadata = {
  title: "Política de Privacidade — Código da Virada Financeira",
};

export default function PrivacidadePage() {
  return (
    <>
      <Header />
      <main className="section">
        <div className="container-narrow">
          <div className="mx-auto max-w-3xl">
            <h1 className="h1">Política de Privacidade</h1>
            <p className="mt-2 text-sm text-ink-subtle">
              Última atualização: {new Date().toLocaleDateString("pt-BR")}
            </p>

            <div className="mt-8 space-y-6 text-ink-muted">
              <p>
                Esta política descreve como {SELLER_NAME} coleta, utiliza e
                protege os dados pessoais dos visitantes e clientes deste
                site, em conformidade com a Lei Geral de Proteção de Dados
                (Lei nº 13.709/2018 — LGPD).
              </p>

              <h2 className="font-display text-2xl font-bold text-ink">
                1. Dados coletados
              </h2>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  <strong className="text-ink">Compra:</strong> nome, e-mail,
                  CPF, telefone e dados de pagamento são coletados pela
                  plataforma de venda (Cakto, Hotmart, Kiwify, Eduzz e
                  similares), conforme política da plataforma.
                </li>
                <li>
                  <strong className="text-ink">Lead/Newsletter:</strong> nome
                  e WhatsApp/e-mail, fornecidos voluntariamente em
                  formulários.
                </li>
                <li>
                  <strong className="text-ink">Navegação:</strong> dados de
                  navegação, IP, tipo de dispositivo, páginas visitadas e
                  origem do tráfego, via cookies e pixels (Meta, Google e
                  TikTok).
                </li>
              </ul>

              <h2 className="font-display text-2xl font-bold text-ink">
                2. Uso dos dados
              </h2>
              <ul className="list-inside list-disc space-y-2">
                <li>Entrega do produto adquirido;</li>
                <li>Suporte ao cliente;</li>
                <li>Comunicação sobre conteúdos e novas ofertas (opt-in);</li>
                <li>
                  Otimização de campanhas de marketing e medição de
                  resultados;
                </li>
                <li>Cumprimento de obrigações legais e fiscais.</li>
              </ul>

              <h2 className="font-display text-2xl font-bold text-ink">
                3. Compartilhamento
              </h2>
              <p>
                Não vendemos seus dados. Compartilhamos apenas com:
                plataforma de pagamento, ferramentas de e-mail marketing,
                provedores de hospedagem e analytics, sempre sob contrato de
                proteção de dados.
              </p>

              <h2 className="font-display text-2xl font-bold text-ink">
                4. Cookies
              </h2>
              <p>
                Utilizamos cookies próprios e de terceiros para melhorar a
                experiência e medir resultados de campanhas. Você pode
                desabilitar cookies nas configurações do seu navegador.
              </p>

              <h2 className="font-display text-2xl font-bold text-ink">
                5. Seus direitos (LGPD)
              </h2>
              <p>
                Você pode, a qualquer momento, solicitar acesso, correção,
                eliminação, portabilidade ou anonimização dos seus dados.
                Basta enviar um e-mail para{" "}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-brand-green underline"
                >
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>

              <h2 className="font-display text-2xl font-bold text-ink">
                6. Segurança
              </h2>
              <p>
                Adotamos medidas técnicas e organizacionais para proteger
                seus dados contra acesso não autorizado, perda ou alteração.
              </p>

              <h2 className="font-display text-2xl font-bold text-ink">
                7. Atualizações
              </h2>
              <p>
                Esta política pode ser atualizada periodicamente. A versão
                vigente é sempre a publicada nesta página.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
