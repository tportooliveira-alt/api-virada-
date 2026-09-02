export interface SegmentedOption { value: string; label: string }
export interface SegmentedControlProps {
  /** 2 a 5 opções curtas (Mês · 30d · 7d · Ano · Tudo). Para mais que isso, use Chip. */
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  tone?: "light" | "dark";
}
export declare function SegmentedControl(props: SegmentedControlProps): JSX.Element;
