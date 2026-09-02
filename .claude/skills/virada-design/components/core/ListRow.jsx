import React from "react";

export function ListRow({ title, meta, value, tone = "neutral", initial, onClick }) {
  const badge = tone === "positive" ? ["var(--state-positive-bg)", "var(--state-positive-fg)"] : ["var(--surface-sunken)", "var(--text-secondary)"];
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--surface-sunken)", width: "100%", background: "transparent", border: 0, borderBottomWidth: 1, borderBottomStyle: "solid", borderBottomColor: "var(--surface-sunken)", textAlign: "left", cursor: onClick ? "pointer" : "default", fontFamily: "var(--font-body)" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        {initial ? <span style={{ display: "grid", placeItems: "center", height: 36, width: 36, flexShrink: 0, borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)", fontWeight: 700, background: badge[0], color: badge[1] }}>{initial}</span> : null}
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
          {meta ? <span style={{ display: "block", marginTop: 2, fontSize: "var(--text-xs)", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta}</span> : null}
        </span>
      </span>
      {value ? <strong style={{ flexShrink: 0, fontSize: "var(--text-base)", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: tone === "positive" ? "var(--text-positive)" : "var(--text-primary)" }}>{value}</strong> : null}
    </Tag>
  );
}
