# O que falta pra começar a vender

Lista em ordem de importância. Marque ✅ conforme for fazendo.

## 1. ⏳ Configuração obrigatória (sem isso, nada funciona)

### 1.1 Google OAuth Client ID

- [ ] Criar projeto em https://console.cloud.google.com
- [ ] Ativar **Google Sheets API** e **Google Drive API**
- [ ] **APIs & Services → Credentials → Create Credentials → OAuth Client ID → Web application**
- [ ] Em **Authorized JavaScript origins** adicionar:
  - `http://localhost:3000` (dev)
  - `https://SEU-DOMINIO.com` (produção)
- [ ] Copiar o Client ID e colar em `.env.local`:
  ```
  NEXT_PUBLIC_GOOGLE_CLIENT_ID=12345-abcdef.apps.googleusercontent.com
  ```

> Sem isso, o botão "Entrar com Google" mostra mensagem amarela "não configurado" e a exportação de planilha não funciona.

### 1.2 Hospedagem (servidor próprio / VPS)

- [ ] Contratar VPS (DigitalOcean / Hetzner / Hostinger / Contabo) ou servidor compartilhado com Node.js
- [ ] Apontar domínio (ex.: `app.codigodavirada.com.br`)
- [ ] Instalar Node.js 20+
- [ ] `npm install && npm run build && npm run start`
- [ ] Configurar HTTPS (Let's Encrypt via Caddy ou Nginx + Certbot)
- [ ] Configurar `pm2` ou `systemd` para manter o app rodando

> **Por que não Vercel/Netlify**: o app usa SQLite em arquivo (`data/access.db`). Em ambiente serverless o disco é efêmero — perderia dados a cada deploy. Se preferir Vercel, troque SQLite por Postgres (Neon / Supabase).

### 1.3 Tokens de webhook (segurança)

Para cada plataforma que você for usar, defina no `.env.local` um token aleatório e configure o mesmo token na URL do webhook do painel da plataforma:

```
HOTMART_TOKEN=tok_xxxxxxxxxxxxxxxxx
EDUZZ_TOKEN=tok_yyyyyyyyyyyyyyyyy
KIWIFY_TOKEN=tok_zzzzzzzzzzzzzzzzz
MONETIZZE_TOKEN=tok_wwwwwwwwwwwwwwwww
CAKTO_TOKEN=tok_vvvvvvvvvvvvvvvvv
PERFECTPAY_TOKEN=tok_uuuuuuuuuuuuuuuuu
```

> Se a env não existir, o webhook fica **aberto** — qualquer um pode cadastrar emails. Em produção, sempre defina os tokens.

## 2. ⏳ Configurar webhooks no painel de cada plataforma

Para cada uma que você for usar (não precisa configurar todas):

### Hotmart
- Painel → Ferramentas → Webhooks → Adicionar
- URL: `https://SEU-DOMINIO.com/api/webhooks/hotmart?token=SEU_TOKEN`
- Eventos: PURCHASE_APPROVED, PURCHASE_CANCELED, PURCHASE_REFUNDED, PURCHASE_CHARGEBACK

### Eduzz
- Painel → Configurações → Webhook
- URL: `https://SEU-DOMINIO.com/api/webhooks/eduzz?token=SEU_TOKEN`
- Eventos: trans_status PAID/REFUNDED/CANCELED

### Kiwify
- Painel → Apps → Webhooks
- URL: `https://SEU-DOMINIO.com/api/webhooks/kiwify?token=SEU_TOKEN`
- Eventos: order_approved, order_refunded, chargeback

### Monetizze
- Painel → Integrações → Postback
- URL: `https://SEU-DOMINIO.com/api/webhooks/monetizze?token=SEU_TOKEN`
- Eventos: Compra Finalizada, Estornada, Cancelada

### Cakto
- Painel → Integrações → Webhook
- URL: `https://SEU-DOMINIO.com/api/webhooks/cakto?token=SEU_TOKEN`

### Perfectpay
- Painel → Integrações → Webhooks
- URL: `https://SEU-DOMINIO.com/api/webhooks/perfectpay?token=SEU_TOKEN`

## 3. 🔧 Coisas técnicas que ficaram pra trás

### 3.1 Página `/admin/membros`
- [ ] Listar todos os membros (paginado) com status, plataforma, data
- [ ] Permitir cadastro manual (caso suporte precise liberar alguém na mão)
- [ ] Permitir cancelar/reembolsar manualmente
- [ ] Acesso protegido por e-mail admin (env `ADMIN_EMAILS`)

### 3.2 Auditoria visível
- [ ] Página `/admin/webhooks` lendo a tabela `webhook_log` para depurar entregas

### 3.3 Backup automático do SQLite
- [ ] Cron job (ou GitHub Action) copiando `data/access.db` para S3/Drive a cada hora

### 3.4 Texto da landing / página de vendas
- [ ] Conteúdo de `app/page.tsx` (hoje a `/` redireciona) precisa virar página de vendas
- [ ] Vincular ao checkout da plataforma escolhida

### 3.5 Conferência de UI
- [ ] Validar todas as páginas em telas pequenas (320px de largura)
- [ ] Testar instalação como PWA no iOS e Android
- [ ] Conferir que `manifest.webmanifest` e ícones estão completos

### 3.6 Dependências
- [ ] `npm audit` aponta vulnerabilidades em `next` / `eslint-config-next`. Atualizar Next 14 → 15 antes do lançamento, em janela isolada (testar bem, é breaking change)

## 4. 📣 Marketing e operação

- [ ] Pixel Meta / Google Analytics no site de vendas
- [ ] Email de boas-vindas automático após compra (ex.: ActiveCampaign / Mailchimp / Resend)
- [ ] Política de privacidade e termos de uso (obrigatório pelas plataformas)
- [ ] FAQ "como entrar" / "comprei e não consigo entrar"
- [ ] Vídeo curto mostrando "compra → login → app → exporta planilha"

## 5. 🧪 Antes do lançamento

- [ ] Fazer 1 compra teste em cada plataforma (modo sandbox quando existir, ou produto de R$ 1)
- [ ] Confirmar que o e-mail entrou no banco automaticamente
- [ ] Confirmar que login Google libera o acesso
- [ ] Exportar uma planilha real e abrir no Google Planilhas
- [ ] Tentar entrar com um e-mail que NÃO comprou — confirmar que aparece "Conta não encontrada"
- [ ] Forçar offline e ver se o app continua acessível para quem já está ativo
