# Configurar Google Planilhas — exportação 1-clique

> **Atualizado 2026-05-22.** Esta doc reflete o fluxo atual com **OAuth via Google Identity Services (GIS)** — o usuário final clica "Permitir" no popup do Google e a planilha é criada **no Drive dele**. Sem service account, sem upload manual.
>
> A versão antiga usava `GOOGLE_SERVICE_ACCOUNT_JSON` no servidor — esse fluxo ainda existe como fallback em `lib/sheets/google-sheets.ts` mas não é o caminho padrão de exportação do cliente.

---

## Pré-requisitos

- Conta Google Cloud (gratuita — não precisa cartão)
- Projeto Next.js do app (`02-virada-app/`) rodando local ou em produção

---

## PASSO 1 — Criar projeto + ativar APIs no Google Cloud

1. Acesse https://console.cloud.google.com/
2. Topo da página → **"Selecionar projeto"** → **"Novo projeto"**
3. Nome: `virada-app` → **Criar**
4. Com o projeto selecionado, vá em **APIs e serviços** → **Biblioteca**
5. Ative as duas APIs:
   - **Google Sheets API** → clique → **Ativar**
   - **Google Drive API** → clique → **Ativar**

---

## PASSO 2 — Criar Client ID OAuth (Web Application)

1. Vá em **APIs e serviços** → **Credenciais**
2. Clique em **Criar credenciais** → **ID do cliente OAuth**
3. Se for a primeira vez, configure a tela de consentimento (Tipo "Externo" → preencha nome do app, email e logo opcional)
4. Tipo de aplicativo: **Aplicativo da Web**
5. Nome: `virada-app-web`
6. **Origens JavaScript autorizadas** (adicionar todas que vai usar):
   - `http://localhost:3000`
   - `https://app.codigodavirada.net.br` *(produção)*
   - `https://aquamarine-crumble-9be5b2.netlify.app` *(deploy atual Netlify, se ainda for usado)*
7. **URIs de redirecionamento autorizados**: nenhum (GIS usa popup, não redirect)
8. Clique **Criar** → copie o **Client ID** (formato `1234567890-abc.apps.googleusercontent.com`)

---

## PASSO 3 — Colocar o Client ID no app

Abra `02-virada-app/.env.local` (crie se não existir):

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=1234567890-abc.apps.googleusercontent.com
```

> ⚠️ Prefixo `NEXT_PUBLIC_` é obrigatório — esse valor vai pro client. **Não inclua segredos aqui** — o Client ID OAuth é público por design.

Reinicie o servidor de dev:

```powershell
cd "C:\Users\Thiago Porto\codigo-da-virada\02-virada-app"
npm run dev
```

---

## PASSO 4 — Testar

1. Acesse `http://localhost:3000/app/evolucao`
2. No card verde "Google Planilhas — Sincronizar com 1 clique", clique **"Exportar minha planilha"**
3. Popup do Google aparece → escolha sua conta → **Permitir**
4. App cria a planilha automaticamente no seu Drive com:
   - 9 abas premium (Dashboard, Lançamentos, Receitas, Despesas, Dívidas, Metas, Fluxo, Resumo Mensal, Como usar)
   - Banner navy + 4 KPI cards + 4 gráficos (pie/column/line/bar)
   - Formatação BRL, condicionais, gradientes, áreas read-only
5. Aparecem os botões **"Atualizar minha planilha"**, **"Recriar planilha (visual perfeito)"** e **"Abrir no Google Planilhas"**

---

## Token + cache (como funciona)

- Token de acesso é salvo em `localStorage` (`virada_google_token`) por **55 minutos**
- Meta da planilha (id + url + lastSync) salva em `localStorage` (`virada_sheet_meta`)
- Se a planilha for **apagada manualmente do Drive**, o próximo sync detecta o 404 e **cria uma nova automaticamente**
- Botão **"Recriar planilha (visual perfeito)"** apaga a antiga + cria nova — use sempre que o layout estiver desalinhado

---

## Escopos solicitados

```javascript
scopes: [
  'https://www.googleapis.com/auth/spreadsheets',  // criar/editar planilhas
  'https://www.googleapis.com/auth/drive.file',    // ver/apagar só arquivos criados pelo app
]
```

