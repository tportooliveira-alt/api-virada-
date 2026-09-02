# Roteiro de Lançamento na Hotmart (passo a passo)

## Status atual do produto

| Item | Status |
|---|---|
| App funcionando (PWA) | ✅ Pronto |
| Login Google automático | ✅ Pronto |
| Webhook Hotmart (ativa e desativa acesso) | ✅ Pronto |
| Planilha profissional exportada pra conta do cliente | ✅ Pronto |
| Testes automatizados (166 asserts) | ✅ Pronto |
| **Google Client ID configurado** | ⏳ Falta |
| **Hospedagem no servidor** | ⏳ Falta |
| **Webhook cadastrado na Hotmart** | ⏳ Falta |
| Página de vendas | ⏳ Falta |
| Vídeo de demonstração | ⏳ Falta |
| Política de privacidade | ⏳ Falta |

---

## PASSO 1 — Hospedar o app (1 dia)

### Opção mais rápida: VPS Hostinger (R$ 25/mês)

1. Comprar plano KVM 2 em hostinger.com.br
2. Escolher Ubuntu 22.04
3. Apontar domínio (ex: `app.codigodavirada.com.br`) para o IP do servidor
4. Conectar via SSH e rodar:

```bash
# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2 (manter app vivo)
npm install -g pm2

# Clonar o projeto
git clone https://github.com/tportooliveira-alt/api-virada-.git app
cd app
npm install
npm run build

# Criar .env.local (ver passo 2)
nano .env.local

# Subir o app
pm2 start npm --name "virada" -- start
pm2 startup && pm2 save

# Instalar Caddy (HTTPS automático)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/caddy-stable-archive-keyring.gpg] https://dl.cloudsmith.io/public/caddy/stable/deb/debian any-version main" | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy

# Configurar Caddy
echo 'app.codigodavirada.com.br {
  reverse_proxy localhost:3000
}' | sudo tee /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

---

## PASSO 2 — Configurar variáveis de ambiente

Criar arquivo `.env.local` no servidor:

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=cole_aqui  ← passo 3
HOTMART_TOKEN=gere_um_token_aleatorio_forte
```

Gerar token aleatório:
```bash
openssl rand -hex 32
```

---

## PASSO 3 — Criar Google OAuth Client ID (30 min)

1. Acesse https://console.cloud.google.com
2. Criar projeto → nome "Código da Virada"
3. **APIs & Services → Library** → ativar:
   - Google Sheets API
   - Google Drive API
4. **APIs & Services → OAuth consent screen**:
   - User Type: External
   - App name: Código da Virada
   - User support email: seu email
   - Authorized domains: `codigodavirada.com.br`
5. **Credentials → Create Credentials → OAuth client ID**:
   - Type: Web application
   - Name: Virada App
   - Authorized JavaScript origins:
     - `https://app.codigodavirada.com.br`
   - Clicar em Create
6. Copiar o **Client ID** (formato: `12345-abc.apps.googleusercontent.com`)
7. Colar no `.env.local` e reiniciar: `pm2 restart virada`

---

## PASSO 4 — Cadastrar produto na Hotmart

1. Hotmart → Produtos → Criar produto
2. Tipo: **Produto digital (acesso a área de membros ou link)**
3. Entrega: **URL externa** → `https://app.codigodavirada.com.br`
4. Preço: defina (recomendado R$ 47 - R$ 97 no lançamento)
5. Checkout: ativar cartão, PIX e boleto

---

## PASSO 5 — Cadastrar o webhook na Hotmart

1. Hotmart → Ferramentas → Webhooks → Novo Webhook
2. URL: `https://app.codigodavirada.com.br/api/webhooks/hotmart?token=SEU_TOKEN`
   - Substituir `SEU_TOKEN` pelo valor que você colocou em `HOTMART_TOKEN`
3. Eventos a marcar:
   - ✅ PURCHASE_APPROVED
   - ✅ PURCHASE_CANCELED
   - ✅ PURCHASE_REFUNDED
   - ✅ PURCHASE_CHARGEBACK
4. Salvar e clicar em "Testar" — deve retornar `{"ok":true}`

---

## PASSO 6 — Teste completo de ponta a ponta

1. Comprar o produto em modo teste (Hotmart permite)
2. Verificar: o e-mail chegou no banco SQLite?
   ```bash
   sqlite3 ~/app/data/access.db "SELECT * FROM members;"
   ```
3. Acessar `https://app.codigodavirada.com.br` → clicar "Entrar com Google"
4. Logar com o e-mail que comprou → deve entrar no app
5. Tentar com e-mail que não comprou → deve mostrar "Conta não encontrada"
6. Usar o app: lançar receita, despesa, meta, dívida
7. Clicar "Exportar minha planilha" → abrir no Google Planilhas → conferir gráficos

---

## PASSO 7 — Criar página de vendas

Você precisa de uma página antes do checkout. Pode usar:

- **Framer** (framer.com) — arrasta e solta, rápido, bonito
- **Hotmart Pages** — dentro da própria plataforma
- **WordPress + Elementor** — se já tem hospedagem WordPress

O que a página precisa ter:
1. Headline com problema: "Você sabe quanto gastou esse mês?"
2. Vídeo demonstração do app (30-60 segundos)
3. Lista de benefícios (bullets)
4. Depoimentos (pode ser de beta testers)
5. Bônus (ex: planilha, PDF das 50 ideias que já está na pasta `/public/downloads/`)
6. Botão de compra com urgência
7. Garantia de 7 dias (Hotmart exige)
8. FAQ: "Precisa instalar?", "Funciona no iPhone?", "E se eu perder o celular?"

---

## PASSO 8 — Publicar e divulgar

1. Copiar o link de checkout da Hotmart
2. Colocar o link na bio do Instagram/TikTok
3. Rodar os primeiros anúncios (ver arquivo 09-ESTRATEGIA-MARKETING.md)
