# Retomar aqui — 12/09/2026

Este arquivo é o "por onde eu continuo". A versão anterior era de 04/09 e dizia que
faltava **um** passo (pôr o token do webhook na Kiwify). Esse passo **já foi dado**, e
depois dele descobrimos coisas maiores. O estado honesto de hoje é este.

> **Como ler:** o que está marcado **(confirmado pelo dono)** veio do Thiago em 12/09/2026 —
> não dá pra verificar daqui, mas é a palavra de quem tem acesso aos painéis. O que está
> marcado **(verificado no código)** foi lido linha a linha neste repositório. O que está
> em **falta** ninguém conferiu ainda — e falta mesmo.

---

## 1. O que já está de pé

| O quê | Como está | Prova |
|---|---|---|
| Tela de consentimento do Google | **Produção / Externo** — não está em modo de teste, não precisa cadastrar "usuário de teste" | confirmado pelo dono |
| Webhook da Kiwify | já aponta para a VPS e chega com o token | confirmado pelo dono |
| Login confere a compra | o e-mail é procurado no `data/access.db` e o token do Google é validado no servidor | verificado no código (`app/api/access/check/route.ts`) |
| App offline | dados no IndexedDB + service worker | verificado no código |
| Planilha "viva" (fórmulas pt-BR dentro do Sheets) | montada e provada offline | verificado no código (`scripts/test-planilha-formulas.ts`) |

⚠️ **Qualquer documento deste repositório que fale em "modo de teste" ou "adicionar usuário
de teste" no Google está velho.** Ignore.

---

## 2. O que esta rodada (12/09) consertou

