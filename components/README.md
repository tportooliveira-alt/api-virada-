# `components/` — Componentes React (UI)

Componentes reutilizáveis do app. Client components (PWA, offline-first).
26 componentes. Os principais:

| Componente | Função |
|---|---|
| `AuthGate.tsx` | **Porteiro**: login Google (1 clique), offline-first, 3 telas de erro (não-membro, sem internet, conectar uma vez). ⚠️ warning de lint (ver RELATORIO #5) |
| `GoogleSyncButton.tsx` | Exporta a planilha premium pra conta Google do cliente (OAuth dele). ⚠️ warning de lint |
| `BottomNav.tsx`, `Header.tsx` | Navegação e cabeçalho |
| `DashboardCard.tsx`, `ViradaScoreCard.tsx` | Cards do dashboard |
| `TransactionForm.tsx`, `TransactionList.tsx`, `QuickLaunchCard.tsx` | Lançamento e listagem |
| `VoiceOrTextInput.tsx`, `ParsedTransactionConfirm.tsx` | Entrada por voz/texto + confirmação do parse |
| `GoalCard.tsx`, `DebtCard.tsx`, `MissionCard.tsx`, `ProgressBar.tsx`, `BadgeCard.tsx` | Metas, dívidas, gamificação |
| `ExpenseChart.tsx` | Gráfico de gastos |
| `AntiImpulseCard.tsx`, `AudioTipCard.tsx`, `ExtraIncomeIdeaCard.tsx` | Conteúdo educativo no app |
| `InstallGuide.tsx`, `InstallButton.tsx`, `InstallNudge.tsx` | Instalação do app: guia por aparelho, botão que dispara o instalador do navegador e o convite dispensável no topo das telas (hook em `lib/pwa/use-install-app.ts`) |
| `PwaRegister.tsx` | Registra o `public/sw.js` (só em produção; em dev desregistra) |
| `LocalStorageNotice.tsx` | Onboarding: onde ficam os dados |
| `PremiumGate.tsx`, `EmptyState.tsx` | Estados de UI |

> Estado global vem do `ViradaProvider` (ver `providers/`). Dados ficam no localStorage (`virada-app:v1`).
