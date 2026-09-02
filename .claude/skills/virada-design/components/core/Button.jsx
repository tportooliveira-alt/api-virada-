import React from "react";

const VARIANTS = {
  primary:   { background: "var(--brand-primary)", color: "var(--brand-on-primary)", border: "1px solid transparent" },
  secondary: { background: "var(--surface-card)", color: "var(--text-primary)", border: "1px solid var(--border-default)" },
  ghost:     { background: "transparent", color: "var(--text-secondary)", border: "1px solid transparent" },
  danger:    { background: "var(--state-negative-bg)", color: "var(--text-negative)", border: "1px solid var(--color-red-100)" },
  inverse:   { background: "var(--surface-inverse)", color: "var(--text-on-inverse)", border: "1px solid transparent" }
};
const SIZES = {
  sm: { height: "var(--control-h-sm)", padding: "0 12px", fontSize: "var(--text-sm)", borderRadius: "var(--radius-md)" },
  md: { height: "var(--control-h-md)", padding: "0 16px", fontSize: "var(--text-base)", borderRadius: "var(--radius-md)" },
  lg: { height: "var(--control-h-lg)", padding: "0 20px", fontSize: "var(--text-md)", borderRadius: "var(--radius-lg)" }
};

export function Button({ variant = "primary", size = "md", icon, children, full = false, disabled = false, style, ...rest }) {
  return (
    <button
      type="button"
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
        width: full ? "100%" : undefined, fontFamily: "var(--font-body)", fontWeight: 700,
        cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1,
        transition: "background var(--duration-fast) var(--ease-out), transform var(--duration-fast)",
        ...VARIANTS[variant], ...SIZES[size], ...style
      }}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
