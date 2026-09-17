# Configurar o Google (login + planilha) — o que o dono faz no console

> Reescrito em 17/09/2026. **A versão anterior deste arquivo estava errada do começo ao fim**:
> mandava criar uma *conta de serviço* e colar `GOOGLE_SERVICE_ACCOUNT_JSON` no `.env.local`.
> O app nunca usou nada disso — e não usa hoje. Quem seguisse aquele passo a passo colocava
> uma chave privada num arquivo de servidor sem nenhum motivo, e a planilha continuava sem
> funcionar. Fica o registro para ninguém "consertar" de volta.

## Como o app fala com o Google (a verdade, em três linhas)

1. O **navegador do cliente** pede autorização ao Google, pelo Google Identity Services (GIS).
2. Com esse token, **o próprio navegador** cria a planilha no Drive **da conta do cliente** e
   escreve nela (`lib/sheets/sync-runner.ts`).
3. **O nosso servidor nunca vê esse token e nunca toca na planilha.** Ele só confere, no
   login, se o e-mail está na lista de quem comprou.

Consequências práticas: não existe conta de serviço, não existe chave privada de Google no
servidor, e não existe planilha "nossa" — cada cliente tem a dele, no Drive dele.

O único valor de configuração que o app precisa é o **client id do OAuth**, em
`NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

---

## Passo 1 — Projeto e APIs

1. https://console.cloud.google.com/ → selecionar (ou criar) o projeto do app.
2. **APIs e serviços** → **Biblioteca**:
   - ativar **Google Sheets API**
   - ativar **Google Drive API**

## Passo 2 — Tela de permissão OAuth (é aqui que a venda trava)

1. **APIs e serviços** → **Tela de permissão OAuth**.
2. Tipo de usuário: **Externo**, e o app em **Produção** (não em "Teste" — em teste só os
   e-mails cadastrados à mão conseguem autorizar, e o comprador não é um deles).
3. **Escopos** → **Adicionar ou remover escopos** → marcar **exatamente um**:

   ```
   https://www.googleapis.com/auth/drive.file
   ```

   **Não marque `https://www.googleapis.com/auth/spreadsheets`.** Ele dá ao app "ver, editar
   e apagar **todas** as suas planilhas", é escopo sensível (joga o projeto na fila de
   verificação do Google) e o app não precisa dele: o único `spreadsheetId` que existe é o da
   planilha que o próprio app criou. O porquê inteiro está em `CLAUDE.md`, decisão #13.
4. URLs pedidas ali:
   - Política de privacidade: `https://codigodavirada.net.br/politica-privacidade.html`
   - Termos de uso: `https://codigodavirada.net.br/termos-de-uso.html`
5. Salvar **e publicar** as alterações.

## Passo 3 — Credencial OAuth (client id)

1. **APIs e serviços** → **Credenciais** → **Criar credenciais** → **ID do cliente OAuth**.
2. Tipo: **Aplicativo da Web**.
3. **Origens JavaScript autorizadas** — o GIS confere a origem de onde a página foi servida:
   - `https://codigodavirada.net.br`
   - `http://localhost:3001` (desenvolvimento; a porta é a do `npm run dev`)
4. Copiar o **ID do cliente** (termina em `.apps.googleusercontent.com`).

## Passo 4 — Pôr o client id no servidor

No `.env.local` da VPS (`/var/www/codigo-da-virada/.env.local`):

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<o id copiado>.apps.googleusercontent.com
```

⚠️ **`NEXT_PUBLIC_*` entra no código na hora do `npm run build`**, não na hora de rodar.
Mudar o valor e só reiniciar o pm2 **não muda nada**. Rode o build de novo — o procedimento
inteiro está em [`PUBLICAR-NA-VPS.md`](PUBLICAR-NA-VPS.md).

---

## Como saber que ficou certo

No celular, com uma conta Google de verdade:

1. Entrar no app e ir na tela **Conta** → **Conectar Google Planilhas**.
2. Na tela do Google tem de aparecer **só** algo como *"ver e gerenciar arquivos do Google
   Drive criados ou abertos por este app"*.
   Se aparecer *"ver, editar e apagar todas as suas planilhas"*, **pare**: o escopo largo
   voltou ao código ou à tela de consentimento.
3. A planilha "Virada Financeira — <seu e-mail>" aparece no seu Drive e abre no Google
   Planilhas.
4. Conferir com os olhos o roteiro de 5 pontos do `CLAUDE.md` (decisão #6): `Dashboard!B3`
   como texto, `A6`/`D6`/`J6` batendo com a tela Início, as `SPARKLINE` desenhando, o menu da
   aba Filtros recusando texto inventado e `Bolsos!D9:F11` batendo com "Seus 3 bolsos".
5. Lançar um gasto no app, deixar a aba aberta ~5 s e ver a planilha mudar sozinha.

## Quando der erro

| O que aparece | O que quase sempre é |
|---|---|
| `invalid_scope` / "alguns escopos não podem ser exibidos" | o escopo não foi declarado (ou foi declarado errado) no passo 2 |
| `redirect_uri_mismatch` / `origin_mismatch` | falta a origem no passo 3 |
| "O Google não verificou este app" | o projeto está em Produção sem verificação; com **só** `drive.file` isso não bloqueia a venda, mas aparece na tela |
| "acesso bloqueado" só para quem não é você | a tela de consentimento ficou em **Teste** |
| O cartão do app diz que o Google não está configurado | falta `NEXT_PUBLIC_GOOGLE_CLIENT_ID` **no build** |

## Não existe mais

- `GOOGLE_SERVICE_ACCOUNT_JSON` — nunca foi lido por nenhuma linha do app.
- `lib/sheets/google-sheets.ts` (o wrapper de servidor com `googleapis`) — apagado em
  12/09/2026 por ser caminho morto e duplicado. `scripts/test-textos-verdadeiros.ts` quebra
  se ele voltar.

Se você tem um `.json` de conta de serviço baixado por causa da versão antiga deste arquivo,
**apague-o e revogue a chave** no console: é uma credencial viva que não serve para nada aqui.
