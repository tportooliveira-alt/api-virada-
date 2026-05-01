# Virada App

App mobile-first de gestão financeira simples, com tela enxuta no celular e planilhas estruturadas como base completa por trás.

## Direção Atual

O app não é mais focado só em gastos. Ele registra o fluxo financeiro completo:

- vendas
- recebimentos
- entradas de dinheiro
- compras
- custos
- gastos de casa
- gastos da empresa
- dívidas
- metas
- fluxo de caixa
- resumo mensal

No frontend aparecem só os dados principais: caixa, entradas, gastos, resultado e últimos lançamentos.

## Base de Dados

A base operacional fica em planilhas CSV locais dentro de:

```bash
data/planilhas
```

As abas são:

- `usuarios.csv`
- `lancamentos.csv`
- `vendas.csv`
- `compras_custos.csv`
- `fluxo_caixa.csv`
- `resumo_mensal.csv`
- `categorias.csv`
- `contas_a_pagar.csv`
- `contas_a_receber.csv`
- `metas.csv`
- `dividas.csv`
- `missoes_concluidas.csv`
- `pontos.csv`
- `medalhas.csv`
- `sync_log.csv`

Esses arquivos ficam fora do Git por segurança.

## Sincronização

Arquitetura preparada para:

- Google Planilhas como sincronização principal
- Excel/CSV como exportação simples
- WhatsApp como entrada futura de lançamentos

Credenciais do Google devem ficar somente no servidor. Nada sensível deve ir para o frontend.

## Rotas Principais

- `/login`
- `/cadastro`
- `/app/inicio`
- `/app/lancar`
- `/app/evolucao` como Planilha
- `/app/aprender` como Conta

## Como Rodar

```bash
npm install
npm run dev
```

Abra:

```bash
http://localhost:3000/app/inicio
```

## Validação

```bash
npm run typecheck
npm run lint
npm run build
npm test
```

## Próximos Passos Técnicos

1. Conectar Google Sheets API no servidor.
2. Criar credenciais seguras para sincronização.
3. Adicionar importação de uma planilha existente.
4. Adicionar entrada via WhatsApp API.
5. Criar relatórios por período, casa e empresa.
