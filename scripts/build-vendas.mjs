// build-vendas.mjs — gera public/vendas.html a partir do design exportado do Claude Design.
//
// Fonte:  _design/claude-design/Landing Vendas v2.dc.html (+ animations-v3.jsx, virada-demo.jsx)
// Saída:  public/vendas.html  (HTML estático, conteúdo já renderizado)
//         public/vendas-hero.js (React + motor de animação + mini-vídeo do hero, compilado com tsc)
//
// Uso: node scripts/build-vendas.mjs
// Depois de re-exportar o projeto no Claude Design, basta rodar de novo.

import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DESIGN = join(ROOT, "_design", "claude-design");
const SRC = join(DESIGN, "Landing Vendas v2.dc.html");
const OUT_HTML = join(ROOT, "public", "vendas.html");
const OUT_JS = join(ROOT, "public", "vendas-hero.js");

// Valores dos "Tweaks" do Claude Design. checkoutUrl e whatsapp ficam vazios
// de propósito: são preenchidos direto no vendas.html (bloco CONFIG no topo).
const PROPS = { checkoutUrl: "https://pay.kiwify.com.br/QUVGK3y", plataforma: "Kiwify", preco: 47, precoDepois: 150, horasOferta: 24, whatsapp: "5577999872390" };
// TODO(kiwify): domínio final da landing (ex.: "https://codigodavirada.net.br"). Com ele, o og:image vira
// URL absoluta — WhatsApp/Instagram só mostram a capa com URL absoluta. Vazio = fica relativo.
const SITE_URL = "https://codigodavirada.net.br";

// A biblioteca foi enxugada e as "50 ideias de renda extra" saíram da entrega.
// A oferta não pode vender o que o app não entrega, então o bônus sai da landing
// aqui — e não no .dc.html, que é export do Claude Design e volta inteiro a cada
// reexportação do projeto.
function enxugarOferta(s) {
  // a capa na vitrine dos bônus; a grade de 4 colunas passa a 3
  s = s.replace(/\s*<figure[^>]*><img src="\.\/assets-landing\/bonus-renda-extra\.png"[\s\S]*?<\/figure>/, "");
  s = s.replace("grid-template-columns:repeat(4, 1fr); gap:10px; padding:16px 0 4px;",
                "grid-template-columns:repeat(3, 1fr); gap:10px; padding:16px 0 4px;");
  // a linha na lista "O que você leva"
  s = s.replace(/, \["Bônus 2 · 50 ideias de renda extra", "para começar do zero", 27\]/, "");
  // renumera os que ficaram (1 negociação, 2 plano, 3 checklist)
  s = s.replace(/Bônus 3 ·/g, "Bônus 2 ·").replace(/Bônus 4 ·/g, "Bônus 3 ·");
  s = s.replace(/4 bônus/g, "3 bônus");
  // O design estimava 5,3% de acréscimo no parcelamento e anunciava 5x de R$ 9,90.
  // A taxa real da Kiwify é 10,75%: o checkout mostra 5x de R$ 10,41. Anunciar
  // parcela menor do que a cobrada é o tipo de coisa que o comprador descobre
  // exatamente na hora de pagar.
  s = s.replace("(preco / 5) * 1.053", "(preco / 5) * 1.1075");
  return s;
}

const src = enxugarOferta(readFileSync(SRC, "utf8"));

// ── 1. Partes do .dc.html ─────────────────────────────────────────────────
const helmet = between(src, "<helmet>", "</helmet>")
  .replace('content="/assets/og-image.png"', `content="${SITE_URL}/assets/og-image.png"`);
const template = src.slice(src.indexOf("</helmet>") + "</helmet>".length, src.indexOf("</x-dc>"));
const logicSrc = between(src, /<script type="text\/x-dc"[^>]*>/, "</script>");

// ── 2. Dados: roda o renderVals() do design em Node ───────────────────────
// A classe estende DCLogic (runtime do Claude Design); aqui só precisamos de props/state.
const Component = new Function(
  logicSrc.replace("class Component extends DCLogic {", "class Component {") + "\nreturn Component;"
)();
const logic = new Component();
logic.props = PROPS;
logic.state = { now: Date.now() };
const vals = logic.renderVals();

