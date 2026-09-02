import React from "react";

export function Dialog({ open, title, body, confirmLabel = "Confirmar", cancelLabel = "Cancelar", danger = false, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(15,23,42,0.45)", padding: 12 }} onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, borderRadius: "var(--radius-2xl)", background: "var(--surface-card)", padding: 22, boxShadow: "var(--shadow-float)", display: "flex", flexDirection: "column", gap: 16, fontFamily: "var(--font-body)" }}>
        <div>
          <p style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--text-primary)" }}>{title}</p>
          {body ? <p style={{ margin: "6px 0 0", fontSize: "var(--text-base)", lineHeight: 1.5, color: "var(--text-secondary)" }}>{body}</p> : null}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button type="button" onClick={onCancel} style={{ height: "var(--control-h-md)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-primary)", fontFamily: "inherit", fontSize: "var(--text-base)", fontWeight: 700, cursor: "pointer" }}>{cancelLabel}</button>
          <button type="button" onClick={onConfirm} style={{ height: "var(--control-h-md)", borderRadius: "var(--radius-md)", border: 0, background: danger ? "var(--action-danger)" : "var(--brand-primary)", color: danger ? "#fff" : "var(--brand-on-primary)", fontFamily: "inherit", fontSize: "var(--text-base)", fontWeight: 700, cursor: "pointer" }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
