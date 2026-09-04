import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CalendarCheck, CheckCircle2, HandCoins, ListChecks, MessageCircle } from "lucide-react";
import { InstallGuide } from "@/components/InstallGuide";

/**
 * Página de obrigado — para onde a plataforma manda quem acabou de pagar.
 *
 * São dois passos, nessa ordem: BAIXAR o app e DESTRAVAR o acesso.
 *  - Baixar primeiro porque no iPhone o app instalado tem armazenamento próprio:
 *    quem entra pelo Safari e só depois instala precisa entrar de novo lá dentro.
 *  - Destravar é o passo que dá errado: o acesso é liberado pelo E-MAIL DA COMPRA
 *    e o app entra com Google. Quem compra com um e-mail e tenta entrar com outro
 *    fica de fora, acha que foi golpe e pede reembolso. Esta tela avisa antes.
 *
 * Fica fora de /app de propósito: quem chega aqui ainda não passou pelo login
 * (o AuthGate trata `/obrigado` como tela aberta).
 */
export const metadata: Metadata = {
  title: "Compra confirmada — Código da Virada",
  robots: { index: false, follow: false },
};

const EXTRAS = [
  { href: "/downloads/ebook-codigo-da-virada.pdf", icon: BookOpen, label: "E-book Código da Virada", desc: "O método em 5 capítulos, em PDF." },
  { href: "/biblioteca/negociacao/index.html", icon: HandCoins, label: "Negociar dívida", desc: "Calcula o desconto justo e escreve a carta pro banco." },
  { href: "/downloads/plano-7-dias.pdf", icon: CalendarCheck, label: "Plano de 7 dias", desc: "Uma tarefa por dia, a primeira semana inteira." },
  { href: "/downloads/checklist-mensal.pdf", icon: ListChecks, label: "Checklist mensal", desc: "A revisão de 15 minutos que segura o mês." },
];

function PassoChip({ numero, titulo }: { numero: number; titulo: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-green-500 text-[13px] font-bold text-green-900">
        {numero}
      </span>
      <h2 className="text-lg font-semibold text-ink-900">{titulo}</h2>
    </div>
  );
}

export default function ObrigadoPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-16">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-9 w-9 shrink-0 text-green-700" aria-hidden />
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-green-700">Pagamento confirmado</p>
          <h1 className="text-2xl font-semibold text-ink-900 sm:text-3xl">Seu acesso está liberado.</h1>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-ink-600">
        Faltam dois passos, nesta ordem: baixar o app no celular e destravar o acesso com o e-mail da compra.
        Leva um minuto.
      </p>

      <section className="mt-8">
        <PassoChip numero={1} titulo="Baixe o app" />
        <InstallGuide />
      </section>

      <section className="mt-10">
        <PassoChip numero={2} titulo="Destrave o acesso" />

        <div className="rounded-2xl border-2 border-amber-500 bg-amber-50 p-5 shadow-card">
          <p className="text-sm leading-6 text-ink-700">
            O app abre com sua conta Google. Entre com{" "}
            <strong className="font-semibold text-ink-900">o mesmo e-mail que você usou na compra</strong> — é por ele
            que o acesso foi liberado. Com outro e-mail, o app não vai te reconhecer.
          </p>
        </div>

        <p className="mt-4 text-sm leading-6 text-ink-500">
          Já instalou? Abra pelo ícone novo na tela inicial e entre por lá — assim você entra uma vez só.
        </p>

        <Link
          href="/app"
          className="mt-3 flex w-full items-center justify-center rounded-xl bg-green-500 py-4 text-base font-bold text-green-900 transition hover:bg-green-400"
        >
          Abrir o app e entrar
        </Link>
        <p className="mt-3 text-center text-xs text-ink-500">
          Acabou de pagar? O acesso pode levar 1 a 2 minutos para aparecer. Se der &ldquo;conta não encontrada&rdquo;,
          espere um pouco e tente de novo.
        </p>
      </section>

      <h2 className="mt-12 text-lg font-semibold text-ink-900">O que veio junto</h2>
      <p className="mt-1 text-sm text-ink-500">
        Tudo isso também fica dentro do app, no menu. Aqui é só para você já baixar.
      </p>
      <ul className="mt-4 grid gap-3">
        {EXTRAS.map(({ href, icon: Icon, label, desc }) => (
          <li key={href}>
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-3 rounded-lg border border-ink-200 bg-white p-4 shadow-card transition hover:border-green-700/50"
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-green-700" aria-hidden />
              <span>
                <span className="block text-sm font-semibold text-ink-900">{label}</span>
                <span className="block text-sm text-ink-500">{desc}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>

      <section className="mt-10 rounded-lg border border-ink-200 bg-white p-5 shadow-card">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink-900">
          <MessageCircle className="h-5 w-5 text-green-700" aria-hidden />
          Travou em alguma coisa?
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-500">
          Chama no WhatsApp que a gente resolve. Você tem 7 dias de garantia — se não for pra você, é só pedir o
          dinheiro de volta, sem justificativa.
        </p>
        <a
          href="https://wa.me/5577999872390"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center justify-center rounded-xl border border-green-700/40 bg-green-50 px-5 py-2.5 text-sm font-semibold text-green-700 transition hover:bg-green-100"
        >
          Falar no WhatsApp
        </a>
      </section>
    </main>
  );
}
