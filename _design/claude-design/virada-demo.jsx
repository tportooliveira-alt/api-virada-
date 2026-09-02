/* virada-demo.jsx — "mini vídeo": lança no celular → planilha abre no computador. Depende de animations-v3.jsx (carregado antes). */
(function () {
  const { CompositionStage, useComposition, animate, Easing, Captions, clamp } = window;
  const INK = "#0F172A", GREEN = "#22C55E", GREEN_D = "#15803D", AMBER = "#F5C542", LINE = "#E5E9F0", MUTED = "#64748B";
  const FONT = "Onest, system-ui, sans-serif", DISPLAY = "Figtree, Onest, sans-serif";
  const M = {
    enter: (s, e) => animate({ from: 0, to: 1, start: s, end: e, ease: Easing.easeOutCubic }),
    pop: (s, e) => animate({ from: 0.85, to: 1, start: s, end: e, ease: Easing.easeOutBack }),
    move: (from, to, s, e) => animate({ from, to, start: s, end: e, ease: Easing.easeInOutCubic })
  };
  const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  function Screen({ show, children }) {
    return <div style={{ position: "absolute", inset: 0, opacity: show, pointerEvents: "none", display: "flex", flexDirection: "column", gap: 10, padding: "14px 12px" }}>{children}</div>;
  }
  const Eyebrow = ({ children }) => <p style={{ margin: 0, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "#B45309" }}>{children}</p>;
  const Title = ({ children }) => <p style={{ margin: "3px 0 0", fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", color: INK }}>{children}</p>;
  const Nav = ({ active }) => (
    <div style={{ marginTop: "auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 3, borderRadius: 12, border: `1px solid ${LINE}`, padding: 4, fontSize: 9, textAlign: "center", color: MUTED }}>
      {["Início", "Lançar", "Relatórios", "Conta"].map((l) => <span key={l} style={{ borderRadius: 8, padding: "7px 0", background: l === active ? "#DCFCE7" : "transparent", color: l === active ? "#166534" : MUTED, fontWeight: l === active ? 700 : 500 }}>{l}</span>)}
    </div>
  );
  function Finger({ x, y, at, T }) {
    const u = clamp((T - at) / 0.35, 0, 1);
    const press = u < 0.5 ? u * 2 : 2 - u * 2;
    return <div style={{ position: "absolute", left: x - 16, top: y - 16, width: 32, height: 32, borderRadius: 999, background: "rgba(34,197,94,0.35)", border: "2px solid rgba(34,197,94,0.9)", transform: `scale(${0.6 + press * 0.6})`, opacity: T >= at && T < at + 0.6 ? 1 : 0 }} />;
  }

  function Piece() {
    const { T, CUES, authoredTotal } = useComposition();
    const c = CUES;
    const fadeOut = 1 - M.enter(authoredTotal - 0.6, authoredTotal - 0.05)(T);
    const between = (a, b, fade = 0.35) => Math.min(M.enter(a - fade, a)(T), 1 - M.enter(b - fade, b)(T));

    // ── Lançar
    const typed = Math.floor(clamp((T - (c.Lançar + 0.4)) / 1.0, 0, 1) * 4); // 0..4 dígitos → 3590
    const cents = [0, 3, 35, 359, 3590][typed];
    const catOn = T > c.Lançar + 1.5;
    const toast = M.enter(c.Lançar + 2.45, c.Lançar + 2.75)(T) * (1 - M.enter(c.Início - 0.2, c.Início)(T));
    // ── Início
    const saldo = animate({ from: 0, to: 1260.8, start: c.Início + 0.2, end: c.Início + 1.3, ease: Easing.easeOutExpo })(T);
    const bars = [["Moradia", 950, GREEN], ["Mercado", 498.9, AMBER], ["Transporte", 204.9, "#3B82F6"], ["Lazer", 199.9, "#EF4444"]];
    // ── Exportar
    const conectando = T > c.Exportar + 0.9;
    const fly = clamp((T - (c.Exportar + 1.1)) / 0.9, 0, 1);
    const flyX = 300 + fly * 470, flyY = 330 - Math.sin(fly * Math.PI) * 180;
    const laptopOn = M.enter(c.Exportar + 1.95, c.Exportar + 2.4)(T);
    // ── Planilha
    const P = c.Planilha;
    const banner = M.enter(P, P + 0.5)(T);
    const kpi = (i) => M.enter(P + 0.5 + i * 0.15, P + 0.9 + i * 0.15)(T);
    const kpiPop = (i) => M.pop(P + 0.5 + i * 0.15, P + 1.0 + i * 0.15)(T);
    const rows = [["02/01/2026", "Entrada", "Salário", 1507], ["04/01/2026", "Saída", "Água", 98], ["06/01/2026", "Entrada", "Venda", 1553], ["07/01/2026", "Saída", "Farmácia", 115], ["10/01/2026", "Saída", "Pet", 132], ["13/01/2026", "Saída", "Combustível", 149]];
    const rowIn = (i) => M.enter(P + 1.4 + i * 0.12, P + 1.7 + i * 0.12)(T);
    const kpis = [["ENTRADAS", 27855, false], ["SAÍDAS", 12231, false], ["SALDO ATUAL", 15624, true]];
    const count = (v, i) => Math.round(v * animate({ from: 0, to: 1, start: P + 0.6 + i * 0.15, end: P + 1.6 + i * 0.15, ease: Easing.easeOutExpo })(T));

    const phoneScreenShift = M.move(0, -6, c.Exportar + 1.9, c.Exportar + 2.6)(T);
    return (
      <div style={{ position: "absolute", inset: 0, fontFamily: FONT, color: INK, opacity: fadeOut }}>
        {/* Celular */}
        <div style={{ position: "absolute", left: 70, top: 40, width: 270, height: 520, borderRadius: 38, background: "#1E293B", padding: 10, boxShadow: "0 30px 70px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.08)", transform: `translateY(${phoneScreenShift}px)` }}>
          <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 30, background: "#FFFFFF", overflow: "hidden" }}>
            <Screen show={between(0, c.Início)}>
              <Eyebrow>Fluxo de caixa no celular</Eyebrow><Title>Lançar</Title>
              <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 9, background: "#F1F5F9", fontSize: 10, fontWeight: 600 }}><span style={{ flex: 1, textAlign: "center", padding: 6, borderRadius: 7, background: "#fff", boxShadow: "0 1px 3px rgba(15,23,42,.12)" }}>Gasto</span><span style={{ flex: 1, textAlign: "center", padding: 6, color: MUTED }}>Entrada</span></div>
              <div style={{ borderRadius: 14, border: `1px solid ${LINE}`, padding: "10px 12px" }}><p style={{ margin: 0, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", color: MUTED }}>Valor</p><p style={{ margin: "3px 0 0", fontFamily: DISPLAY, fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: cents ? INK : "#94A3B8", fontVariantNumeric: "tabular-nums" }}>{brl(cents / 100)}</p></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5 }}>{["Mercado", "Energia", "Transporte", "Saúde", "Delivery", "Lazer", "Cartão", "Outros"].map((l) => <span key={l} style={{ borderRadius: 9, padding: "9px 0", textAlign: "center", fontSize: 9, fontWeight: 600, border: `1px solid ${l === "Mercado" && catOn ? INK : LINE}`, background: l === "Mercado" && catOn ? INK : "#fff", color: l === "Mercado" && catOn ? "#fff" : "#334155" }}>{l}</span>)}</div>
              <div style={{ borderRadius: 10, background: GREEN, color: "#052E16", padding: 11, textAlign: "center", fontSize: 12, fontWeight: 700 }}>Confirmar gasto</div>
              <div style={{ position: "absolute", left: 12, right: 12, bottom: 64, borderRadius: 12, background: INK, color: "#fff", padding: "10px 12px", fontSize: 11, fontWeight: 600, opacity: toast, transform: `translateY(${(1 - toast) * 10}px)` }}>Gasto de R$ 35,90 registrado em Mercado. <span style={{ color: "#86EFAC" }}>Desfazer</span></div>
              <Nav active="Lançar" />
            </Screen>
            <Screen show={between(c.Início, c.Exportar)}>
              <Eyebrow>Fluxo de caixa no celular</Eyebrow><Title>Resumo financeiro</Title>
              <div style={{ borderRadius: 14, background: INK, color: "#fff", padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ margin: 0, fontSize: 10, color: "#94A3B8" }}>Em caixa neste mês</p>
                <p style={{ margin: 0, fontFamily: DISPLAY, fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>{brl(saldo)}</p>
                <span style={{ alignSelf: "flex-start", borderRadius: 999, padding: "4px 9px", fontSize: 10, fontWeight: 600, background: "rgba(34,197,94,.14)", color: "#86EFAC", opacity: M.enter(c.Início + 1.2, c.Início + 1.5)(T) }}>● O caixa está respirando.</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}><div style={{ borderRadius: 9, background: "rgba(255,255,255,.06)", padding: 8 }}><p style={{ margin: 0, fontSize: 9, color: "#94A3B8" }}>Entradas</p><p style={{ margin: "3px 0 0", fontSize: 12, fontWeight: 700, color: "#4ADE80" }}>R$ 3.420,00</p></div><div style={{ borderRadius: 9, background: "rgba(255,255,255,.06)", padding: 8 }}><p style={{ margin: 0, fontSize: 9, color: "#94A3B8" }}>Gastos</p><p style={{ margin: "3px 0 0", fontSize: 12, fontWeight: 700 }}>R$ 2.159,20</p></div></div>
              </div>
              <div style={{ borderRadius: 12, border: `1px solid ${LINE}`, padding: 10, display: "flex", flexDirection: "column", gap: 7 }}>
                <Eyebrow>Pra onde está indo</Eyebrow>
                {bars.map(([n, v, col], i) => <div key={n}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#334155" }}><span>{n}</span><b style={{ fontVariantNumeric: "tabular-nums" }}>{brl(v)}</b></div><div style={{ height: 5, borderRadius: 999, background: "#F1F5F9", marginTop: 3 }}><div style={{ height: "100%", borderRadius: 999, background: col, width: `${(v / 950) * 100 * M.enter(c.Início + 0.6 + i * 0.12, c.Início + 1.4 + i * 0.12)(T)}%` }} /></div></div>)}
              </div>
              <Nav active="Início" />
            </Screen>
            <Screen show={between(c.Exportar, authoredTotal + 1)}>
              <Eyebrow>Fluxo de caixa no celular</Eyebrow><Title>Conta</Title>
              <div style={{ borderRadius: 14, border: "1px solid #FCD34D", background: "#FFFBEB", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <Eyebrow>Planilha Google</Eyebrow>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{conectando ? "Virada Financeira" : "Conectar sua planilha"}</p>
                <p style={{ margin: 0, fontSize: 10, lineHeight: 1.5, color: "#475569" }}>{conectando ? "Planilha criada no seu Google Drive." : "Seus lançamentos, dívidas e metas vão para uma planilha completa no seu Drive."}</p>
                <div style={{ borderRadius: 10, background: conectando ? "#DCFCE7" : GREEN, color: conectando ? GREEN_D : "#052E16", padding: 10, textAlign: "center", fontSize: 11, fontWeight: 700 }}>{conectando ? (T > c.Exportar + 2.0 ? "✓ Atualizada agora" : "Criando sua planilha…") : "Conectar Google Planilhas"}</div>
              </div>
              <div style={{ borderRadius: 12, border: `1px solid ${LINE}`, padding: 10, fontSize: 10, color: MUTED }}><b style={{ color: INK }}>Dados no seu celular</b><br />11 lançamentos · 6 dívidas · 4 metas</div>
              <Nav active="Conta" />
            </Screen>
          </div>
        </div>
        <Finger x={205} y={392} at={c.Lançar + 2.15} T={T} />
        <Finger x={205} y={262} at={c.Exportar + 0.75} T={T} />

        {/* partícula voando */}
        <div style={{ position: "absolute", left: flyX - 7, top: flyY - 7, width: 14, height: 14, borderRadius: 999, background: GREEN, boxShadow: "0 0 24px rgba(34,197,94,.9)", opacity: fly > 0 && fly < 1 ? 1 : 0 }} />

        {/* Notebook */}
        <div style={{ position: "absolute", left: 400, top: 70, width: 680, height: 430, borderRadius: 16, background: "#1E293B", padding: "12px 12px 0", boxShadow: "0 30px 70px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
          <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: "8px 8px 0 0", background: "#0B1220", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "#FFFFFF", opacity: laptopOn }}>
              {/* janela do Planilhas */}
              <div style={{ height: 34, background: "#F8FAFC", borderBottom: `1px solid ${LINE}`, display: "flex", alignItems: "center", gap: 10, padding: "0 12px" }}>
                <span style={{ width: 16, height: 20, borderRadius: 3, background: "#22A565" }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: "#334155", whiteSpace: "nowrap" }}>Virada Financeira — Planilhas Google</span>
                <span style={{ marginLeft: "auto", fontSize: 9, color: MUTED, border: `1px solid ${LINE}`, borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" }}>Salvo no Drive</span>
              </div>
              <div style={{ height: 20, background: "#FFFFFF", borderBottom: `1px solid ${LINE}`, display: "flex", gap: 14, padding: "0 12px", alignItems: "center", fontSize: 9, color: MUTED }}>{["Arquivo", "Editar", "Ver", "Inserir", "Formatar", "Dados"].map((m) => <span key={m}>{m}</span>)}</div>
              <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ borderRadius: 6, background: INK, color: "#fff", padding: "8px 12px", borderBottom: `2px solid ${GREEN}`, transform: `translateY(${(1 - banner) * -10}px)`, opacity: banner }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "-0.01em" }}>CÓDIGO DA VIRADA • BASE FINANCEIRA CLARA E ESTRUTURADA</p>
                  <p style={{ margin: "2px 0 0", fontSize: 8, color: "#94A3B8" }}>Atualizado agora pelo app</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                  {kpis.map(([l, v, hi], i) => <div key={l} style={{ borderRadius: 6, border: `1px solid ${hi ? "#86EFAC" : LINE}`, background: hi ? "#DCFCE7" : "#fff", padding: "8px 12px", opacity: kpi(i), transform: `scale(${kpiPop(i)})` }}><p style={{ margin: 0, fontSize: 8, fontWeight: 700, color: hi ? GREEN_D : MUTED, letterSpacing: ".04em" }}>{l}</p><p style={{ margin: "3px 0 0", fontFamily: DISPLAY, fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", color: hi ? GREEN_D : INK, fontVariantNumeric: "tabular-nums" }}>{brl(count(v, i))}</p></div>)}
                </div>
                <div style={{ border: `1px solid ${LINE}`, borderRadius: 6, overflow: "hidden", opacity: M.enter(P + 1.2, P + 1.5)(T) }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.1fr .8fr 1.2fr 1fr", background: "#F1F5F9", borderBottom: "1px solid #CBD5E1", fontSize: 8, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: ".04em" }}>{["Data", "Tipo", "Categoria", "Valor"].map((h) => <span key={h} style={{ padding: "6px 10px" }}>{h}</span>)}</div>
                  {rows.map(([d, t, cat, v], i) => <div key={d + cat} style={{ display: "grid", gridTemplateColumns: "1.1fr .8fr 1.2fr 1fr", fontSize: 10, color: "#334155", background: i % 2 ? "#F8FAFC" : "#fff", borderBottom: `1px solid ${LINE}`, opacity: rowIn(i), transform: `translateX(${(1 - rowIn(i)) * -8}px)` }}><span style={{ padding: "5px 10px" }}>{d}</span><span style={{ padding: "4px 10px" }}><span style={{ borderRadius: 999, padding: "1px 7px", fontSize: 8, fontWeight: 700, background: t === "Entrada" ? "#DCFCE7" : "#F1F5F9", color: t === "Entrada" ? GREEN_D : "#334155" }}>{t}</span></span><span style={{ padding: "5px 10px" }}>{cat}</span><span style={{ padding: "5px 10px", fontWeight: 700, color: GREEN_D, fontVariantNumeric: "tabular-nums" }}>{brl(v)}</span></div>)}
                </div>
                <div style={{ display: "flex", gap: 4, opacity: M.enter(P + 2.2, P + 2.5)(T) }}>{["Dashboard", "Lançamentos", "Receitas", "Despesas", "Dívidas", "Metas", "Fluxo de Caixa", "Resumo Mensal", "Como usar"].map((t, i) => <span key={t} style={{ borderRadius: 5, padding: "3px 8px", fontSize: 8, fontWeight: 600, background: i === 0 ? INK : "#fff", color: i === 0 ? "#fff" : "#334155", border: `1px solid ${i === 0 ? INK : LINE}` }}>{t}</span>)}</div>
              </div>
            </div>
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", opacity: 1 - laptopOn, color: "#334155", fontSize: 12 }}>aguardando o app…</div>
          </div>
        </div>
        <div style={{ position: "absolute", left: 380, top: 500, width: 720, height: 14, borderRadius: "0 0 14px 14px", background: "#334155" }} />

        <Captions items={[
          { at: 0, text: "1 · Lança em 10 segundos, digitando ou falando" },
          { at: c.Início, text: "2 · O saldo do mês aparece na hora" },
          { at: c.Exportar, text: "3 · Um toque em Conectar" },
          { at: c.Planilha, text: "4 · A planilha abre pronta no seu Google Drive" }
        ]} style={{ font: "600 20px Onest, system-ui, sans-serif", color: "#CBD5E1", letterSpacing: "-0.01em", left: "36%", right: "4%", textAlign: "left" }} />
      </div>
    );
  }

  function ViradaDemo() {
    const ref = React.useRef(null);
    React.useEffect(() => {
      const kick = () => window.dispatchEvent(new Event("resize"));
      requestAnimationFrame(kick); setTimeout(kick, 300);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(kick);
      const ro = new ResizeObserver(kick); if (ref.current) ro.observe(ref.current);
      return () => ro.disconnect();
    }, []);
    return (
      <div ref={ref} style={{ position: "relative", width: "100%", height: "100%" }}>
        <CompositionStage width={1160} height={600} scenes={window.OM_SCENES} playback={window.OM_PLAYBACK} bg="#0F172A" background="#0F172A" persistKey="virada-demo">
          <Piece />
        </CompositionStage>
      </div>
    );
  }
  window.ViradaDemo = ViradaDemo;
})();
