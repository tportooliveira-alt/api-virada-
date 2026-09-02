# Pós-cadastro Kiwify — checklist de publicação

> Criado em 2026-09-02. Referenciado pelo bloco CONFIG de `public/vendas.html` e pelo
> handoff (`design_handoff_virada_v2/README.md`, seção "PENDÊNCIA … Kiwify").
> Marque os itens conforme for fazendo. Nada aqui inventa URL, telefone ou preço —
> tudo vem do cadastro real.

## O que está sendo vendido (1 produto, pagamento único)

| Item | Onde está no repo | Como entregar |
|---|---|---|
| E-book "Código da Virada" (PDF) | `public/downloads/ebook-codigo-da-virada.pdf` | Upload no produto Kiwify (área de membros / arquivos) |
| Bônus 1 · Roteiro de negociação de dívidas | `public/downloads/roteiro-negociacao.pdf` | idem |
| Bônus 2 · 50 ideias de renda extra | `public/downloads/bonus-50-ideias.pdf` | idem |
| Bônus 3 · Plano de 7 dias | `public/downloads/plano-7-dias.pdf` | idem |
| Bônus 4 · Checklist mensal | `public/downloads/checklist-mensal.pdf` | idem |
| Acesso ao Virada App | `https://<dominio>/app` | Liberado automaticamente pelo webhook (e-mail da compra = login) |

Preço na landing: **R$ 47** (de R$ 150) · "ou 5x de R$ 9,90" · garantia 7 dias.
Os PDFs de `public/downloads/` **não** são linkados pelo app nem pela landing — a entrega é pela Kiwify.
Se o e-book mudou depois de 2026-09-02 01:01 (data dos PDFs), regenerar antes de subir.

## 1. Cadastro do produto na Kiwify (feito pelo Thiago, logado)

- [ ] Produto: **Código da Virada — App + E-book** · tipo "e-book/arquivos" (ou "área de membros")
- [ ] Preço **R$ 47,00** · preço "de" **R$ 150,00** (CDC: o riscado tem que ser preço real já praticado)
- [ ] Parcelamento: conferir se a Kiwify mostra **5x de R$ 9,90** (a landing afirma isso) — se não, ajustar a landing
- [ ] Garantia: **7 dias** (a landing e os termos inline prometem 7 dias, reembolso 100%)
- [ ] Subir os 5 PDFs da tabela acima
- [ ] Descrição do produto = mesma promessa da landing (app + e-book + 4 bônus, pagamento único, sem mensalidade)
- [ ] Página de obrigado (opcional): `https://<dominio>/app` com aviso "entre com o mesmo e-mail da compra"
- [ ] Copiar a **URL do checkout** (`https://pay.kiwify.com.br/...`)

## 2. Webhook → libera o login no app

O endpoint já existe: `app/api/webhooks/[platform]/route.ts` + adapter `kiwify` em `lib/access/adapters.ts`.
Eventos tratados: aprovado (`ativo`), cancelado, reembolsado, chargeback. Grava em `data/access.db` (SQLite na VPS).

- [ ] Gerar um token aleatório (ex.: `openssl rand -hex 24`) e colocar em `.env.local` da VPS: `KIWIFY_TOKEN=<token>`
      (em produção o webhook **recusa** requisições sem token configurado — 503)
- [ ] Na Kiwify → Apps/Webhooks → nova URL:
      `https://<dominio>/api/webhooks/kiwify?token=<KIWIFY_TOKEN>`
      Eventos: compra aprovada, compra recusada/cancelada, reembolso, chargeback, assinatura cancelada (se existir)
- [ ] Reiniciar o app na VPS (pm2) depois de mexer no `.env.local`
- [ ] **Compra de teste** (cupom 100% ou produto de R$ 1): confirmar que o e-mail aparece em `/api/admin/members`
      e que o login em `/app` com esse e-mail entra

## 3. Preencher a landing (`scripts/build-vendas.mjs` → `node scripts/build-vendas.mjs`)

Os pontos estão marcados com `// TODO(kiwify)` no script e no CONFIG do `public/vendas.html` gerado.

- [ ] `PROPS.checkoutUrl` = URL do checkout (troca todos os `href="#comprar"` dos botões de compra)
- [ ] `PROPS.whatsapp` = número do suporte, só dígitos com DDI (ex.: `5571999999999`) — botão flutuante + rodapé
- [ ] `PROPS.precoDepois` = mesmo preço cheio cadastrado na Kiwify (hoje 150)
- [ ] `SITE_URL` = domínio final (ex.: `https://codigodavirada.net.br`) → `og:image` vira absoluto
      (WhatsApp/Instagram só mostram a capa com URL absoluta)
- [ ] `HORAS_OFERTA` (24h por visitante, via `localStorage`) — deixar 24, ou 0 pra desligar o temporizador
- [ ] Rodar `node scripts/build-vendas.mjs`, conferir `public/vendas.html` e commitar
- [ ] Termos inline no rodapé: trocar `[SEU NOME OU CNPJ]` e `[SUA CIDADE — Estado]` no `.dc.html` de origem
      (`_design/claude-design/Landing Vendas v2.dc.html`) e regenerar

## 4. Deploy e domínio

- [ ] `/` e `/vendas` já servem a landing (rewrite em `next.config.mjs`); o app fica em `/app`
- [ ] Apontar `codigodavirada.net.br` pra VPS + HTTPS (certbot) — sem HTTPS a Kiwify não aceita o webhook
- [ ] Landing antiga do Netlify (`aquamarine-crumble-9be5b2.netlify.app`, vende só o e-book a R$ 27):
      desligar ou redirecionar 301 pra `/vendas`
- [ ] Pixels (opcional): `NEXT_PUBLIC_META_PIXEL_ID` / `NEXT_PUBLIC_GTM_ID` em `.env.local`

## 5. Conferências finais antes de divulgar

- [ ] Abrir `/vendas` no celular: botões levam ao checkout, WhatsApp abre conversa, capas dos bônus carregam
- [ ] Compartilhar o link no WhatsApp: aparece título + capa (`og:image` absoluto)
- [ ] Fluxo completo: comprar → e-mail da Kiwify → entrar em `/app` com o e-mail → instalar PWA
- [ ] Reembolso de teste: webhook muda o status pra `reembolsado` e o login passa a ser negado

## Observações conhecidas (não bloqueiam)

- As capas dos bônus (`public/assets/bonus-0X-*.png`) trazem a numeração antiga "BÔNUS 03 · 03/05" (eram 5 bônus);
  as legendas na landing dizem "Bônus 1…4". Se incomodar, regerar as capas no Claude Design.
- O texto "5x de R$ 9,90" só é verdadeiro se o parcelamento da Kiwify fechar nesse valor (juros do cartão podem mudar).
- `sheets/builder.ts` do export do Claude Design usa `MAX(` — ignorado de propósito; o do repo usa `MÁXIMO(` (pt-BR).
