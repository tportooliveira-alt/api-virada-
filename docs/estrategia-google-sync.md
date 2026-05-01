# Estratégia Google Planilhas — Fácil para o Usuário Final

## O problema a resolver

O app é vendido para pessoas com dificuldades financeiras.
Essas pessoas NÃO sabem configurar Service Account no Google Cloud.
Precisam de algo tão simples quanto "Entrar com Google" — que todo mundo já conhece.

---

## Fluxo ideal (3 toques, zero conhecimento técnico)

```
Toque 1: Abre o app → vai em "Planilha"
Toque 2: Clica em "Conectar com Google"
Toque 3: No popup do Google, clica em "Permitir"

RESULTADO: Planilha criada automaticamente no Google Drive do usuário
           com todos os dados sincronizados e equilibrados.
```

---

## Arquitetura técnica — Google Identity Services (GIS)

### Por que GIS e não service account

| Critério             | Service Account | Google OAuth (GIS) |
|----------------------|----------------|--------------------|
| Precisa Google Cloud Console | Sim (complexo) | Sim (1x, feito por nós) |
| Usuário precisa configurar | SIM ❌ | NÃO ✅ |
| Onde fica a planilha | Drive do service account | Drive do próprio usuário ✅ |
| Usuário vê a planilha | Não, precisa compartilhar | Sim, aparece automaticamente ✅ |
| Custo | Gratuito | Gratuito |
| Segurança | App tem acesso total | App acessa só o que criou ✅ |

### Como funciona o OAuth com GIS

1. **Nós** (donos do app) configuramos 1x no Google Cloud:
   - Criamos um Client ID OAuth
   - Adicionamos os domínios autorizados
   - Ativamos Sheets API e Drive API
   
2. **O usuário** não faz nada além de clicar "Permitir"

3. **O app** recebe um token de acesso que expira em 1h
   - Token é salvo no localStorage
   - Quando expira, pede novo com 1 clique

### Escopos solicitados (mínimos, não assustam o usuário)

```javascript
scopes: [
  'https://www.googleapis.com/auth/spreadsheets',     // criar/editar planilhas
  'https://www.googleapis.com/auth/drive.file',        // só arquivos criados pelo app
]
```

**`drive.file`** é o escopo mais restrito: o app só pode ver arquivos que ELE MESMO criou.
O usuário vê isso no popup e não fica assustado.

---

## O que aparece para o usuário

### Antes de conectar
```
┌────────────────────────────────────────────┐
│  📊 Sua planilha no Google                 │
│                                            │
│  Conecte sua conta Google e seus dados     │
│  aparecem automaticamente numa planilha    │
│  organizada no seu Google Drive.           │
│                                            │
│  [G] Conectar com Google                   │
│                                            │
│  🔒 Só acessa a planilha criada pelo app   │
└────────────────────────────────────────────┘
```

### Popup do Google (familiar)
```
"Virada App quer acesso a:"
✓ Ver, editar e criar planilhas Google
✓ Ver e gerenciar arquivos criados por este app

[Cancelar]   [Permitir]
```

### Após conectar
```
✅ Planilha criada no seu Google Drive!
[Abrir no Google Planilhas →]

Última sync: hoje às 14:32
[🔄 Sincronizar agora]
```

---

## Automação extra — botão "Sincronizar automaticamente"

Após configurar, o usuário pode ativar:
- **Sync ao sair da tela**: toda vez que trocar de aba, sincroniza
- **Sync ao lançar**: a cada novo gasto/receita, atualiza a planilha
- **Sync agendado**: a cada hora (se deixar o app aberto)

Isso é feito 100% no frontend via `setInterval` ou `useEffect` — sem servidor.

---

## O "bot" mais simples possível

Não precisa de WhatsApp API (caro/complexo).
A versão simples: **link direto de lançamento**.

```
wa.me/5577999226268?text=Paguei 45 reais de uber
```

O usuário manda mensagem pro WhatsApp do produtor com o gasto.
O produtor (ou atendente) registra no app.
Baixo esforço, zero custo.

Versão futura (quando escalar): integrar com Evolution API (WhatsApp open source)
para processar mensagens automaticamente.

---

## Configuração que NÓS fazemos (1 vez)

### Passo 1 — Google Cloud Console
1. https://console.cloud.google.com
2. Criar projeto "virada-app"
3. Ativar: Google Sheets API + Google Drive API
4. Criar credencial: OAuth 2.0 → Web Application
5. Origens autorizadas:
   - http://localhost:3000
   - https://SEU-DOMINIO.vercel.app
6. Copiar o Client ID

### Passo 2 — .env.local
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
```

### Passo 3 — Publicar
Subir na Vercel com a env var configurada.
Pronto — todos os usuários que comprarem o app podem usar.

---

## Custo

- Google Cloud: GRATUITO (Sheets API tem 500 req/100s no plano gratuito — mais que suficiente)
- Por usuário: ~10-20 requests por sync (uma planilha com 15 abas)
- Limite gratuito: ~500 syncs simultâneas por segundo (jamais você vai atingir)
- Conclusão: ZERO CUSTO para qualquer volume razoável de usuários

---

## Implementação técnica (o que vamos codar)

### Componente `GoogleSyncButton.tsx`
- Carrega o script do Google Identity Services
- Botão "Conectar com Google" com logo do Google
- Ao clicar: abre popup OAuth
- Ao aprovar: chama a função de sync diretamente do frontend
- Salva token + spreadsheet ID no localStorage

### Fluxo do token
```
Token novo → salva no localStorage com timestamp
Ao sincronizar → verifica se token tem < 45min
Se token vencido → pede novo silenciosamente (se já conectou)
Se não conectado → mostra botão "Conectar com Google"
```

### Chamada direta à Sheets API (sem servidor)
```javascript
// Cria planilha
POST https://sheets.googleapis.com/v4/spreadsheets
Authorization: Bearer {access_token}

// Atualiza dados
PUT https://sheets.googleapis.com/v4/spreadsheets/{id}/values/Lançamentos!A2
Authorization: Bearer {access_token}
```

**Não precisa de servidor para isso** — o token do usuário é suficiente.
Isso remove a dependência do `googleapis` npm package (pesado).
O frontend chama a API REST do Google direto com `fetch`.

---

## Resumo executivo

| O que muda | Para o usuário | Para nós |
|---|---|---|
| Login com Google | 1 clique "Permitir" | Configurar Client ID 1x |
| Planilha no Drive dele | Aparece automaticamente | Zero manutenção |
| Sync automático | Transparente | Zero custo |
| Custo Google | R$ 0 | R$ 0 |
