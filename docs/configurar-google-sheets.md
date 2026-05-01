# Como Configurar o Google Planilhas (5 minutos)

Isso deixa o botão "Sincronizar" funcionar de verdade.
Quando apertar, o app joga TODOS os dados em uma planilha Google automaticamente.

---

## PASSO 1 — Criar o projeto no Google Cloud

1. Acesse: https://console.cloud.google.com/
2. Clique em **"Selecionar projeto"** → **"Novo projeto"**
3. Nome: `virada-app` → **Criar**
4. Com o projeto selecionado, vá em **"APIs e serviços"** → **"Biblioteca"**
5. Pesquise **"Google Sheets API"** → Clique → **"Ativar"**
6. Pesquise **"Google Drive API"** → Clique → **"Ativar"**

---

## PASSO 2 — Criar a conta de serviço

1. Vá em **"APIs e serviços"** → **"Credenciais"**
2. Clique em **"Criar credenciais"** → **"Conta de serviço"**
3. Nome: `virada-sync` → **Criar e continuar** → **Concluir**
4. Clique na conta criada → aba **"Chaves"**
5. **"Adicionar chave"** → **"Criar nova chave"** → **JSON** → **Criar**
6. Um arquivo `.json` será baixado — guarde-o com segurança

---

## PASSO 3 — Colocar a chave no app

Abra o arquivo `.env.local` em:
```
C:\Users\Thiago Porto\vendas e book\codigo-da-virada\.env.local
```

Adicione:
```
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"virada-app","private_key_id":"...","private_key":"-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n","client_email":"virada-sync@virada-app.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

**IMPORTANTE:** copie o JSON inteiro do arquivo baixado e cole na mesma linha (sem quebras de linha).

---

## PASSO 4 — Pronto!

Reinicie o servidor:
```bash
cd "C:\Users\Thiago Porto\vendas e book\codigo-da-virada"
npm run dev
```

Acesse o app → aba **Planilha** → botão **"Sincronizar"**

O app vai:
1. Criar automaticamente uma planilha Google com 15 abas estruturadas
2. Jogar TODOS os dados: lançamentos, receitas, despesas, dívidas, metas, resumo mensal, fluxo de caixa
3. Salvar o link da planilha para você abrir a qualquer momento
4. A cada vez que apertar "Sincronizar", atualiza tudo

---

## O que aparece na planilha

| Aba | Conteúdo |
|---|---|
| Dashboard | Resumo com fórmulas automáticas (entradas, saídas, saldo) |
| Lançamentos | Todos os gastos e receitas com data, categoria, pagamento |
| Receitas | Filtrado: só entradas |
| Despesas | Filtrado: só saídas |
| Dívidas | Status de cada dívida |
| Metas | Progresso das metas financeiras |
| Fluxo de Caixa | Saldo por dia |
| Resumo Mensal | Balanço por mês (total entradas, saídas, % de economia) |
| + 7 abas mais | Vendas, Compras, Contas a Pagar/Receber, Missões, Pontos, Log |

---

## Compartilhar a planilha

Depois de sincronizar, a planilha fica no Google Drive da conta de serviço.
Para ver no seu Google Drive pessoal:

1. Abra o link que aparece no app após sincronizar
2. Clique em **"Compartilhar"** → adicione seu e-mail pessoal com acesso de editor
3. Agora a planilha aparece no seu Google Drive normalmente

---

## Sem conta Google Cloud?

Alternativa mais simples: o app já exporta CSV de cada aba.
Vá em **Planilha** → qualquer aba → ícone de download → abre no Excel/Sheets manualmente.
