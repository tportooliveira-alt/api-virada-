import React from "react";

function formatBRL(digits) {
  const n = Number(digits || "0") / 100;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Campo de valor em reais. Guarda centavos como inteiro; aceita vírgula, ponto e teclado numérico. */
export function CurrencyInput({ label = "Valor", cents = 0, onChange, autoFocus = false, size = "lg" }) {
  const display = formatBRL(String(cents));
  function handle(e) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
    onChange(Number(digits));
  }
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", background: "var(--surface-card)", padding: "14px 16px" }}>
      <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "var(--tracking-caps-sm)", color: "var(--text-muted)" }}>{label}</span>
      <input inputMode="numeric" autoFocus={autoFocus} value={display} onChange={handle}
        style={{ border: 0, outline: "none", background: "transparent", width: "100%", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: size === "lg" ? "var(--text-4xl)" : "var(--text-2xl)", letterSpacing: "var(--tracking-tighter)", color: cents ? "var(--text-primary)" : "var(--text-faint)", fontVariantNumeric: "tabular-nums" }} />
    </label>
  );
}
