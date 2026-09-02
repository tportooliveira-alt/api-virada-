import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Banknote, CheckCircle2, FileSpreadsheet, Gauge, ShieldCheck } from "lucide-react";

export default function HomePage() {
  const pillars = [
    {
      title: "Clareza do caixa",
      text: "Voce enxerga quanto entrou, quanto saiu e qual e o resultado real do mes.",
      icon: <Gauge className="h-5 w-5" />,
    },
    {
      title: "Plano de acao",
      text: "Metas, dividas, gastos e renda extra ficam organizados em passos simples.",
      icon: <CheckCircle2 className="h-5 w-5" />,
    },
    {
      title: "Planilha pronta",
      text: "Os dados viram uma base estruturada para acompanhar sua evolucao sem comecar do zero.",
      icon: <FileSpreadsheet className="h-5 w-5" />,
    },
  ];

  return (
    <main className="min-h-screen bg-virada-bg text-white">
      <section className="mx-auto grid min-h-[92vh] w-full max-w-6xl items-center gap-10 px-5 py-8 md:grid-cols-[1.02fr_0.98fr] lg:px-8">
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-virada-green/30 bg-virada-green/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            <Banknote className="h-4 w-4" />
            Educacao financeira pratica
          </div>

          <div className="space-y-5">
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
              O Codigo da Virada e um metodo para sair do aperto e retomar o controle do dinheiro.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-virada-gray sm:text-lg">
              A Virada junta ebook, app, planilha e missoes praticas para ajudar voce a organizar gastos,
              entender suas dividas, criar metas e transformar pequenas decisoes diarias em progresso financeiro.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="/app/inicio"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-virada-green px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
            >
              Quero minha virada <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/app/inicio"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Ja sou aluno <ShieldCheck className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[460px]">
          <div className="absolute inset-8 rounded-full bg-virada-green/20 blur-3xl" />
          <Image
            src="/assets/mockup-3d.png"
            alt="Mockup do Codigo da Virada"
            width={860}
            height={860}
            priority
            className="relative z-10 h-auto w-full object-contain drop-shadow-2xl"
          />
        </div>
      </section>

      <section className="border-y border-virada-line bg-white/[0.035]">
        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-3 lg:px-8">
          {pillars.map((item) => (
            <article key={item.title} className="rounded-lg border border-virada-line bg-white/[0.045] p-5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-virada-green/10 text-emerald-300">
                {item.icon}
              </div>
              <h2 className="text-lg font-semibold text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-virada-gray">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-virada-gold">O que voce recebe</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-white">Nao e promessa magica. E direcao, registro e constancia.</h2>
        </div>
        <div className="grid gap-3 text-sm leading-6 text-virada-gray">
          <p>
            A Virada foi criada para quem cansou de tentar controlar a vida financeira so na memoria. O metodo mostra
            onde o dinheiro esta vazando, quais contas precisam de prioridade e que pequenas acoes podem gerar folego.
          </p>
          <p>
            O app funciona como um painel do dia a dia: voce lanca entradas e gastos, acompanha metas, monitora dividas
            e consulta a planilha organizada por tras. O ebook explica a mentalidade e o passo a passo para usar tudo sem complicar.
          </p>
        </div>
      </section>
    </main>
  );
}
