# `public/` — Arquivos estáticos servidos direto

Tudo aqui é servido na raiz do site (ex.: `public/vendas.html` → `/vendas.html`).

## Subpastas
| Caminho | Conteúdo |
|---|---|
| `downloads/` | **PDFs vendáveis** gerados de `content/` (ebook + 4 bônus). É o que o cliente baixa |
| `assets/` | Identidade visual: capa do ebook, mockups, logos, favicons, banner YouTube, og-image, imagens dos bônus |
| `icons/` | Ícones do PWA (192/512) |
| `marketing/` | Prints e criativos: anúncios (`ad-*.png`), passo a passo Hotmart/Cakto/Canva (`hm-*`, `cakto-*`, `canva-*`), e os 5 vídeos em `marketing/videos/*.mp4` |

## Páginas HTML soltas (estáticas)
| Arquivo | O que é |
|---|---|
| `vendas.html` | Página de vendas estática |
| `planilha-preview.html` | Prévia visual da planilha premium |
| `politica-privacidade.html`, `termos-de-uso.html` | Obrigatórios das plataformas |
| `manifest.webmanifest` | Manifesto do PWA |

> Os PDFs em `downloads/` são saída do build — pra mudar o conteúdo, edite os `.md`
> em `content/` e rode `scripts/build_pdfs.py`.
