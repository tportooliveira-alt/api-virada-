export interface BottomNavItem { key: string; label: string; icon: React.ReactNode }
export interface BottomNavProps {
  /** Máximo 5 itens. Ordem oficial: Início, Lançar, Relatórios, Conta */
  items: BottomNavItem[];
  active: string;
  onChange: (key: string) => void;
}
export declare function BottomNav(props: BottomNavProps): JSX.Element;
