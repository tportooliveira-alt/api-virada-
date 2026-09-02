/** @startingPoint section="Componentes" subtitle="Botão: primário verde, secundário, ghost, perigo" viewport="700x200" */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = ação principal (1 por tela). danger só para exclusão. inverse em cima de fundo claro quando não é a ação principal. */
  variant?: "primary" | "secondary" | "ghost" | "danger" | "inverse";
  /** lg (52px) para a ação principal da tela; md (44px) padrão; sm (36px) só dentro de tabelas e cards */
  size?: "sm" | "md" | "lg";
  /** Ícone Lucide 18px à esquerda */
  icon?: React.ReactNode;
  full?: boolean;
  children: React.ReactNode;
}
export declare function Button(props: ButtonProps): JSX.Element;
