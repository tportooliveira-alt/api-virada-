import React from "react";

export function Chip({ selected = false, icon, children, onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: "var(--radius-pill)", padding: "8px 14px", minHeight: 36, fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", fontWeight: 600, cursor: "pointer", transition: "all var(--duration-fast) var(--ease-out)",
        border: "1px solid " + (selected ? "var(--color-ink-900)" : "var(--border-default)"),
        background: selected ? "var(--surface-inverse)" : "var(--surface-card)",
        color: selected ? "var(--text-on-inverse)" : "var(--text-secondary)" }}>
      {icon}{children}
    </button>
  );
}
