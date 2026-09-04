# Retomar aqui — 04/09/2026

O produto vende. Falta **um** passo pra entrega funcionar.

## 1. Token do webhook (o único bloqueio real)

Sem isso o comprador paga, a Kiwify avisa o site, o site recusa (401) e ele **não
entra no app**. Não dá erro visível pra ninguém — você só descobre pela reclamação.

**No Claude Code, cole com `!` na frente:**

```
! T=$(ssh vps-paperclip "grep '^KIWIFY_TOKEN=' /var/www/codigo-da-virada/.env.local | cut -d= -f2" | tr -d '\r\n'); printf %s "https://codigodavirada.net.br/api/webhooks/kiwify?token=$T" | clip.exe; echo "pronto, URL copiada"
```

**Na Kiwify:** Apps → Webhooks → no campo da URL: clique dentro, **Ctrl+A**, **Ctrl+V**.
Marque **Compra aprovada · Reembolso · Chargeback**. Criar.

Você não precisa ver nem entender o token — ele vai junto com o endereço.

## 2. Depois: uma compra de verdade

Pagar, receber o e-mail, entrar no app com **o mesmo e-mail da compra**, ver a
planilha nascer. Peça pro Claude acompanhar a chamada chegando na VPS ao vivo.

Antes de anunciar, esse teste é obrigatório: descobrir entrega quebrada com dinheiro
de tráfego é o erro mais caro possível.

## 3. Kiwify — falta preencher

- **Verificação de identidade**: documentos enviados, aguardando (até 24h). Sem
  aprovação você vende mas não saca.
- **Financeiro**: conta bancária no seu nome/CPF. Dado bancário é você quem digita.
- **Recuperação de venda abandonada** (Configurações): ative 5 min, 24 h e 7 dias.
  É a maior alavanca de faturamento sem gastar mais em tráfego.
- **Bloco de texto no checkout** (Checkout Builder): a descrição do produto **não
  aparece** no checkout, então a garantia de 7 dias não está sendo vista na hora de
  pagar. O texto pronto está em `docs/KIWIFY-produto.md`.
- **Pix ativo**: público apertado paga em Pix.

## Onde está cada coisa

| O quê | Onde |
|---|---|
| Registro completo de hoje | `docs/SESSAO-2026-09-04.md` |
| Cadastro do produto na Kiwify | `docs/KIWIFY-produto.md` |
| Vídeo de anúncio 15s | `_design/video/anuncio-15s.mp4` |
| Roteiro do vídeo | `_design/video/roteiro.txt` |
| Capa do e-book (regerar) | `_design/capa-ebook-montanha.html` |
| Imagem do produto (regerar) | `_design/imagem-produto-kiwify.html` |
| Checkout | `pay.kiwify.com.br/QUVGK3y` |

## Deploy

```bash
git bundle create /tmp/v.bundle main
scp /tmp/v.bundle vps-paperclip:/root/v.bundle
ssh vps-paperclip 'export PATH=/usr/local/bin:$PATH && cd /var/www/codigo-da-virada \
  && git fetch -q /root/v.bundle main:refs/remotes/bundle/novo \
  && git checkout -q -B main bundle/novo && npm run build \
  && pm2 restart codigo-da-virada --update-env'
curl -s https://codigodavirada.net.br/api/version
```

## Ainda pendente (não bloqueia)

- App em **modo mobile**, conferir depois do que entrou hoje
- **Legenda queimada** no vídeo (a maioria assiste sem som)
- **Depoimentos reais** — prova social segue 3/10, e é o maior ganho de conversão
  que sobrou. Sugestão: acesso grátis a 5 pessoas em troca do relato honesto
- Marketing: Meta, Google Ads, Instagram — só **depois** do passo 2
