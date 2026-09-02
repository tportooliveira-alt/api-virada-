import React from "react";

export function BottomNav({ items, active, onChange }) {
  return (
    <nav style={{ position: "fixed", bottom: 10, left: "50%", transform: "translateX(-50%)", zIndex: 40, display: "grid", gridTemplateColumns: "repeat(" + items.length + ", 1fr)", gap: 4, width: "calc(100% - 20px)", maxWidth: 440, borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", background: "rgba(255,255,255,0.96)", padding: 6, boxShadow: "var(--shadow-float)", backdropFilter: "var(--blur-nav)" }}>
      {items.map((it) => {
        const on = it.key === active;
        return (
          <button key={it.key} type="button" onClick={() => onChange(it.key)}
            style={{ display: "grid", minHeight: 52, placeItems: "center", gap: 2, border: 0, borderRadius: 11, padding: 6, fontFamily: "var(--font-body)", fontSize: "var(--text-xs)", fontWeight: on ? 700 : 500, cursor: "pointer", background: on ? "var(--surface-brand-soft)" : "transparent", color: on ? "var(--color-green-800)" : "var(--text-muted)" }}>
            {it.icon}{it.label}
          </button>
        );
      })}
    </nav>
  );
}
