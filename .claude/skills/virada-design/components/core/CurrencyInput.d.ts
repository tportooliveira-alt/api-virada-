/** @startingPoint section="Componentes" subtitle="Campo de valor em R$ que aceita vírgula (corrige o bug do type=number)" viewport="700x160" */
export interface CurrencyInputProps {
  label?: string;
  /** Valor em centavos (inteiro). 3590 = R$ 35,90 */
  cents: number;
  onChange: (cents: number) => void;
  autoFocus?: boolean;
  size?: "lg" | "md";
}
export declare function CurrencyInput(props: CurrencyInputProps): JSX.Element;