// ── 3. Template → HTML ────────────────────────────────────────────────────
const hoverRules = new Map(); // css → classe
let html = template
  // ganchos pro script do cliente (temporizador e links configuráveis)
  .replace(/\{\{ (tH|tM|tS) \}\}/g, (_, k) => `<span data-count="${k[1].toLowerCase()}">{{ ${k} }}</span>`)
  .replace(/href="\{\{ checkoutUrl \}\}"/g, 'href="{{ checkoutUrl }}" data-checkout')
  .replace(/href="\{\{ whatsLink \}\}"/g, 'href="{{ whatsLink }}" data-whats')
  .replace(' title="Falar no WhatsApp"', ' data-whats-float title="Falar no WhatsApp"')
  .replace(/(<sc-if value="\{\{ ofertaAtiva \}\}"[^>]*>\s*<div )/g, "$1data-oferta ")
  // hero: o mini-vídeo é montado pelo vendas-hero.js
  .replace(/<x-import[^>]*ViradaDemo[^>]*><\/x-import>/, '<div id="virada-demo" style="position:absolute; inset:0;"></div>')
  .replace(/virada-design-system\/assets\/icon-192\.png/g, "/icons/icon-192.png")
  // capas dos bônus: o design exporta cópias em assets-landing/, iguais às de public/assets/
  .replace(/\.\/assets-landing\/bonus-negociacao\.png/g, "/assets/bonus-03-negociacao.png")
  .replace(/\.\/assets-landing\/bonus-renda-extra\.png/g, "/assets/bonus-02-renda-extra.png")
  .replace(/\.\/assets-landing\/bonus-plano-7-dias\.png/g, "/assets/bonus-04-plano-7-dias.png")
  .replace(/\.\/assets-landing\/bonus-checklist\.png/g, "/assets/bonus-05-checklist.png")
  .replace(/ data-screen-label="[^"]*"/g, "")
  .replace(/ hint-[a-z-]+="[^"]*"/g, "")
  .replace(/ style-hover="([^"]*)"/g, (_, css) => {
    if (!hoverRules.has(css)) hoverRules.set(css, `hv${hoverRules.size + 1}`);
    return ` class="${hoverRules.get(css)}"`;
  });

html = render(html, vals);

// ── 3b. Blocos que o design não traz e a venda pede ──────────────────────
// Vivem aqui, e não no .dc.html, para o arquivo do Claude Design seguir intacto
// quando ele for reexportado.

// Autoridade: quem está por trás. Sem rosto, comprador desconfiado não fecha.
const AUTORIDADE = `
    <div style="max-width:1200px; margin:0 auto; padding:56px 24px;">
      <div style="max-width:760px; margin:0 auto; background:#FFFFFF; border:1px solid #E5E9F0; border-radius:20px; padding:32px;">
        <p style="margin:0 0 6px; font-size:12px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:#B45309;">Quem fez</p>
        <h2 style="margin:0 0 16px; font-size:26px; line-height:1.2; font-weight:800; letter-spacing:-.02em; color:#0F172A;">Meu nome é Thiago Porto</h2>
        <p style="margin:0 0 12px; font-size:16px; line-height:1.7; color:#475569;">Fiz o Código da Virada porque me cansei de duas coisas: planilha que dá trabalho demais pra alimentar e ninguém mantém depois da primeira semana, e app de banco que só enxerga o que passa naquela conta &mdash; ignorando o dinheiro na mão, o Pix que caiu no outro banco, a venda de fim de semana.</p>
        <p style="margin:0 0 12px; font-size:16px; line-height:1.7; color:#475569;">Eu precisava de uma coisa que funcionasse na rotina de verdade: rápida, no celular, e que no fim juntasse tudo numa planilha decente sem eu ter que montar nada.</p>
        <p style="margin:0; font-size:16px; line-height:1.7; color:#475569;">Como não existia do jeito que eu queria, construí. Uso todo dia &mdash; e é o mesmo app que você recebe aqui.</p>
      </div>
    </div>
`;

// Ancoragem contra assinatura: a comparação que faz R$ 47 parecer simbólico.
// Sem citar marca: preço de concorrente muda e vira propaganda enganosa.
const ANCORAGEM = `
    <div style="max-width:1200px; margin:0 auto; padding:0 24px 8px;">
      <div style="max-width:760px; margin:0 auto; display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:14px;">
        <div style="background:#F8FAFC; border:1px solid #E5E9F0; border-radius:16px; padding:20px;">
          <p style="margin:0 0 8px; font-size:13px; font-weight:700; color:#64748B;">App de controle por assinatura</p>
          <p style="margin:0 0 6px; font-size:24px; font-weight:800; color:#0F172A;">R$ 29 a R$ 39 <span style="font-size:15px; font-weight:600; color:#64748B;">/ mês</span></p>
          <p style="margin:0; font-size:14px; line-height:1.6; color:#475569;">Mais de R$ 350 por ano. Parou de pagar, perdeu o acesso ao seu histórico.</p>
        </div>
        <div style="background:#DCFCE7; border:1px solid #86EFAC; border-radius:16px; padding:20px;">
          <p style="margin:0 0 8px; font-size:13px; font-weight:700; color:#15803D;">Código da Virada</p>
          <p style="margin:0 0 6px; font-size:24px; font-weight:800; color:#0F172A;">R$ 47 <span style="font-size:15px; font-weight:600; color:#15803D;">uma vez</span></p>
          <p style="margin:0; font-size:14px; line-height:1.6; color:#166534;">Pra sempre, com atualiza&ccedil;&otilde;es gr&aacute;tis. E os dados ficam no seu celular e na sua conta Google.</p>
        </div>
      </div>
    </div>
`;

