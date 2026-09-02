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
      ? "border-[#0EA978]/20 bg-[#EBF8F3]"
      : tone === "gold"
        ? "border-[#DDAF2B]/25 bg-[#FFF8E8]"
        : "border-[#133335]/10 bg-white";
  const iconClasses =
    tone === "green"
      ? "bg-[#0EA978] text-white"
      : tone === "gold"
        ? "bg-[#DDAF2B] text-[#133335]"
        : "bg-[#E8F0EC] text-[#3C5552]";

  return (
    <article className={`rounded-[1.2rem] border p-4 shadow-[0_8px_24px_rgba(19,51,53,0.06)] ${toneClasses}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#647875]">{label}</p>
        {icon ? (
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${iconClasses}`}>
            {icon}
          </span>
        ) : null}
      </div>
      <strong className="mt-3 block font-display text-2xl font-semibold tracking-tight text-[#133335]">{value}</strong>
      <p className="mt-1.5 text-xs leading-5 text-[#647875]">{helper}</p>
    </article>
  );
}
