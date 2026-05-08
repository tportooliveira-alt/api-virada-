import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Obrigado! Seu ebook está a caminho — Código da Virada",
};

// 👇 Substitua pelo link real do PDF após subir o arquivo
const PDF_DOWNLOAD_URL = "#download";

export default function ObrigadoPage() {
  return (
    <main className="min-h-screen bg-[#07111f] text-white flex flex-col items-center justify-start">
      {/* ───── CONFIRMAÇÃO ───── */}
      <section className="w-full max-w-2xl px-6 pt-16 pb-10 text-center">
        <span className="text-6xl">🎉</span>
        <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-green-400">
          Compra confirmada!
        </h1>
        <p className="mt-3 text-slate-300 text-lg">
          Bem-vindo ao <strong>Código da Virada</strong>. Sua jornada financeira começa agora.
        </p>
        <p className="mt-2 text-slate-500 text-sm">
          Você também vai receber um e-mail com o link de acesso ao ebook.
        </p>

        {/* Botão de download */}
        <a
          href={PDF_DOWNLOAD_URL}
          className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-green-500 hover:bg-green-400 active:scale-95 transition-all text-black font-extrabold text-lg px-8 py-4 shadow-lg shadow-green-700/40"
        >
          📥 BAIXAR MEU EBOOK AGORA
        </a>
      </section>

      {/* ───── DIVISOR ───── */}
      <div className="w-full max-w-2xl px-6">
        <div className="border-t border-white/10 pt-10">
          {/* UPSELL: APP */}
          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 px-6 py-8 text-center">
            <span className="text-3xl">🚀</span>
            <h2 className="mt-3 text-2xl font-bold text-white">
              Quer acelerar de verdade?
            </h2>
            <p className="mt-3 text-slate-300 text-sm max-w-md mx-auto">
              O ebook te dá o método. O <strong className="text-green-400">App Código da Virada</strong> coloca o método em prática automaticamente — planilha inteligente, controle de dívidas, metas e fluxo de caixa, tudo em um só lugar.
            </p>
            <ul className="mt-5 space-y-2 text-left max-w-sm mx-auto text-sm text-slate-300">
              {[
                "Planilha Google Sheets gerada em 1 clique",
                "Controle de receitas, despesas e dívidas",
                "Metas financeiras com progresso visual",
                "Fluxo de caixa mês a mês automático",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <Link
                href="/"
                className="inline-block rounded-2xl bg-white hover:bg-slate-100 active:scale-95 transition-all text-black font-extrabold text-base px-8 py-3 shadow"
              >
                CONHECER O APP →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ───── FOOTER ───── */}
      <footer className="mt-12 text-center py-8 text-slate-600 text-xs">
        <p>© 2026 Código da Virada · Todos os direitos reservados.</p>
      </footer>
    </main>
  );
}
