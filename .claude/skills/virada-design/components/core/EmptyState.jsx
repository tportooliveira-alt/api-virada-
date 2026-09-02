import React from "react";

export function EmptyState({ title, description, action }) {
  return (
    <div style={{ borderRadius: "var(--radius-lg)", border: "1px dashed var(--border-strong)", padding: "24px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <p style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text-primary)" }}>{title}</p>
      {description ? <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)", maxWidth: 360 }}>{description}</p> : null}
      {action ? <div style={{ marginTop: 6 }}>{action}</div> : null}
    </div>
  );
}
