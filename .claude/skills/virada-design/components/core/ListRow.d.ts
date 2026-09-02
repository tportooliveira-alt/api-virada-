export interface ListRowProps {
  title: string;
  /** "01 de set. · Mercado · Casa" */
  meta?: string;
  /** Valor formatado com sinal: "+R$ 2.900,00" ou "−R$ 950,00" */
  value?: string;
  /** positive pinta valor e inicial de verde (entrada); neutral = saída */
  tone?: "positive" | "neutral";
  /** Inicial da categoria no quadradinho à esquerda */
  initial?: string;
  onClick?: () => void;
}
export declare function ListRow(props: ListRowProps): JSX.Element;
