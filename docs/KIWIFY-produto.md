# Kiwify — cadastro do produto

Tudo que vai ser colado no painel, já escrito. O que depende de você está
separado no topo justamente para não travar o resto.

## 1. O que só você pode fazer

Criar a conta e fazer login: exige **definir senha** e informar **CPF**. Senha e
documento são seus — eu não digito isso em formulário nenhum. Faça o cadastro,
deixe o painel aberto e logado, e libere o acesso da extensão do Claude no site
(ícone da extensão na barra do Chrome, com a aba da Kiwify aberta).

Do login em diante eu monto o produto inteiro com o conteúdo abaixo.

Dados do cadastro: Thiago Porto Oliveira · Vitória da Conquista — Bahia ·
tportooliveira@gmail.com. Conta CPF agora; a Kiwify permite trocar para CNPJ
depois, sem refazer o produto.

## 2. Produto

| Campo | Valor |
|---|---|
| Nome | **Código da Virada — App + E-book** |
| Tipo | Produto digital / Arquivos e conteúdo online |
| Preço | **R$ 47,00** (pagamento único) |
| Parcelamento | Deixar o padrão do cartão |
| Garantia | **7 dias** |
| Suporte | tportooliveira@gmail.com · WhatsApp 77 99987-2390 |

### Descrição (checkout)

> Você sabe quanto ganha. O que você não sabe é pra onde foi.
>
> O Código da Virada é um app onde lançar um gasto é tão rápido quanto mandar
> um zap — por voz ou por texto. Ele monta sozinho, no seu Google Drive, a
> planilha que você nunca conseguiu manter: gastos, entradas, dívidas e metas,
> atualizada a cada lançamento.
>
> Em uma semana você sabe pra onde foi seu dinheiro.
>
> **Você recebe:**
> - O app Código da Virada (funciona no celular, instala na tela inicial)
> - A planilha automática no seu Google Planilhas
> - E-book Código da Virada — o método em 5 capítulos
> - Bônus: Negociar dívida (calcula o desconto justo e escreve a carta pro banco)
> - Bônus: Plano de 7 dias
> - Bônus: Checklist mensal
> - Bônus: 50 ideias de renda extra
>
> Pagamento único. Sem mensalidade. 7 dias de garantia — não gostou, devolvemos.

## 3. URLs para configurar

| Onde | URL |
|---|---|
| Página de vendas | `https://codigodavirada.net.br` |
| **Página de obrigado** | `https://codigodavirada.net.br/obrigado` |
| Webhook (compra aprovada + reembolso + chargeback) | `https://codigodavirada.net.br/api/webhooks/kiwify?token=<KIWIFY_TOKEN>` |

`<KIWIFY_TOKEN>` é o valor que já está no `.env.local` (local e VPS). Não
colocar o valor neste arquivo — ele vai pro GitHub.

**Por que a página de obrigado importa:** o acesso é liberado pelo **e-mail da
compra**, e o app entra com Google. Quem compra com um e-mail e tenta entrar com
outro leva "conta não encontrada", acha que foi golpe e pede reembolso. A
`/obrigado` avisa isso antes de acontecer.

## 4. Entrega

Não subir arquivo na Kiwify. A entrega é o **acesso ao app** — o webhook avisa a
compra, o app grava o e-mail na lista de compradores e libera o login. Os PDFs
ficam dentro do app e também na página de obrigado.

No e-mail automático da Kiwify, o essencial é uma frase:

> Seu acesso está liberado em https://codigodavirada.net.br/app — entre com o
> **mesmo e-mail que você usou nesta compra**.

## 5. Depois que o produto existir (eu faço)

1. Colar o link do checkout em `PROPS.checkoutUrl` e `CHECKOUT_URL`
   (`scripts/build-vendas.mjs`), rodar `node scripts/build-vendas.mjs`
2. `CHECKOUT_URL` no `.env.local` da VPS — sem isso o agente do WhatsApp diz que
   você vai mandar o link depois, que é onde se perde quem já decidiu comprar
3. Deploy e teste de compra de ponta a ponta

## 6. Order bump — só depois

O roteiro de negociação **já vai incluso** no pacote. Vender de novo como bump
gera reembolso e reclamação. Se for ter bump, tem que ser item que não está no
pacote.
