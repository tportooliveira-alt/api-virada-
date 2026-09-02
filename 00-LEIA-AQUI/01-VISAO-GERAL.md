# Código da Virada — Visão Geral do Projeto

## O que é

App de controle financeiro pessoal vendido como infoproduto (Hotmart, Eduzz, Kiwify, Monetizze, Cakto, Perfectpay). Cliente compra na plataforma → recebe acesso automático no app → dados ficam no celular dele (offline-first) → pode exportar uma planilha profissional para Google Planilhas dele.

## Pilares

1. **Leve no celular** — Next.js PWA, dados em IndexedDB local. Sem servidor pesado por usuário.
2. **Acesso automático** — venda na plataforma dispara webhook que cadastra o e-mail. Cliente entra com Google. Sem código de ativação manual, sem suporte.
3. **Planilha premium** — exportação para Google Planilhas com cara de produto, gerada na conta Google do próprio cliente (sem service account).
4. **Múltiplas plataformas** — endpoint único `/api/webhooks/[platform]` com 6 adapters prontos.

## Stack

- **Framework:** Next.js 14 (App Router) + React 18 + TypeScript
- **UI:** Tailwind CSS 3 + lucide-react
- **Banco do servidor:** SQLite (`better-sqlite3`) — arquivo `data/access.db`
- **Banco do cliente:** IndexedDB (`idb`) no celular
- **Auth:** Google Identity Services (1-tap / OAuth) — sem senha
- **Planilhas:** Google Sheets API REST direto (token OAuth do usuário)
- **Hospedagem alvo:** servidor próprio / VPS (SQLite precisa de disco persistente)
