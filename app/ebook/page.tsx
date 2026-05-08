import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Código da Virada — Ebook | R$ 9,90",
  description:
    "O ebook que vai te mostrar como sair das dívidas, organizar seu dinheiro e dar a virada financeira que você precisa. Por apenas R$ 9,90.",
};

// 👇 Substitua pelo link de checkout da Hotmart/Kiwify quando criar o produto
const CHECKOUT_URL = "#checkout";

export default function EbookPage() {
  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      {/* ───── HERO ───── */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-16 pb-12 overflow-hidden">
        {/* glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(34,197,94,0.18),transparent_70%)]" />

        <span className="mb-4 inline-block rounded-full bg-green-500/20 px-4 py-1 text-sm font-semibold text-green-400 tracking-wide uppercase">
          Ebook Digital
        </span>

        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight max-w-xl">
          <span className="text-green-400">Código da Virada</span>
          <br />
          <span className="text-white">O guia completo para dar a virada financeira</span>
        </h1>

        <p className="mt-5 text-lg text-slate-300 max-w-lg">
          Aprenda a sair das dívidas, organizar cada centavo e construir metas reais — mesmo ganhando pouco. Método simples, sem enrolação.
        </p>

        {/* Capa placeholder */}
        <div className="mt-8 w-52 h-72 rounded-xl shadow-2xl shadow-green-900/40 border border-green-500/30 bg-gradient-to-br from-green-950 to-slate-900 flex flex-col items-center justify-center gap-2">
          <span className="text-5xl">📗</span>
          <p className="text-green-400 font-bold text-lg text-center leading-tight px-4">Código da Virada</p>
          <p className="text-slate-400 text-xs">ebook digital</p>
        </div>

        {/* Preço + CTA principal */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="flex items-end gap-2">
            <span className="text-slate-500 line-through text-base">R$ 47,00</span>
            <span className="text-green-400 text-4xl font-extrabold">R$ 9,90</span>
          </div>
          <p className="text-slate-400 text-sm">Acesso imediato · PDF em qualquer dispositivo</p>
          <a
            href={CHECKOUT_URL}
            className="mt-2 inline-block rounded-2xl bg-green-500 hover:bg-green-400 active:scale-95 transition-all text-black font-extrabold text-xl px-10 py-4 shadow-lg shadow-green-700/40"
          >
            QUERO O EBOOK AGORA →
          </a>
        </div>
      </section>

      {/* ───── O QUE VOCÊ VAI APRENDER ───── */}
      <section className="max-w-2xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold text-center text-white mb-8">O que você vai aprender</h2>
        <ul className="grid sm:grid-cols-2 gap-4">
          {[
            "Como mapear todas as suas dívidas de uma vez",
            "O método para pagar dívidas na ordem certa",
            "Como criar um orçamento que você realmente segue",
            "Estratégias para aumentar sua renda extra",
            "Como definir metas financeiras atingíveis",
            "O passo a passo para construir sua reserva de emergência",
          ].map((item) => (
            <li key={item} className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 p-4">
              <span className="text-green-400 mt-0.5 text-lg">✓</span>
              <span className="text-slate-200 text-sm leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ───── PARA QUEM É ───── */}
      <section className="max-w-2xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-center mb-6">Para quem é este ebook?</h2>
        <div className="space-y-3">
          {[
            "Quem está endividado e não sabe por onde começar",
            "Quem quer parar de gastar mais do que ganha",
            "Quem tenta poupar mas nunca consegue",
            "Quem quer uma virada financeira de verdade em 2026",
          ].map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3">
              <span className="text-green-400">→</span>
              <span className="text-slate-200 text-sm">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ───── GARANTIA ───── */}
      <section className="max-w-2xl mx-auto px-6 py-8 text-center">
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-6 py-6">
          <span className="text-4xl">🛡️</span>
          <h3 className="mt-3 text-lg font-bold text-yellow-400">Garantia de 7 dias</h3>
          <p className="mt-2 text-slate-300 text-sm">
            Se por qualquer motivo você não gostar, devolvemos 100% do seu dinheiro. Sem burocracia.
          </p>
        </div>
      </section>

      {/* ───── CTA FINAL ───── */}
      <section className="max-w-xl mx-auto px-6 py-10 text-center flex flex-col items-center gap-4">
        <h2 className="text-2xl font-bold">Pronto para dar a sua virada?</h2>
        <p className="text-slate-400 text-sm">Por menos que um café, você tem o mapa completo na mão.</p>
        <a
          href={CHECKOUT_URL}
          className="inline-block rounded-2xl bg-green-500 hover:bg-green-400 active:scale-95 transition-all text-black font-extrabold text-xl px-10 py-4 shadow-lg shadow-green-700/40"
        >
          COMPRAR POR R$ 9,90 →
        </a>
        <p className="text-slate-500 text-xs">Pagamento seguro · Acesso imediato ao PDF</p>
      </section>

      {/* ───── FOOTER ───── */}
      <footer className="text-center py-8 text-slate-600 text-xs border-t border-white/5">
        <p>© 2026 Código da Virada. Todos os direitos reservados.</p>
        <Link href="/" className="mt-2 inline-block text-green-700 hover:text-green-500 underline">
          Acessar o App →
        </Link>
      </footer>
    </main>
  );
}
