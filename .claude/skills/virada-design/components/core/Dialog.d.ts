export interface DialogProps {
  open: boolean;
  title: string;
  body?: string;
  /** Verbo no infinitivo: "Excluir", "Desfazer", "Apagar tudo" */
  confirmLabel?: string;
  cancelLabel?: string;
  /** true pinta o confirmar de vermelho — só para ações irreversíveis */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}
export declare function Dialog(props: DialogProps): JSX.Element | null;
