"use client";

/**
 * Cria a planilha do comprador sozinha, logo depois do login.
 *
 * O AuthGate já pede a permissão da planilha junto com a do login (uma tela só
 * do Google), então quando o app abre normalmente já existe um token com acesso
 * ao Drive. Se ainda não houver planilha, ela nasce aqui — o comprador não
 * precisa descobrir o botão "Conectar" lá na tela Conta.
 *
 * É a MESMA planilha de sempre: este arquivo não desenha nada, só chama o
 * createWorkbook/pushData que o botão da tela Conta já chamava, que por sua vez
 * usam lib/sheets/builder.ts (as 9 abas). Nada de layout novo aqui.
 *
 * Falhou? Não mostra erro nenhum: o botão da tela Conta continua sendo o plano B.
 */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getLocalUser } from "@/components/AuthGate";
import { createWorkbook, pushData } from "@/components/GoogleSyncButton";
import { LAYOUT_VERSION } from "@/lib/sheets/builder";
import { SHEET_KEY, loadGoogleToken, loadSheetMeta, type SheetMeta } from "@/lib/sheets/oauth";
import { useVirada } from "@/providers/virada-provider";

export function AutoPlanilha() {
  const { expenses, incomes, debts, goals } = useVirada();
  const jaTentou = useRef(false);
  const pathname = usePathname();

  useEffect(() => {
    if (jaTentou.current) return;
    if (loadSheetMeta()) return; // já tem planilha: quem atualiza é a tela Conta

    const token = loadGoogleToken();
    if (!token) return; // sem permissão do Drive ainda (login antigo, ou token vencido)

    const user = getLocalUser();
    if (user?.status !== "ativo") return; // só quem comprou

    jaTentou.current = true;
    void (async () => {
      try {
        const criada = await createWorkbook(token.access_token, user.email);
        await pushData(token.access_token, criada.spreadsheetId, { expenses, incomes, debts, goals });

        const meta: SheetMeta = {
          spreadsheetId: criada.spreadsheetId,
          spreadsheetUrl: criada.spreadsheetUrl,
          lastSync: new Date().toISOString(),
          layoutVersion: LAYOUT_VERSION,
        };
        localStorage.setItem(SHEET_KEY, JSON.stringify(meta));
        window.dispatchEvent(new Event("virada-sheet-meta-changed"));
      } catch (err) {
        console.error("[AutoPlanilha] não deu para criar agora:", err);
        jaTentou.current = false; // deixa tentar de novo na próxima tela
      }
    })();
    // Dependia dos dados: cada lancamento remontava o efeito e, se a criacao
    // tivesse falhado, refazia a chamada ao Google A CADA gasto digitado —
    // travando a tela em rede. Agora tenta de novo so na troca de tela, que e
    // o que o "plano B" acima queria dizer.
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
