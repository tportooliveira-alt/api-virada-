# Status Completo do Projeto — 01/05/2026

## ✅ O QUE FOI FEITO (tudo pronto e no GitHub)

### App PWA
- App Next.js 14 completo rodando em http://localhost:3000
- Login Google único (1 clique, sem senha, sem código manual)
- Botão dev `⚙ Entrar como Dev` aparece só em localhost para testes
- Dados salvos no celular via IndexedDB (offline-first)
- Páginas: início, lançamentos, gastos, entradas, dívidas, metas, missões, aprender, evolução, planilha-demo, renda extra, instalar
- Botão de Estorno em gastos e entradas (cria lançamento oposto)
- PWA instalável no celular (manifest + ícones)

### Acesso automático (sem código manual)
- Login Google validado no servidor (`/api/access/check`)
- Lista de compradores em SQLite (`data/access.db`)
- Offline-first: se já está ativo no IndexedDB, libera sem internet
- Anti-fraude: `google_sub` imutável salvo junto
- 3 telas de erro: não membro, sem internet, precisa conectar uma vez

### Webhooks de 6 plataformas
- Endpoint único `/api/webhooks/[platform]`
- Adapters: Hotmart, Eduzz, Kiwify, Monetizze, Cakto, Perfectpay
- Reconhece PT e EN: "PURCHASE_APPROVED", "PAID", "Compra Finalizada", etc.
- Token por plataforma (env `HOTMART_TOKEN`, `EDUZZ_TOKEN`, etc.)
- Tabela `webhook_log` com auditoria de cada chamada
- Upsert com normalização de email (lowercase, sem duplicata)

### Planilha profissional
- Exporta direto pra conta Google do cliente (OAuth dele, sem service account)
- Banner navy/dourado igual ao app
- 4 KPI cards (Entradas, Saídas, Saldo, Lançamentos)
- 4 gráficos: pizza (categorias), colunas (mês a mês), linha (saldo acumulado), barra (dívidas)
- 9 abas: Dashboard, Lançamentos, Receitas, Despesas, Dívidas, Metas, Fluxo de Caixa, Resumo Mensal, Como usar
- Formato BRL, datas dd/mm/yyyy, percentuais, banding, freeze, auto-filter
- Formatação condicional: verde/vermelho/dourado por status
- Tudo travado read-only (cliente só visualiza)
- Prévia visual em `http://localhost:3000/planilha-preview.html`

### Testes automatizados (166 asserts, 0 falhas)
- `scripts/test-sheets-build.ts` — 69 asserts da planilha
- `scripts/test-deletions.ts` — 71 asserts de exclusão
- `scripts/test-estorno.ts` — 35 asserts de estorno e precisão BRL
- Rodar: `npx tsx scripts/test-sheets-build.ts && npx tsx scripts/test-deletions.ts && npx tsx scripts/test-estorno.ts`

### Documentação (pasta 00-LEIA-AQUI)
- `01-VISAO-GERAL.md` — o que é o produto e o stack
- `02-O-QUE-JA-FUNCIONA.md` — lista completa do que está implementado
- `03-O-QUE-FALTA-PRA-VENDER.md` — checklist de lançamento
- `04-MAPA-DE-ARQUIVOS.md` — onde encontrar cada coisa no código
- `05-COMO-RODAR-LOCAL.md` — setup e comandos
- `06-FLUXO-CLIENTE.md` — diagrama completo do fluxo de compra ao app
- `07-HISTORICO-DE-MUDANCAS.md` — o que mudou nessa sessão
- `08-ROTEIRO-LANCAMENTO-HOTMART.md` — 8 passos pra lançar e vender
- `09-ESTRATEGIA-MARKETING.md` — posicionamento, fases, anúncios, precificação
- `10-STATUS-ATUAL-01-05-2026.md` — este arquivo

### Google OAuth configurado
- Projeto criado: `virada-app` (ID: 259559316924)
- Client ID gerado: `259559316924-dm5v0rbo7ik45sotla9hh4rsk2cilfmj.apps.googleusercontent.com`
- Configurado no `.env.local` (não vai pro Git — fica só no servidor)
- Origem autorizada: `http://localhost:3000`

---

## ⏳ O QUE FALTA FAZER (em ordem de prioridade)

