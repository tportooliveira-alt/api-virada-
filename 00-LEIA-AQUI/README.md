# 00-LEIA-AQUI — Documentação do projeto

Pasta com o roteiro completo do projeto **Código da Virada**.

## Por onde começar

| Arquivo | Quando ler |
|---|---|
| [01-VISAO-GERAL.md](./01-VISAO-GERAL.md) | Para entender o que é o produto e o stack |
| [02-O-QUE-JA-FUNCIONA.md](./02-O-QUE-JA-FUNCIONA.md) | Lista do que está implementado |
| [03-O-QUE-FALTA-PRA-VENDER.md](./03-O-QUE-FALTA-PRA-VENDER.md) | Checklist do que falta antes do lançamento |
| [04-MAPA-DE-ARQUIVOS.md](./04-MAPA-DE-ARQUIVOS.md) | Onde encontrar cada coisa no código |
| [05-COMO-RODAR-LOCAL.md](./05-COMO-RODAR-LOCAL.md) | Setup local + testes + comandos |
| [06-FLUXO-CLIENTE.md](./06-FLUXO-CLIENTE.md) | Diagrama do fluxo da compra ao app |
| [07-HISTORICO-DE-MUDANCAS.md](./07-HISTORICO-DE-MUDANCAS.md) | O que mudou nesta sessão |

## Comandos rápidos

```bash
npm run dev                                  # rodar local
npm run build                                # build de produção
npm run typecheck                            # checagem de tipos
npm run lint                                 # lint
npx tsx scripts/test-sheets-build.ts         # 69 asserts da planilha
npx tsx scripts/test-webhooks.ts             # 25 asserts dos webhooks
```

## Status atual

- ✅ Login Google único, sem senha
- ✅ Webhooks de **6 plataformas** (Hotmart, Eduzz, Kiwify, Monetizze, Cakto, Perfectpay)
- ✅ SQLite local para lista de compradores
- ✅ Planilha profissional com gráficos exportada para conta Google do cliente
- ✅ App PWA funciona offline
- ⏳ Falta: configurar `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, hospedar, configurar webhooks no painel das plataformas, página de vendas, admin de membros

> Veja [03-O-QUE-FALTA-PRA-VENDER.md](./03-O-QUE-FALTA-PRA-VENDER.md) para o checklist completo.
