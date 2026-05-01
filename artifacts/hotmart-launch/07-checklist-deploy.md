# Checklist Deploy — Virada App em Produção

> **Bloqueante:** SQLite NÃO funciona em Netlify/Vercel (serverless apaga disco). Precisa VPS ou Render/Railway.

---

## Opção recomendada: Render (mais barato, persistência fácil)
Custo: ~US$ 7/mês (hobby plan com disk).

### Passo a passo
1. Criar conta em https://render.com
2. New > Web Service > conectar repo `tportooliveira-alt/api-virada-`
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Environment: Node 20
6. Adicionar Disk: Name `data`, Mount path `/var/data`, Size 1GB
7. Variáveis de ambiente (copiar do `.env.example`):
   ```
   NODE_ENV=production
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=<criar no Google Cloud Console>
   HOTMART_TOKEN=<gerar token aleatório forte: openssl rand -hex 32>
   ADMIN_EMAILS=thiago@dev.com,priscila@email.com
   NEXT_PUBLIC_META_PIXEL_ID=<id do pixel meta>
   NEXT_PUBLIC_GTM_ID=<id GTM>
   NEXT_PUBLIC_TIKTOK_PIXEL_ID=<id pixel TT>
   ACCESS_DB_PATH=/var/data/access.db
   ```
8. Deploy

### Configurar Hotmart depois do deploy
1. Painel produtor Hotmart > Ferramentas > Webhook
2. URL: `https://SEU-APP.onrender.com/api/webhooks/hotmart?token=O_TOKEN_QUE_VOCE_GEROU`
3. Eventos: `PURCHASE_APPROVED`, `PURCHASE_CANCELED`, `PURCHASE_REFUNDED`, `PURCHASE_CHARGEBACK`
4. Salvar e disparar evento de teste

### Validar
```bash
# Listar membros (do PC)
curl -H "x-admin-email: thiago@dev.com" https://SEU-APP.onrender.com/api/admin/members

# Cadastrar manual (caso teste)
curl -X POST -H "x-admin-email: thiago@dev.com" -H "content-type: application/json" \
  -d "{\"email\":\"teste@gmail.com\",\"name\":\"Teste\"}" \
  https://SEU-APP.onrender.com/api/admin/members/manual
```

---

## Opção 2: VPS Hostinger (já tem) — mais trabalho, custo zero
Cliente já tem VPS pra outro projeto (site-imobiliaria). Pode coexistir.

1. SSH no VPS
2. `git clone https://github.com/tportooliveira-alt/api-virada-.git /opt/virada-app`
3. `cd /opt/virada-app && npm ci && npm run build`
4. Criar `.env.local` (mesmas vars do Render)
5. Configurar systemd:
   ```ini
   # /etc/systemd/system/virada-app.service
   [Unit]
   Description=Virada App
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/opt/virada-app
   ExecStart=/usr/bin/npm start
   Restart=always
   Environment=NODE_ENV=production
   EnvironmentFile=/opt/virada-app/.env.local

   [Install]
   WantedBy=multi-user.target
   ```
6. `systemctl enable --now virada-app`
7. Configurar nginx + certbot pra HTTPS no subdomínio (ex: `app.viradapp.com.br`)

---

## Domínio
- Recomendo subdomínio do domínio principal (ex: `app.codigodavirada.com.br`)
- Apontar A record (VPS) ou CNAME (Render) no DNS
- HTTPS automático em ambos

---

## Pré-requisitos antes de abrir vendas
- [ ] Build em produção OK (https://SEU-APP/app/inicio carrega)
- [ ] Login Google funciona (OAuth client criado e domínio autorizado)
- [ ] Webhook Hotmart respondendo 200 (teste com evento dispatch)
- [ ] Admin endpoint listando membros
- [ ] Pixel Meta ativo (Meta Pixel Helper extension confirma)
- [ ] Página de checkout Hotmart pronta com copy do `02-copy-checkout.md`
- [ ] 3 criativos de tráfego subidos
- [ ] Conta WhatsApp Business com respostas rápidas configuradas
