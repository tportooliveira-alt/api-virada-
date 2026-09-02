import React from "react";

const TONES = {
  default:  { bg: "var(--surface-card)", border: "var(--border-default)", value: "var(--text-primary)" },
  positive: { bg: "var(--surface-card)", border: "var(--border-default)", value: "var(--text-positive)" },
  negative: { bg: "var(--surface-card)", border: "var(--border-default)", value: "var(--text-negative)" },
  accent:   { bg: "var(--surface-accent-soft)", border: "var(--border-accent)", value: "var(--text-primary)" },
  inverse:  { bg: "var(--surface-inverse-muted)", border: "transparent", value: "var(--text-on-inverse)" }
};

export function StatCard({ label, value, helper, tone = "default", icon }) {
  const t = TONES[tone];
  const onDark = tone === "inverse";
  return (
    <div style={{ borderRadius: "var(--radius-lg)", background: t.bg, border: "1px solid " + t.border, padding: "14px 16px", minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: "var(--text-xs)", color: onDark ? "var(--text-on-inverse-muted)" : "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
        {icon}{label}
      </p>
      <p style={{ margin: "6px 0 0", fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: t.value, whiteSpace: "nowrap" }}>{value}</p>
      {helper ? <p style={{ margin: "4px 0 0", fontSize: "var(--text-xs)", color: onDark ? "var(--color-ink-500)" : "var(--text-muted)" }}>{helper}</p> : null}
    </div>
  );
}
