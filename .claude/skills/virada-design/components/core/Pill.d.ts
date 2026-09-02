export interface PillProps {
  /** Um par fundo+texto dos tokens --state-*. onDark é a única variante para o hero escuro. */
  tone?: "positive" | "negative" | "warning" | "info" | "neutral" | "onDark";
  /** Ponto colorido à esquerda (status) */
  dot?: boolean;
  /** sm = caixa alta 10px dentro de tabelas ("MAIOR", "ABERTA") */
  size?: "sm" | "md";
  children: React.ReactNode;
}
export declare function Pill(props: PillProps): JSX.Element;