1. **A sincronização automática da planilha passou a existir.** Até hoje o `CLAUDE.md`
   (decisão #4) e `public/vendas.html` prometiam que "a planilha se atualiza sozinha" — e
   não havia **uma linha** disso no código: a planilha só andava quando alguém apertava o
   botão. O motor foi extraído pra `lib/sheets/sync-runner.ts` e ligado no
   `providers/virada-provider.tsx`, com regra de disparo provada sem rede em
   `scripts/test-auto-sync.ts`. Condições reais (que os textos agora descrevem): só depois
   de a pessoa criar a planilha, só com autorização válida (≈1 h), só com o app na frente,
   espera 4 s de silêncio, 3 tentativas e desiste calado — o automático nunca abre popup
   nem mostra erro.
2. **O escopo do Google encolheu** de `auth/spreadsheets` (ler e editar **todas** as
   planilhas da conta, escopo sensível, exige verificação) para `auth/drive.file`
   (só os arquivos que o próprio app cria). O app nunca precisou do escopo largo.
   Ver `CLAUDE.md`, decisão #13.
3. **Política de privacidade e termos de uso reescritos** pra dizer a verdade:
   `public/politica-privacidade.html` afirmava "não acessamos seus outros dados Google"
   (falso enquanto o escopo era o largo) e "tokens validados em servidor" (falso: o token
   da planilha nunca passa pelo servidor; o navegador fala direto com o Google).
4. **Filtro de produto no webhook** (`<PLATAFORMA>_ALLOWED_PRODUCTS`), pra outra compra na
   mesma conta Kiwify não liberar o app.
5. **`scripts/test-textos-verdadeiros.ts`**: um teste que lê as constantes reais do código
   e quebra quando doc ou página pública discordar delas.

---

## 3. Só o dono pode fazer (e trava a venda)

### 3.1. Declarar os escopos na tela de consentimento do Google — **bloqueia a planilha**

Os escopos que o código pede **não estão declarados** na tela de consentimento
(confirmado pelo dono). Sem isso, quem tocar em "Conectar Google Planilhas" não consegue
autorizar — a entrega principal do produto para de pé.

1. console.cloud.google.com → projeto do app → **APIs e serviços** → **Tela de permissão OAuth**
2. **Escopos** → **Adicionar ou remover escopos**
3. Marcar **exatamente um**: `https://www.googleapis.com/auth/drive.file`
   (**não** marcar `.../auth/spreadsheets` — é o escopo largo que acabamos de abandonar;
   ele é sensível e joga o app na fila de verificação do Google)
4. Salvar e publicar as alterações.
5. Confirmar que **Google Sheets API** e **Google Drive API** estão ativadas na Biblioteca.

Enquanto isso, a **URL da política de privacidade** exigida ali é
`https://codigodavirada.net.br/politica-privacidade.html` e a dos termos é
`https://codigodavirada.net.br/termos-de-uso.html`.

### 3.2. Restringir o webhook ao produto certo — **risco de dar acesso de graça**

O webhook da Kiwify está em **"Todos os produtos"** (confirmado pelo dono): qualquer outra
compra feita na mesma conta libera o app. O conserto é uma linha no `.env.local` da VPS:

```
KIWIFY_ALLOWED_PRODUCTS=<id ou nome do produto do Virada App>
```

Como descobrir o código certo sem adivinhar: faça (ou espere) uma venda e abra
`/admin/membros` → **"Últimos avisos de venda recebidos"** → copie o código que aparece no
motivo do aviso ignorado. Vazio = aceita tudo (comportamento antigo). Alternativa: trocar
o webhook na Kiwify para só o produto do app — mas a env protege mesmo se alguém mexer no
painel depois.

### 3.3. Uma compra de verdade, com conta Google de verdade — **obrigatório antes de anunciar**

Nada aqui substitui isto, porque **não existe credencial Google nesta máquina**: todos os
testes da planilha são offline. Ninguém nunca viu a planilha do Virada nascer de verdade.

Roteiro mínimo, em ordem:

1. Pagar (ou usar um cupom de 100%) com um e-mail que você controla;
2. Receber o e-mail e entrar no app **com o mesmo e-mail da compra**;
3. Tela **Conta** → "Conectar Google Planilhas" → conferir na tela do Google que aparece
   **só** "ver e gerenciar arquivos criados por este app" (se aparecer "todas as suas
   planilhas", o escopo antigo voltou — pare e volte ao passo 3.1);
4. Ver a planilha nascer no Drive e **conferir com os olhos**: o Dashboard em `B3`/`A6`
   mostrando número (e não `#ERRO!`), e as `SPARKLINE` desenhando. Essas duas são as que
   nenhum teste offline consegue provar — ver `CLAUDE.md`, decisão #6;
5. Lançar um gasto no app, deixar a aba aberta e esperar ~5 s: a planilha deve mudar
   sozinha, sem tocar em botão nenhum. É a prova do item 2.1 desta rodada;
6. Pedir reembolso na plataforma e confirmar que o acesso cai.

Descobrir entrega quebrada com dinheiro de tráfego rodando é o erro mais caro possível.

---

## 4. Pendências de texto que não são minhas de consertar

- **A landing não linka a política completa.** O rodapé de `public/vendas.html` manda para
  as âncoras `#privacidade` e `#termos` — dois parágrafos curtos dentro da própria página,
  que divergem de `public/politica-privacidade.html` e `public/termos-de-uso.html`. Trocar
  os `href` para `/politica-privacidade.html` e `/termos-de-uso.html` em
  `scripts/build-vendas.mjs` (o `vendas.html` é gerado, não editar na mão). Importa duas
  vezes: a verificação do Google procura o link da política na página inicial, e o
  parágrafo da landing não fala nada de escopo.
- ~~**`docs/configurar-google-sheets.md` está obsoleto do começo ao fim**~~ → **reescrito em
  17/09/2026**: agora descreve o que o app de fato precisa (APIs ativadas, tela de
  consentimento com **só** `drive.file`, client id OAuth em `NEXT_PUBLIC_GOOGLE_CLIENT_ID`) e
  registra que a conta de serviço nunca foi usada. Quem tiver um `.json` de conta de serviço
  baixado por causa da versão antiga: apagar e revogar a chave.
- **`docs/estrategia-google-sync.md:54`** ainda lista os dois escopos; hoje é só `drive.file`.
- Outras divergências menores estão listadas em `CLAUDE.md`, seção "A casa a organizar".

---

## 5. Kiwify — continua faltando preencher

- **Verificação de identidade**: sem aprovação você vende mas não saca.
- **Financeiro**: conta bancária no seu nome/CPF.
- **Recuperação de venda abandonada** (Configurações): ative 5 min, 24 h e 7 dias.
  É a maior alavanca de faturamento sem gastar mais em tráfego.
- **Bloco de texto no checkout** (Checkout Builder): a descrição do produto **não aparece**
  no checkout, então a garantia de 7 dias não está sendo vista na hora de pagar. Texto
  pronto em `docs/KIWIFY-produto.md`.
- **Pix ativo**: público apertado paga em Pix.

---

## 6. Onde está cada coisa

| O quê | Onde |
|---|---|
| Fonte de verdade do projeto (decisões, contratos, o que é mentira) | `CLAUDE.md` |
| Índice comentado dos testes | `scripts/README.md` |
| Registro da sessão de 04/09 | `docs/SESSAO-2026-09-04.md` |
| Cadastro do produto na Kiwify | `docs/KIWIFY-produto.md` |
| Variáveis de ambiente (com explicação de cada uma) | `.env.example` |
| Vídeo de anúncio 15s | `_design/video/anuncio-15s.mp4` |
| Roteiro do vídeo | `_design/video/roteiro.txt` |
| Capa do e-book (regerar) | `_design/capa-ebook-montanha.html` |
| Imagem do produto (regerar) | `_design/imagem-produto-kiwify.html` |
| Checkout | `pay.kiwify.com.br/QUVGK3y` |

---

## 7. Deploy

> **Passo a passo completo e copiável: [`docs/PUBLICAR-NA-VPS.md`](PUBLICAR-NA-VPS.md)** —
> variáveis de ambiente uma por uma, o `data/` do SQLite, as 8 verificações pós-deploy e o
> rollback. Use aquele arquivo; o resumo abaixo é só o esqueleto.

⚠️ **Dois avisos que o resumo antigo não dava, e que custam caro:**

1. **Ele publicava `main`.** O trabalho desta fase está em `claude/abra-app-fe1urv` e
   **nunca foi publicado** — quem compra hoje recebe `origin/main`, sem auto-sync da
   planilha, com o escopo sensível `auth/spreadsheets`, com `/obrigado` atrás do login e
   com o painel de compradores aberto por um header forjável. Publicar `main` não muda nada.
2. **Faltava `npm ci`.** O `package.json` mudou nesta rodada (saiu a `googleapis`); sem
   reinstalar, a VPS constrói com o `node_modules` velho.

```bash
# na sua máquina
SHA=$(git rev-parse --short HEAD)
git bundle create /tmp/virada-$SHA.bundle origin/main..claude/abra-app-fe1urv
scp /tmp/virada-$SHA.bundle vps-paperclip:/root/virada-$SHA.bundle
echo "$SHA"   # é o que /api/version tem que devolver depois

# na VPS (troque <SHA>)
ssh vps-paperclip 'export PATH=/usr/local/bin:$PATH && cd /var/www/codigo-da-virada \
  && git fetch -q /root/virada-<SHA>.bundle \
       refs/heads/claude/abra-app-fe1urv:refs/remotes/bundle/novo \
  && git checkout -q -B main bundle/novo && npm ci && npm run build \
  && pm2 restart codigo-da-virada --update-env'

curl -s https://codigodavirada.net.br/api/version
```

---

## 8. Ainda pendente (não bloqueia a venda)

- App em **modo mobile**, conferir depois do que entrou nesta rodada.
- **Legenda queimada** no vídeo (a maioria assiste sem som).
- **Depoimentos reais** — prova social segue fraca, e é o maior ganho de conversão que
  sobrou. Sugestão: acesso grátis a 5 pessoas em troca do relato honesto.
- Marketing: Meta, Google Ads, Instagram — só **depois** do item 3.3.