// Promessa com prazo: a headline é dor ("não sabe pra onde foi"), e dor não é
// promessa. O prazo entra no subtítulo, sem mexer no hero desenhado.
html = html.replace(
  "Um app que lança seus gastos em 10 segundos e uma planilha que se monta sozinha no seu Google Drive.",
  "<strong style=\"color:#fff;\">Em uma semana você sabe pra onde foi seu dinheiro.</strong> Um app que lança seus gastos em 10 segundos e uma planilha que se monta sozinha no seu Google Drive.",
);

html = html.replace("<footer", AUTORIDADE + "<footer");
{
  const marca = '<section id="comprar"';
  const i = html.indexOf(marca);
  if (i !== -1) html = html.slice(0, i) + ANCORAGEM + html.slice(i);
}

const hoverCss = [...hoverRules].map(([css, cls]) => `  .${cls}:hover { ${css} }`).join("\n");

// ── 4. Hero: compila os JSX com o tsc do projeto e junta com o React UMD ──
const tmp = join(tmpdir(), "virada-vendas-hero");
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
// chama o tsc do projeto direto pelo node (sem shell: o caminho tem espaço)
execFileSync(process.execPath, [
  join(ROOT, "node_modules/typescript/bin/tsc"),
  "--allowJs", "--jsx", "react", "--target", "es2019", "--module", "none", "--skipLibCheck", "--outDir", tmp,
  join(DESIGN, "animations-v3.jsx"), join(DESIGN, "virada-demo.jsx"),
], { stdio: "inherit" });
const heroJs = [
  "/* vendas-hero.js — gerado por scripts/build-vendas.mjs. Não editar à mão. */",
  readFileSync(join(ROOT, "node_modules/react/umd/react.production.min.js"), "utf8"),
  readFileSync(join(ROOT, "node_modules/react-dom/umd/react-dom.production.min.js"), "utf8"),
  readFileSync(join(tmp, "animations-v3.js"), "utf8"),
  readFileSync(join(tmp, "virada-demo.js"), "utf8"),
  `(function(){var el=document.getElementById("virada-demo");if(el&&window.ViradaDemo){ReactDOM.createRoot(el).render(React.createElement(window.ViradaDemo));}})();`,
].join("\n;\n");
writeFileSync(OUT_JS, heroJs);

// ── 5. Página final ───────────────────────────────────────────────────────
const page = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="/assets/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
${helmet.trim()} <!-- título, description e OG vêm do design -->
<style>
${hoverCss}
  #virada-demo [data-om-starter] { background:#0F172A !important; }
  /* barra de player (pausar/arrastar/baixar) é ferramenta do editor, não entra na página */
  #virada-demo [data-omelette-chrome] { display:none !important; }
</style>
<script>
  // ─── CONFIG (preencha aqui) — checklist completo em docs/POS-CADASTRO-KIWIFY.md ──
  // Checkout do produto na Kiwify (Produtos > Links). Vazio = cai no WhatsApp.
  var CHECKOUT_URL = "https://pay.kiwify.com.br/QUVGK3y";
  // TODO(kiwify): WhatsApp do suporte, só números com DDI+DDD (ex.: "5575999990000"). Vazio = esconde o botão flutuante.
  var WHATSAPP = "5577999872390";
  // Duração da oferta por visitante, em horas (0 desliga a faixa amarela).
  var HORAS_OFERTA = ${PROPS.horasOferta};
