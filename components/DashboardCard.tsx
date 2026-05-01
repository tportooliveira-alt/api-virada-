import { ReactNode } from "react";

interface DashboardCardProps {
  label: string;
  value: string;
  helper: string;
  tone?: "green" | "gold" | "slate";
  icon?: ReactNode;
}

export function DashboardCard({
  label,
  value,
  helper,
  tone = "slate",
  icon,
}: DashboardCardProps) {
  const toneClasses =
    tone === "green"
      ? "border-emerald-500/35 bg-emerald-500/[0.08]"
      : tone === "gold"
        ? "border-amber-300/35 bg-amber-300/[0.08]"
        : "border-virada-line bg-white/[0.045]";
  const iconClasses =
    tone === "green"
      ? "bg-emerald-500/15 text-emerald-300"
      : tone === "gold"
        ? "bg-amber-300/15 text-amber-200"
        : "bg-slate-400/10 text-virada-gray";

  return (
    <article className={`rounded-lg border p-4 shadow-panel ${toneClasses}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-virada-gray">{label}</p>
        {icon ? (
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${iconClasses}`}>
            {icon}
          </span>
        ) : null}
      </div>
      <strong className="mt-3 block text-2xl font-semibold text-white">{value}</strong>
      <p className="mt-2 min-h-10 text-sm leading-5 text-virada-slate">{helper}</p>
    </article>
  );
}
