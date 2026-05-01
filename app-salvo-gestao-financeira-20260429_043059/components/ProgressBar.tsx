interface ProgressBarProps {
  value: number;
  label?: string;
  tone?: "green" | "gold" | "sky";
}

export function ProgressBar({ value, label, tone = "green" }: ProgressBarProps) {
  const toneClass =
    tone === "gold" ? "bg-amber-300" : tone === "sky" ? "bg-sky-400" : "bg-emerald-500";

  return (
    <div className="space-y-2">
      {label ? (
        <div className="flex items-center justify-between text-sm text-virada-gray">
          <span>{label}</span>
          <span>{value}%</span>
        </div>
      ) : null}
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-300 ${toneClass}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
