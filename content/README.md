# `content/` — Materiais do produto (fonte em Markdown)

O **conteúdo entregue ao cliente**, escrito em Markdown. Os PDFs vendáveis são
gerados a partir daqui pelos scripts em `scripts/` (`build_pdfs.py`) e saem em
`public/downloads/`.

| Arquivo | O que é | PDF gerado |
|---|---|---|
| `ebook.md` | **Ebook principal** "O Código da Virada Financeira" — 7 capítulos (clareza, organização, dívidas, renda extra, reserva, investir, plano 7 dias) | `public/downloads/ebook-codigo-da-virada.pdf` |
| `plano-7-dias.md` | Bônus: plano de 7 dias, uma ação por dia | `public/downloads/plano-7-dias.pdf` |
| `roteiro-negociacao-dividas.md` | Bônus: mensagens prontas pra negociar dívidas + tabela de descontos | `public/downloads/roteiro-negociacao.pdf` |
| `bonus-50-ideias-renda-extra.md` | Bônus: 50 ideias de renda extra por categoria | `public/downloads/bonus-50-ideias.pdf` |
| `checklist-mensal.md` | Bônus: checklist de revisão mensal | `public/downloads/checklist-mensal.pdf` |
| `ebook.backup.md` | ⚠️ **Idêntico a `ebook.md`** — backup redundante (ver RELATORIO #6). Pode remover |

## Como regenerar os PDFs
Os PDFs em `public/downloads/` vêm destes `.md`. Ao editar o conteúdo, rode o build
de PDFs (`scripts/build_pdfs.py`) pra atualizar os arquivos vendáveis.

> Editar aqui = mudar o produto que o cliente recebe. Mantenha o tom (direto,
> acolhedor, sem promessa de resultado — ver "Aviso importante" no topo do ebook).
