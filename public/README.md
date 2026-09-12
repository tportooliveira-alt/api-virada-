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
| `vendas.html` + `vendas-hero.js` | Página de vendas (Landing Vendas v2 do Claude Design). **Gerada** por `node scripts/build-vendas.mjs` — não editar à mão, exceto o bloco `CONFIG` no `<head>` (`CHECKOUT_URL`, `WHATSAPP`, `HORAS_OFERTA`) |
| `planilha-preview.html` | Prévia visual da planilha premium |
| `politica-privacidade.html`, `termos-de-uso.html` | Obrigatórios da Kiwify/Cakto (linkados no rodapé da landing). Placeholders `[SEU NOME OU CNPJ]` e `[SUA CIDADE — Estado]` a preencher |
| `manifest.webmanifest` | Manifesto do PWA |
| `sw.js` | **Service worker**: é ele que faz o Chrome oferecer "Instalar aplicativo" e o app abrir sem internet. Ao editar, suba a `VERSION` no topo do arquivo — é ela que limpa os caches antigos |

> Os PDFs em `downloads/` são saída do build — pra mudar o conteúdo, edite os `.md`
> em `content/` e rode `scripts/build_pdfs.py`.
