# Gestão Financeira e Planilhas

## Decisão

O app deve ser simples no celular e completo na base de dados.

O frontend mostra:

- caixa do mês
- entradas
- gastos
- resultado
- últimos lançamentos
- lançamento rápido

A planilha por trás guarda a gestão completa.

## Abas Essenciais

- Usuários
- Lançamentos
- Vendas
- Compras e custos
- Fluxo de caixa
- Resumo mensal
- Categorias
- Contas a pagar
- Contas a receber
- Metas
- Dívidas
- Log de sincronização

## Regra de Produto

O usuário não deve precisar abrir planilha para usar o app no dia a dia.

A planilha serve para:

- análise completa
- conferência
- exportação
- sincronização com Google Planilhas
- uso em Excel

## Google Planilhas

Será a sincronização principal porque funciona melhor no celular e permite acesso por link.

Regras técnicas:

- credencial só no servidor
- frontend nunca recebe segredo
- app escreve primeiro na base local
- sincronização envia dados para as abas correspondentes

## Excel

Excel entra como exportação por CSV.

O usuário pode baixar qualquer aba em `/api/sheets/export?sheet=NOME_DA_ABA.csv`.

## WhatsApp

WhatsApp fica como entrada futura.

Modelo previsto:

- usuário manda mensagem
- servidor interpreta
- grava lançamento
- planilha sincroniza depois

Exemplos:

- `Vendi 250 no Pix`
- `Comprei 80 de mercadoria`
- `Paguei 120 de fornecedor`
- `Recebi 500 de cliente`
