"use client";

// Controle segmentado do design system: trilho Ink 100, opção ativa branca com sombra.
interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}

export function Segmented<T extends string>({ options, value, onChange, label }: SegmentedProps<T>) {
  return (
    <div className="flex gap-0.5 rounded-[10px] bg-ink-100 p-1" role="tablist" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={`flex-1 rounded-[7px] py-[9px] text-[13px] font-semibold transition-colors duration-150 ${
            value === option.value ? "bg-white text-ink-900 shadow-segment" : "text-ink-500 hover:text-ink-700"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
