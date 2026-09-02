/** @startingPoint section="Componentes" subtitle="Cartão de indicador: rótulo, valor grande, ajuda" viewport="700x160" */
export interface StatCardProps {
  label: string;
  /** Já formatado em pt-BR (R$ 1.260,80). Nunca quebra de linha. */
  value: string;
  helper?: string;
  /** positive = verde (entradas), negative = vermelho (saídas), accent = âmbar (planilha), inverse = dentro do hero escuro */
  tone?: "default" | "positive" | "negative" | "accent" | "inverse";
  icon?: React.ReactNode;
}
export declare function StatCard(props: StatCardProps): JSX.Element;
