export interface EmptyStateProps {
  /** Diz o que fazer, não o que falta: "Nenhum lançamento ainda. Comece pelo botão Lançar." */
  title: string;
  description?: string;
  /** Normalmente um <Button variant="secondary"> */
  action?: React.ReactNode;
}
export declare function EmptyState(props: EmptyStateProps): JSX.Element;
