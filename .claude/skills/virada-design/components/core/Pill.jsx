import React from "react";

const TONES = {
  positive: ["var(--state-positive-bg)", "var(--state-positive-fg)"],
  negative: ["var(--state-negative-bg)", "var(--state-negative-fg)"],
  warning:  ["var(--state-warning-bg)", "var(--state-warning-fg)"],
  info:     ["var(--state-info-bg)", "var(--state-info-fg)"],
  neutral:  ["var(--state-neutral-bg)", "var(--state-neutral-fg)"],
  onDark:   ["rgba(34,197,94,0.14)", "var(--color-green-300)"]
};

export function Pill({ tone = "neutral", dot = false, size = "md", children }) {
  const [bg, fg] = TONES[tone];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: "var(--radius-pill)", background: bg, color: fg, padding: size === "sm" ? "2px 8px" : "6px 12px", fontSize: size === "sm" ? 10 : "var(--text-sm)", fontWeight: 700, letterSpacing: size === "sm" ? "0.06em" : 0, textTransform: size === "sm" ? "uppercase" : "none", whiteSpace: "nowrap" }}>
      {dot ? <span style={{ width: 8, height: 8, borderRadius: 999, background: "currentColor" }} /> : null}
      {children}
    </span>
  );
}
