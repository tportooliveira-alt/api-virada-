# Publicar na VPS — passo a passo copiável

> Escrito em 17/09/2026, a partir do que **está no repositório**: `docs/RETOMAR-AQUI.md` §7,
> `DEPLOY_URL.txt`, `docs/POS-CADASTRO-KIWIFY.md` §2 e §4, `package.json`, `next.config.mjs`
> e `.env.example`.
> Tudo que este arquivo **não** sabe está listado na seção 0.2 — não invente nada ali.

---

## 0. Antes de tocar em qualquer comando

### 0.1. O que está sendo publicado (e por que isso importa agora)

O alvo de produção é a **VPS Hostinger** (decisão #1 do `CLAUDE.md`), porque o banco de
compradores é um SQLite em disco (`data/access.db`) e disco efêmero apagaria a lista de quem
pagou.

| Coisa | Valor | De onde saiu |
|---|---|---|
| Domínio público | `https://codigodavirada.net.br` | `docs/RETOMAR-AQUI.md` §7 |
| IP da VPS | `187.77.252.91` | `DEPLOY_URL.txt` |
| Apelido SSH usado nos comandos | `vps-paperclip` | `docs/RETOMAR-AQUI.md` §7 |
| Diretório da aplicação | `/var/www/codigo-da-virada` | `docs/RETOMAR-AQUI.md` §7 |
| Processo pm2 | `codigo-da-virada` | `docs/RETOMAR-AQUI.md` §7 |
| Porta do Next | `3001` | `package.json` (`start` = `next start -p 3001`) |
| Banco de compradores | `<app>/data/access.db` | `lib/access/db.ts` |
| Arquivo de configuração na VPS | `<app>/.env.local` | `docs/POS-CADASTRO-KIWIFY.md` §2 |

> ⚠️ **O `§7` do `RETOMAR-AQUI` publica a branch `main`.** O trabalho novo está em
> `claude/abra-app-fe1urv` e **nunca foi publicado** — quem compra hoje recebe `origin/main`.
> Os comandos abaixo publicam a branch certa. Se você copiar o comando velho, nada muda.

### 0.2. O que **não está no repositório** (só o dono tem)

Nenhuma destas coisas pode ser adivinhada daqui. Tenha em mãos antes de começar:

1. **Como o `vps-paperclip` se autentica** — o `~/.ssh/config` e a chave privada ficam na
   máquina do dono, não no projeto. Se `ssh vps-paperclip` não responder da máquina onde
   você está, use `ssh <usuário>@187.77.252.91` e ajuste os comandos.
2. **Os valores dos segredos** — `KIWIFY_TOKEN`, `ADMIN_SESSION_SECRET`,
   `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. Nunca foram (e nunca devem ser) escritos em arquivo do
   repositório. O que cada um faz está na seção 2.
3. **A configuração do nginx e do certbot** — o repositório não tem nenhum arquivo de
   servidor web. O HTTPS já está de pé (a Kiwify não aceitaria o webhook sem ele), mas a
   configuração vive só na VPS.
4. **O `id` do produto do app na Kiwify** — necessário para `KIWIFY_ALLOWED_PRODUCTS`
   (seção 2). A receita para descobrir sem adivinhar está na seção 2, nota (E).
5. **Se o pm2 foi iniciado em modo de desenvolvimento.** Isto não dá para ver daqui e é a
   primeira suspeita para "o app está muito lento" — a conferência está na seção 5, item 2.

---

## 1. Conferir na sua máquina antes de subir

Publique só o que passa aqui. São ~2 minutos.

```bash
cd /caminho/para/api-virada-
git status --short          # tem que estar limpo
git rev-parse --short HEAD  # ANOTE: é o número que /api/version tem que devolver
npm ci
npm run typecheck
npm run lint
npm run build
```

Os testes do projeto (não há framework; cada um é um script com asserts próprios):

```bash
for t in scripts/test-*.ts; do echo "== $t"; npx tsx "$t" || break; done
```

Índice comentado do que cada teste cobre: `scripts/README.md`.

---

## 2. As variáveis de ambiente (`.env.local` na VPS)

O arquivo fica em `/var/www/codigo-da-virada/.env.local`. **Ele não vem do git** — é escrito
à mão na VPS e sobrevive aos deploys. O modelo comentado é `.env.example`.

| Variável | Obrigatória? | O que faz se estiver certa | O que acontece se faltar |
|---|---|---|---|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | **sim** | É o login inteiro: "Entrar com Google" e "Conectar planilha" | O app mostra que o login não está configurado e **ninguém entra**. Ver nota (A) |
| `KIWIFY_TOKEN` | **sim** | Autentica o aviso de venda da Kiwify | Em produção o webhook responde **503** e **nenhuma compra libera acesso** |
| `ADMIN_SESSION_SECRET` | **sim** | Assina o cookie do painel `/admin`. Mínimo 16 caracteres | As rotas `/api/admin/*` respondem 503 em produção e o painel não abre. Ver nota (B) |
| `ADMIN_EMAILS` | **sim, na prática** | E-mails que entram sem ter comprado (dono, testadores) e que podem receber a sessão de admin | Você não consegue entrar no app nem no painel sem fazer uma compra de verdade |
| `KIWIFY_ALLOWED_PRODUCTS` | recomendada | Diz **qual** produto da conta Kiwify libera o app | Vazio = qualquer compra na conta libera o app, e o **reembolso de outro produto derruba o acesso de quem comprou o app**. Ver nota (E) |
| `ACCESS_DB_DIR` | não | Onde fica `access.db` | Vazio = `<app>/data`, que é o certo na VPS. Ver seção 4 |
| `HOTMART_TOKEN`, `EDUZZ_TOKEN`, `MONETIZZE_TOKEN`, `CAKTO_TOKEN`, `PERFECTPAY_TOKEN` | só se vender lá | Mesmo papel do `KIWIFY_TOKEN` na plataforma correspondente | A rota daquela plataforma responde 503 |
| `..._ALLOWED_PRODUCTS` das outras plataformas | idem | Mesmo papel do `KIWIFY_ALLOWED_PRODUCTS` | idem |
| `APP_BUILD_ID` | não | Fixa o número de versão publicado | Vazio = usa o `git rev-parse --short HEAD` da VPS, que é o que queremos. Ver nota (C) |
| `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | não | Pixels de marketing | Nada quebra |
| `WHATSAPP_WEBHOOK_TOKEN`, `AGENTE_WHATSAPP`, `EVOLUTION_URL`, `EVOLUTION_APIKEY`, `EVOLUTION_INSTANCIA`, `OPENAI_API_KEY`, `CHECKOUT_URL` | não | Agente de WhatsApp (desligado por padrão) | O agente fica desligado; o app não depende dele. Ver nota (D) |

**(A) `NEXT_PUBLIC_*` entra no código na hora do `npm run build`, não na hora de rodar.**
É a pegadinha mais cara deste deploy: mudar `NEXT_PUBLIC_GOOGLE_CLIENT_ID` e só dar
`pm2 restart` **não muda nada** — o valor velho continua dentro do JavaScript que o celular
baixa. Depois de mexer em qualquer `NEXT_PUBLIC_*`, **rode o build de novo**.

**(B) Gere o segredo do admin assim** (na VPS, e cole o resultado no `.env.local`):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**(C)** `next.config.mjs` resolve o `buildId` por `git rev-parse --short HEAD` no diretório
da aplicação. É por isso que `/api/version` devolve exatamente o commit publicado — e é o que
a seção 5 usa para provar que o deploy pegou.

**(D)** O agente de WhatsApp só liga com `AGENTE_WHATSAPP=1`. Deixe fora do `.env.local` até
querer usá-lo.

**(E) Como descobrir o código do produto sem adivinhar:** deixe `KIWIFY_ALLOWED_PRODUCTS`
preenchido com um valor qualquer que você **sabe que está errado**, espere (ou faça) uma
venda, e abra `/admin/membros` → "Últimos avisos de venda recebidos". O aviso ignorado traz,
no motivo, os códigos que vieram no webhook. Copie o do app e substitua. Enquanto isso, o
acesso dessa venda você libera na mão pelo próprio painel.

---

## 3. Levar o código e publicar

### 3.1. Bundle incremental (o caminho normal — ~300 KB)

Este bundle só carrega os commits que faltam. Exige que a VPS já esteja no commit atual de
`origin/main` — que é o caso hoje.

**Na sua máquina:**

```bash
cd /caminho/para/api-virada-
SHA=$(git rev-parse --short HEAD)
git bundle create /tmp/virada-$SHA.bundle origin/main..claude/abra-app-fe1urv
git bundle verify /tmp/virada-$SHA.bundle      # confere o que vai e o que é exigido
scp /tmp/virada-$SHA.bundle vps-paperclip:/root/virada-$SHA.bundle
echo "SHA a publicar: $SHA"
```

**Na VPS** (troque `<SHA>` pelo que o comando acima imprimiu):

```bash
ssh vps-paperclip
export PATH=/usr/local/bin:$PATH
cd /var/www/codigo-da-virada

# rede de segurança: de onde voltar se der errado
git rev-parse --short HEAD > /root/virada-versao-anterior.txt
cat /root/virada-versao-anterior.txt

git fetch -q /root/virada-<SHA>.bundle \
  refs/heads/claude/abra-app-fe1urv:refs/remotes/bundle/novo
git checkout -q -B main bundle/novo
git rev-parse --short HEAD     # tem que ser o <SHA>
```

Se o `git fetch` reclamar de *prerequisite* / *does not have*, a VPS não está no commit que o
bundle incremental esperava. Use o 3.2.

### 3.2. Bundle completo (plano B — ~38 MB)

```bash
# na sua máquina
git bundle create /tmp/virada-full.bundle claude/abra-app-fe1urv
scp /tmp/virada-full.bundle vps-paperclip:/root/virada-full.bundle
```

```bash
# na VPS
cd /var/www/codigo-da-virada
git fetch -q /root/virada-full.bundle \
  refs/heads/claude/abra-app-fe1urv:refs/remotes/bundle/novo
git checkout -q -B main bundle/novo
```

### 3.3. Instalar, construir, reiniciar

**`npm ci` não é opcional nesta publicação:** o `package.json` e o `package-lock.json`
mudaram nesta rodada (a dependência `googleapis` saiu). Sem ele, a VPS fica com o
`node_modules` velho.

```bash
cd /var/www/codigo-da-virada
ls -la .env.local                 # confirme que ele existe ANTES do build (nota A da seção 2)
npm ci                            # recompila o better-sqlite3 (módulo nativo) — demora
npm run build
pm2 restart codigo-da-virada --update-env
pm2 logs codigo-da-virada --lines 40 --nostream
```

Se o `npm ci` falhar compilando `better-sqlite3`, faltam as ferramentas de compilação na VPS
(`python3`, `make`, `g++`). É erro de máquina, não de código.

---

## 4. O `data/` que não pode sumir

`lib/access/db.ts` cria `<ACCESS_DB_DIR ou ./data>/access.db` sob demanda, em modo WAL. São
três arquivos: `access.db`, `access.db-wal`, `access.db-shm`.

Ele **não está no git** e **não é tocado pelo deploy** (o `git checkout` não mexe em arquivo
não rastreado). Mas vale conferir e ter cópia:

```bash
cd /var/www/codigo-da-virada
ls -la data/
sqlite3 data/access.db "select count(*) from members;"   # se o sqlite3 estiver instalado

# backup antes de qualquer deploy (leva segundos, evita perder a lista de quem pagou)
mkdir -p /root/backups
cp -a data /root/backups/data-$(date +%F-%H%M)
```

> Nunca rode `git clean -xdf` neste diretório: ele apagaria `data/` e `.env.local` juntos.

---

## 5. Verificações depois do deploy

Rode **todas**. As quatro primeiras são de terminal e levam menos de um minuto.

**1. A versão publicada é a que você subiu.**

```bash
curl -s https://codigodavirada.net.br/api/version
# tem que devolver {"buildId":"<SHA>"} com o MESMO SHA da seção 3
```

Se vier um SHA antigo, o pm2 está servindo build velha — reinicie de novo e confira
`pm2 describe codigo-da-virada`.

**2. O pm2 está rodando em PRODUÇÃO, não em modo de desenvolvimento.**
É a checagem que mais paga: `next dev` entrega JavaScript não minificado e recompila a cada
navegação — no celular isso é exatamente a sensação de "app lento e travando".

```bash
ssh vps-paperclip 'pm2 describe codigo-da-virada | egrep -i "script|args|exec|node env|watch"'
```

Tem que apontar para `start` (`next start -p 3001`) e `NODE_ENV=production`.
Se aparecer `dev` ou `next dev`, corrija:

```bash
ssh vps-paperclip
cd /var/www/codigo-da-virada
pm2 delete codigo-da-virada
NODE_ENV=production pm2 start npm --name codigo-da-virada -- run start
pm2 save
```

**3. O service worker está publicado** (é o que faz o app abrir sem internet — ele só existe
a partir desta publicação):

```bash
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" https://codigodavirada.net.br/sw.js
# 200 e algo com javascript
```

**4. A porta de entrada de quem acabou de pagar abre sem login:**

```bash
curl -s https://codigodavirada.net.br/obrigado | grep -c "mesmo e-mail"
# tem que ser 1 ou mais. Zero = a página voltou para trás do muro de login
```

**5. O webhook responde (sem precisar do segredo):**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  -H 'content-type: application/json' -d '{}' \
  https://codigodavirada.net.br/api/webhooks/kiwify
```

- `401` → certo: o token **está** configurado e a requisição sem token foi recusada.
- `503` → o `KIWIFY_TOKEN` **não está** no `.env.local`. **Nenhuma venda libera acesso.** Pare e configure.
- `404` → a rota não subiu. Build errada.

**6. O painel de compradores está fechado para quem não é admin:**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://codigodavirada.net.br/api/admin/members
```

- `401` → certo: o `ADMIN_SESSION_SECRET` está configurado e falta o cookie assinado.
- `503` → falta o `ADMIN_SESSION_SECRET`. O painel não abre nem para você.
- `200` → **pare tudo**: a lista de compradores está aberta na internet.

**7. A landing e o app abrem:**

```bash
for p in / /vendas /app/inicio /politica-privacidade.html /termos-de-uso.html; do
  printf "%-28s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' https://codigodavirada.net.br$p)"
done
```

**8. No celular, com os olhos** (nada aqui é substituível por `curl`):

- Entrar com a conta Google do e-mail da compra e chegar na tela Início.
- Tela **Conta** → "Conectar Google Planilhas": a tela do Google tem de pedir **só**
  "ver e gerenciar arquivos criados por este app". Se aparecer "todas as suas planilhas",
  o escopo antigo voltou — pare e veja `CLAUDE.md`, decisão #13.
- Abrir a planilha no Google Planilhas e conferir o roteiro de 5 pontos do `CLAUDE.md`
  (decisão #6): `Dashboard!B3` como texto, `A6`/`D6`/`J6` batendo com a tela Início,
  as `SPARKLINE` desenhando, o menu da aba Filtros recusando texto inventado, e
  `Bolsos!D9:F11` batendo com o card "Seus 3 bolsos".
- Lançar um gasto, deixar a aba aberta ~5 s e ver a planilha mudar **sozinha**.
- Instalar o app pela tela do navegador e reabrir **em modo avião**: tem de abrir.

---

## 6. Voltar atrás (rollback)

```bash
ssh vps-paperclip
cd /var/www/codigo-da-virada
git checkout -q -B main $(cat /root/virada-versao-anterior.txt)
npm ci && npm run build
pm2 restart codigo-da-virada --update-env
curl -s https://codigodavirada.net.br/api/version
```

O `data/access.db` e o `.env.local` não são afetados pelo rollback.

---

## 7. O que o deploy **não** conserta (é configuração de painel, não de código)

Ordem de urgência. O detalhe de cada um está em `docs/RETOMAR-AQUI.md` §3.

1. **Declarar `https://www.googleapis.com/auth/drive.file` na tela de consentimento do
   Google** (console.cloud.google.com → Tela de permissão OAuth → Escopos). **Não** marcar
   `auth/spreadsheets`. Confirmar que Google Sheets API e Google Drive API estão ativadas.
2. **`KIWIFY_ALLOWED_PRODUCTS`** no `.env.local` da VPS, ou restringir o webhook ao produto
   certo no painel da Kiwify. Hoje o webhook está em "todos os produtos".
3. **Uma compra de verdade, ponta a ponta**, com um e-mail que você controla — e um
   reembolso de teste para ver o acesso cair.
4. **Kiwify**: verificação de identidade, conta bancária, Pix, recuperação de venda
   abandonada, bloco de texto no checkout (`docs/KIWIFY-produto.md`).
