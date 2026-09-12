# Código da Virada

Produto completo num repositório só: a **landing de vendas**, o **app do comprador** e a
**entrega**. No ar em **[codigodavirada.net.br](https://codigodavirada.net.br)**.

> Apesar do nome `api-virada-`, não é uma API.
> **Este é o único repositório vivo do projeto.** `codigo-da-virada-mestre` e
> `codigo-da-virada-` são acervo antigo — não trabalhe neles.

## O que é vendido

App de controle financeiro (PWA) + e-book de 5 capítulos + 3 bônus, por **R$ 47,
pagamento único**, sem mensalidade. Checkout na **Kiwify**, garantia de 7 dias.

O app registra o fluxo financeiro inteiro — entradas, gastos, dívidas, metas, fluxo de
caixa — separando **Casa** e **Empresa**, e marcando cada gasto como **essencial** ou
**por impulso**. No celular aparece só o essencial (caixa, entradas, gastos, resultado,
últimos lançamentos); o detalhe todo vai para uma planilha de 9 abas no Google Drive
**do próprio cliente**.

## Onde ficam os dados

Três lugares, independentes:

- **Lançamentos do cliente** → **IndexedDB**, no aparelho dele (`lib/db/`). Funciona
  offline e não sobe para o nosso servidor.
- **Quem comprou** → SQLite na VPS (`data/access.db`), alimentado pelo webhook da Kiwify.
  Guardamos só o e-mail da compra, para liberar o acesso.
- **Planilha** → Google Drive do cliente (`lib/sheets/`), criada e atualizada por ele
  com um toque.

## Rodar local

```bash
npm install
npm run dev      # http://localhost:3000  →  /app/inicio
npm run test     # typecheck + lint + build — rode antes de qualquer deploy
```
Sem `.env.local`, o login mostra o botão "Entrar como Dev (localhost)".

## Mapa das pastas

| Pasta | O que tem |
|---|---|
| `app/` | rotas do Next (App Router). O app do comprador fica em `app/app/*`, as APIs em `app/api/*` |
| `components/` | componentes React (`AuthGate`, `GoogleSyncButton`, cartões, gráficos) |
| `lib/` | regra de negócio: `db/` (IndexedDB), `sheets/` (planilha), `access/` (porteiro), `agente/` |
| `public/vendas.html` | **a landing no ar** — gerada por `scripts/build-vendas.mjs` |
| `content/ebook.md` | o e-book que o cliente recebe |
| `public/downloads/` | os PDFs entregues (e-book + bônus) |
| `agente-whatsapp/`, `agente-site/` | o cérebro dos agentes de venda e atendimento |
| `docs/` | registro das sessões e decisões |
| `scripts/` | geradores e testes (`test-sheets-build`, `dump-formulas`, `build-vendas`) |

## Por onde começar

1. **[`CLAUDE.md`](./CLAUDE.md)** — arquitetura real, pegadinhas que já morderam, deploy.
   Leia antes de mexer em qualquer coisa.
2. **[`agente-whatsapp/CONHECIMENTO-DO-PRODUTO.md`](./agente-whatsapp/CONHECIMENTO-DO-PRODUTO.md)**
   — o produto por inteiro em texto: preço, app tela a tela, planilha, e-book capítulo a
   capítulo, suporte, e o que pode e não pode ser dito ao cliente.
3. `docs/SESSAO-*.md` — como o projeto chegou até aqui.

## Deploy

VPS Hostinger, pm2 + nginx, pasta `/var/www/codigo-da-virada`:

```bash
ssh vps-paperclip "cd /var/www/codigo-da-virada && git pull --ff-only origin main && npm run build && pm2 restart codigo-da-virada"
```

Contato e suporte: **(77) 99939-5511**.
