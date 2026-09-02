export interface ChipProps {
  selected?: boolean;
  /** Ícone Lucide 16px (categorias: ShoppingCart, Zap, Car…) — nunca emoji */
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}
export declare function Chip(props: ChipProps): JSX.Element;