`drive.file` é o escopo mais restrito da Drive API: o app só acessa arquivos que ele mesmo criou. O usuário vê isso no popup e não fica assustado.

---

## Service Account (fallback opcional — apenas para admin/jobs server-side)

O wrapper em `lib/sheets/google-sheets.ts` permite uso server-side via service account. **Não é usado pelo fluxo padrão do cliente**, mas se quiser ativá-lo para scripts admin:

1. Em **APIs e serviços** → **Credenciais** → **Criar credenciais** → **Conta de serviço**
2. Nome: `virada-sync` → **Criar e continuar** → **Concluir**
3. Clique na conta → aba **Chaves** → **Adicionar chave** → **Criar nova chave** → **JSON**
4. Arquivo `.json` é baixado — copie todo o conteúdo
5. No `.env.local`:

```bash
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"virada-sync@...iam.gserviceaccount.com",...}
```

> ⚠️ **NUNCA** commitar essa variável. Ela é segredo full-access.

---

## O que cada aba da planilha contém

| Aba | Conteúdo |
|---|---|
| **Dashboard** | Banner navy + 4 KPIs (Entradas/Saídas/Saldo/Lançamentos) + tabela top categorias + tabela mensal + 4 gráficos |
| **Lançamentos** | Timeline geral: Data / Tipo / Descrição / Categoria / Valor / Pagamento / Natureza / Escopo / Origem |
| **Receitas** | Só entradas (Data / Descrição / Categoria / Valor / Escopo / Origem) |
| **Despesas** | Só saídas (Data / Descrição / Categoria / Valor / Pagamento / Natureza / Escopo) |
| **Dívidas** | Nome / Vencimento / Prioridade / Status / Parcela / Total / Em aberto — com cores condicionais por status |
| **Metas** | Meta / Tipo / Alvo / Atual / Faltando / Progresso — com gradient red→gold→green |
| **Fluxo de Caixa** | Data / Entradas / Saídas / Resultado do dia / Saldo acumulado |
| **Resumo Mensal** | Mês / Entradas / Saídas / Resultado / Saldo acumulado / Economia / Lançamentos |
| **Como usar** | 5 passos numerados explicando o uso da planilha |

---

## Troubleshooting

### "Não conectado" amarelo na tela
→ Faltou `NEXT_PUBLIC_GOOGLE_CLIENT_ID` no `.env.local`. Adicione e reinicie o servidor.

### Popup OAuth não abre
→ Bloqueador de popups do navegador. Libere para o domínio do app. Após 12s sem callback, o botão volta ao estado normal e mostra a mensagem.

### Visual da planilha está zoado (KPIs sem cor, banner errado)
→ Acontece em planilhas criadas antes do fix de layout 2026-05-22. Solução: clique em **"Recriar planilha (visual perfeito)"** — apaga a antiga e cria uma nova com a paleta correta.

### Planilha foi apagada manualmente do Drive
→ Próximo clique em **"Atualizar minha planilha"** detecta o 404 e cria uma nova automaticamente.

### Token expirou
→ Próximo clique abre o popup OAuth de novo. Token expira após 55min de inatividade.

---

## Custo

- Google Cloud: **gratuito** (Sheets API: 500 req/100s na cota free — usa ~10-20 por sync)
- Por usuário: ~10-20 requests para criar + ~5 para atualizar
- Conclusão: **zero custo** para qualquer volume razoável

---

## Arquivos envolvidos

- `lib/sheets/builder.ts` — construtor isomórfico (902 linhas, gera requests JSON)
- `lib/sheets/styles.ts` — paleta + STYLE + helpers (repeatCell, mergeCells, protect, banding, condFormat)
- `lib/sheets/google-sheets.ts` — wrapper server-side (service account, fallback)
- `components/GoogleSyncButton.tsx` — UI cliente (OAuth GIS + fetch direto na REST API)
- `app/app/evolucao/page.tsx` — tela onde o botão de sync vive
- `app/app/planilha-demo/page.tsx` — preview do que vai pra planilha (sem sync)
- `scripts/test-sheets-build.ts` — 69 asserts de teste estrutural offline

Para a estratégia completa (por que OAuth e não service account, etc.), ver `docs/estrategia-google-sync.md`.
