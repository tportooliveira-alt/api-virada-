import React from "react";

export function SegmentedControl({ options, value, onChange, tone = "light" }) {
  const dark = tone === "dark";
  return (
    <div style={{ display: "flex", gap: 2, padding: 4, borderRadius: "var(--radius-md)", background: dark ? "var(--surface-inverse-muted)" : "var(--surface-sunken)" }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            style={{ flex: 1, border: 0, borderRadius: 7, padding: "7px 0", fontFamily: "var(--font-body)", fontSize: "var(--text-xs)", fontWeight: 600, cursor: "pointer", transition: "all var(--duration-fast) var(--ease-out)",
              background: active ? (dark ? "var(--brand-primary)" : "var(--surface-card)") : "transparent",
              color: active ? (dark ? "var(--brand-on-primary)" : "var(--text-primary)") : (dark ? "var(--text-on-inverse-muted)" : "var(--text-muted)"),
              boxShadow: active && !dark ? "var(--shadow-segment)" : "none" }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