</script>
</head>
<body>
${html.trim()}
<script>
(function () {
  // Links configuráveis
  var whatsNum = WHATSAPP.replace(/\\D/g, "");
  document.querySelectorAll("a[data-checkout]").forEach(function (a) {
    if (CHECKOUT_URL) { a.href = CHECKOUT_URL; return; }
    // Sem checkout, o botão apontava para "#comprar" e só rolava a página: quem
    // decidiu comprar batia numa parede. Enquanto o link não existe, cai no
    // WhatsApp, onde o agente atende 24h e fecha a venda.
    if (whatsNum) {
      a.href = "https://wa.me/" + whatsNum + "?text=" + encodeURIComponent("Quero comprar o Código da Virada. Me manda o link de pagamento?");
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
    }
  });
  var whats = WHATSAPP.replace(/\\D/g, "");
  document.querySelectorAll("a[data-whats]").forEach(function (a) {
    if (whats) a.href = "https://wa.me/" + whats + "?text=" + encodeURIComponent("Oi! Tenho uma dúvida sobre o Código da Virada.");
    else a.style.display = "none";
  });

  // Temporizador por visitante: começa na primeira visita e fica salvo no aparelho
  if (!(HORAS_OFERTA > 0)) { document.querySelectorAll("[data-oferta]").forEach(function (el) { el.style.display = "none"; }); return; }
  function deadline() {
    var key = "virada-oferta-fim";
    try {
      var saved = Number(localStorage.getItem(key));
      if (saved && saved > Date.now()) return saved;
      var end = Date.now() + HORAS_OFERTA * 3600 * 1000;
      localStorage.setItem(key, String(end));
      return end;
    } catch (e) { return Date.now() + HORAS_OFERTA * 3600 * 1000; }
  }
  var pad = function (n) { return String(n).padStart(2, "0"); };
  var els = { h: document.querySelectorAll('[data-count="h"]'), m: document.querySelectorAll('[data-count="m"]'), s: document.querySelectorAll('[data-count="s"]') };
  var timer;
  function tick() {
    let rest = Math.max(0, deadline() - Date.now());
    if (rest === 0) { // zerou: renova a janela em vez de travar em 00:00:00
      try { localStorage.removeItem("virada-oferta-fim"); } catch (e) {}
      rest = Math.max(0, deadline() - Date.now());
    }
    var v = { h: pad(Math.floor(rest / 3600000)), m: pad(Math.floor((rest % 3600000) / 60000)), s: pad(Math.floor((rest % 60000) / 1000)) };
    for (var k in els) els[k].forEach(function (el) { el.textContent = v[k]; });
  }
  tick(); timer = setInterval(tick, 1000);
})();
</script>
<script src="/vendas-hero.js" defer></script>
</body>
</html>
`;
writeFileSync(OUT_HTML, page);
console.log(`ok: ${OUT_HTML} (${(page.length / 1024).toFixed(0)} KB) + ${OUT_JS} (${(heroJs.length / 1024).toFixed(0)} KB)`);

// ── helpers ───────────────────────────────────────────────────────────────
function between(s, open, close) {
  const m = typeof open === "string" ? { index: s.indexOf(open), 0: open } : s.match(open);
  const start = m.index + m[0].length;
  return s.slice(start, s.indexOf(close, start));
}

function escapeHtml(v) {
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function lookup(path, ctx) {
  if (path === "true") return true;
  if (path === "false") return false;
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), ctx);
}

// Renderiza sc-if / sc-for (com aninhamento) e {{ caminho }} do template do Claude Design.
function render(tpl, ctx) {
  let out = "";
  let i = 0;
  const openRe = /<sc-(if|for)\b([^>]*)>/g;
  while (true) {
    openRe.lastIndex = i;
    const m = openRe.exec(tpl);
    if (!m) { out += interpolate(tpl.slice(i), ctx); break; }
    out += interpolate(tpl.slice(i, m.index), ctx);
    const tag = m[1];
    const bodyStart = m.index + m[0].length;
    const end = matchClose(tpl, bodyStart, tag);
    const body = tpl.slice(bodyStart, end);
    if (tag === "if") {
      const expr = /value="\{\{ ([^}]+) \}\}"/.exec(m[2])[1].trim();
      if (lookup(expr, ctx)) out += render(body, ctx);
    } else {
      const list = /list="\{\{ ([^}]+) \}\}"/.exec(m[2])[1].trim();
      const as = /as="([^"]+)"/.exec(m[2])[1];
      for (const item of lookup(list, ctx) ?? []) out += render(body, { ...ctx, [as]: item });
    }
    i = end + `</sc-${tag}>`.length;
  }
  return out;
}

function matchClose(tpl, from, tag) {
  const re = new RegExp(`<sc-${tag}\\b|</sc-${tag}>`, "g");
  re.lastIndex = from;
  let depth = 1;
  let m;
  while ((m = re.exec(tpl))) {
    depth += m[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return m.index;
  }
  throw new Error(`</sc-${tag}> não encontrado`);
}

function interpolate(s, ctx) {
  return s.replace(/\{\{ ([^}]+) \}\}/g, (_, path) => {
    const v = lookup(path.trim(), ctx);
    if (v === undefined) throw new Error(`variável não encontrada no template: ${path}`);
    return escapeHtml(v);
  });
}
