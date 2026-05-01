import { Award } from "lucide-react";

interface BadgeCardProps {
  name: string;
  unlocked?: boolean;
}

export function BadgeCard({ name, unlocked = true }: BadgeCardProps) {
  return (
    <article
      className={`flex items-center gap-3 rounded-lg border p-4 ${
        unlocked
          ? "border-amber-300/35 bg-amber-300/10 text-amber-100"
          : "border-virada-line bg-white/[0.035] text-virada-slate"
      }`}
    >
      <Award className="h-5 w-5 shrink-0" />
      <span className="text-sm font-semibold">{name}</span>
    </article>
  );
}