### 🔴 URGENTE — sem isso o app não funciona pra ninguém

1. **Adicionar e-mail de testador no Google Cloud**
   - Acesse: https://console.cloud.google.com/apis/credentials/consent?project=virada-app
   - Seção "Usuários de teste" → Adicionar usuários → `tportooliveira@gmail.com`
   - Salvar
   - Sem isso dá erro 403 "access_denied" ao tentar logar

2. **Contratar hospedagem (VPS)**
   - App usa SQLite em arquivo — precisa de servidor com disco persistente
   - Não funciona em Vercel/Netlify (serverless)
   - Opção mais barata: Hostinger KVM 2 (~R$ 25/mês)
   - Ver passo a passo em `08-ROTEIRO-LANCAMENTO-HOTMART.md`

3. **Adicionar domínio ao Google OAuth**
   - Depois de contratar a hospedagem e apontar o domínio
   - Voltar em: Google Cloud → APIs e serviços → Credenciais → editar o cliente OAuth
   - Adicionar nas origens: `https://SEU-DOMINIO.com`

### 🟡 IMPORTANTE — sem isso a automação de vendas não funciona

4. **Cadastrar webhook na Hotmart**
   - URL: `https://SEU-DOMINIO.com/api/webhooks/hotmart?token=virada2026`
   - Eventos: PURCHASE_APPROVED, PURCHASE_CANCELED, PURCHASE_REFUNDED, PURCHASE_CHARGEBACK
   - Ver detalhes em `08-ROTEIRO-LANCAMENTO-HOTMART.md`

5. **Criar produto na Hotmart**
   - Tipo: produto digital
   - Entrega: URL externa do app
   - Garantia: 7 dias (obrigatório)
   - Preço sugerido no lançamento: R$ 37-47

6. **Ativar APIs do Google (Sheets + Drive)**
   - Google Cloud → APIs e serviços → Library
   - Ativar: Google Sheets API
   - Ativar: Google Drive API
   - Sem isso o botão "Exportar planilha" dá erro

### 🟢 DESEJÁVEL — melhora a experiência mas não bloqueia

7. **Página de vendas**
   - Pode usar Hotmart Pages (mais rápido) ou Framer
   - Ver estrutura sugerida em `09-ESTRATEGIA-MARKETING.md`

8. **Página `/admin/membros`**
   - Ver lista de compradores no banco
   - Adicionar/cancelar manualmente quando necessário
   - Ainda não foi implementado

9. **Vídeo demonstração do app**
   - 30-60 segundos gravando a tela do celular usando o app
   - Essencial para converter na página de vendas

10. **Política de privacidade e termos de uso**
    - Obrigatório nas plataformas de venda
    - Pode gerar em: https://www.privacypolicygenerator.info

11. **Email de boas-vindas automático**
    - Após compra, cliente recebe email com link do app
    - Configurar via Hotmart (aba "Entrega do produto")

12. **Atualizar Next.js 14 → 15**
    - `npm audit` aponta vulnerabilidades no Next 14
    - Fazer em janela separada, testar tudo antes de ir pra produção

---

## 📋 CHECKLIST RÁPIDO ANTES DE LANÇAR

- [ ] Adicionar tportooliveira@gmail.com como testador no Google Cloud
- [ ] Contratar VPS e hospedar o app
- [ ] Apontar domínio para o servidor
- [ ] Adicionar domínio no Google OAuth
- [ ] Ativar Google Sheets API e Google Drive API
- [ ] Criar produto na Hotmart
- [ ] Cadastrar webhook na Hotmart
- [ ] Fazer 1 compra teste e confirmar que acesso é liberado automaticamente
- [ ] Testar "Exportar planilha" e abrir no Google Planilhas
- [ ] Criar página de vendas
- [ ] Gravar vídeo do app

---

## 🔗 Links importantes

| O quê | Link |
|---|---|
| Repositório Git | https://github.com/tportooliveira-alt/api-virada- |
| App local | http://localhost:3000 |
| Prévia da planilha | http://localhost:3000/planilha-preview.html |
| Google Cloud (OAuth) | https://console.cloud.google.com/apis/credentials?project=virada-app |
| Adicionar testadores | https://console.cloud.google.com/apis/credentials/consent?project=virada-app |
