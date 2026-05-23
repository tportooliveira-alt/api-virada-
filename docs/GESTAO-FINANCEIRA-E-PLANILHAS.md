# Gestão Financeira e Planilhas

> **Atualizado 2026-05-22** — reflete a arquitetura atual (9 abas premium + OAuth GIS).

## Decisão

O app é simples no celular e a planilha por trás é completa, profissional e premium.

O frontend mostra:

- caixa do mês
- entradas
- gastos
- resultado
- últimos lançamentos
- lançamento rápido

A planilha exportada pro Google Sheets guarda a gestão completa, com formatação visual de analista financeiro.

## As 9 abas da planilha

1. **Dashboard** — banner navy/dourado + 4 KPI cards (Entradas/Saídas/Saldo/Lançamentos) + tabela top categorias + tabela mensal + 4 gráficos (pie/column/line/bar)
2. **Lançamentos** — timeline geral (Data/Tipo/Descrição/Categoria/Valor/Pagamento/Natureza/Escopo/Origem)
3. **Receitas** — só entradas
4. **Despesas** — só saídas
5. **Dívidas** — Nome/Vencimento/Prioridade/Status/Parcela/Total/Em aberto, com cores condicionais por status
6. **Metas** — Meta/Tipo/Alvo/Atual/Faltando/Progresso, com gradient red→gold→green
7. **Fluxo de Caixa** — Data/Entradas/Saídas/Resultado do dia/Saldo acumulado
8. **Resumo Mensal** — Mês/Entradas/Saídas/Resultado/Saldo acumulado/Economia/Lançamentos
9. **Como usar** — 5 passos numerados pra orientar o usuário

Cada aba (exceto "Como usar") tem painel lateral com título, hint, 4 KPIs e notas explicativas.

## Regra de produto

O usuário não precisa abrir planilha para usar o app no dia a dia. A planilha serve para:

- análise completa
- conferência
- exportação
- compartilhamento por link
- abertura em Excel (via download manual no Google Sheets)

## Google Planilhas via OAuth (GIS) — fluxo padrão

Sincronização principal funciona com 1 clique e cria a planilha **no Drive do próprio usuário**:

1. Usuário clica "Exportar minha planilha" em `/app/evolucao`
2. Popup OAuth do Google → "Permitir"
3. App cria a planilha no Drive do usuário e popula os dados
4. Token (55min) salvo em `localStorage`. Refresh automático no próximo clique.

Detalhes técnicos:

- Não há credencial sensível no client além do **Client ID OAuth** (que é público por design via `NEXT_PUBLIC_GOOGLE_CLIENT_ID`)
- App escreve primeiro na base local (offline-first), sincronização envia ao Google sob demanda
- Scope `drive.file` é o mínimo necessário — o app só vê arquivos que ele mesmo criou
- Se a planilha for apagada manualmente do Drive, o próximo sync detecta o 404 e cria uma nova automaticamente
- Botão **"Recriar planilha (visual perfeito)"** apaga + recria para garantir layout sempre correto

Ver `docs/configurar-google-sheets.md` para setup passo-a-passo do Client ID.

## Excel

Excel entra apenas por **export manual**: no Google Sheets, o usuário usa "Arquivo → Fazer download → Microsoft Excel (.xlsx)".

Não há mais endpoint `/api/sheets/export?sheet=*.csv` — foi removido na refatoração que substituiu a planilha antiga de 15 abas planas pela versão premium de 9 abas + gráficos.

## WhatsApp

Entrada por WhatsApp segue como funcionalidade futura. Modelo previsto:

- usuário manda mensagem
- servidor interpreta via `lib/parse-financial-input.ts`
- grava lançamento na base local
- na próxima sincronização, vai pra planilha

Exemplos planejados:

- `Vendi 250 no Pix`
- `Comprei 80 de mercadoria`
- `Paguei 120 de fornecedor`
- `Recebi 500 de cliente`

Versão simples atualmente disponível: link `wa.me` que abre o WhatsApp do produtor com texto pré-preenchido — sem automação.
