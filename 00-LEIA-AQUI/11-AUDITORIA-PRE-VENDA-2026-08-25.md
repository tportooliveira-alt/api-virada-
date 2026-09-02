# Auditoria pré-venda — Código da Virada (25/08/2026)

Auditoria crítica pedida pelo Thiago antes de colocar à venda. Feita por verificação real
(typecheck/lint/build/testes rodados) + 3 revisores (segurança, qualidade, prontidão).

## Verificações que EU rodei (prova, não documentação)
| Check | Resultado |
|---|---|
| typecheck (`tsc --noEmit`, strict) | ✅ 0 erros |
| lint (`next lint`) | ✅ 1 warning (dep de useEffect) |
| teste planilha (`test-sheets-build`) | ✅ 69/69 |
| teste webhooks (`test-webhooks`) | ✅ 25/25 (após `npm rebuild better-sqlite3`) |
| build produção (`next build`) | ✅ 25 rotas |
| **Deploy blocker** | `better-sqlite3` compilado p/ Node 20, VPS tem Node 24 → SQLite quebra no runtime até `npm rebuild` |

> Doc diz "166 asserts"; scripts reais somam **94** (69+25). Inflação na doc.

## Nota final: **BB / não apto a vender ainda**
- Segurança: **2,5/10**
- Prontidão-pra-vender: **4/10**
- Qualidade de código: **6,5/10**

O código é bom; a **segurança e a conformidade** derrubam a nota de venda. NÃO é AAA hoje.
Corrigindo os 2 críticos + legal, vai pra ~A- / apto.

## 🔴 CRÍTICO (bloqueia venda)
1. **Admin API sem auth real** — `/api/admin/members*` confia no header `x-admin-email`
   (spoofável) e o email admin (`tportooliveira@gmail.com`) está exposto em `/seed-test`.
   Qualquer um baixa a base de compradores (LGPD), se cadastra grátis, ou revoga clientes.
   Fix: validar ID token Google no servidor (reusar lógica de `access/check`).
2. **Paywall só client-side** — `AuthGate` libera por `localStorage`. Forjar 1 linha no
   console dá acesso total sem comprar. (Para infoproduto barato pode ser tradeoff aceito,
   mas tem que ser decisão consciente.)

## 🟠 ALTO
3. Token de webhook fraco (`HOTMART_TOKEN=He233024`), sem HMAC, sem rate limit.
4. Validação Google `aud`/`iss` fail-open (recusar se client_id ausente).
5. Política de privacidade / Termos com placeholders `[SEU NOME/CNPJ]` → LGPD/Hotmart.
6. Checkout não conectado (`vendas.html` → `SEU_CHECKOUT_AQUI`); 2 landings conflitantes.

## 🟡 MÉDIO
7. IndexedDB robusto (`lib/db/indexeddb.ts`, 253 linhas) é **órfão/morto**; dado real vive
   em `localStorage` chave única com perda silenciosa no quota (`catch {}` vazio).
8. Sem service worker → "offline-first" exagerado (app não abre offline a frio).
9. Bug parser BR: `parse-financial-input.ts` "1.500" vira 1,5 / "1.200,00" vira 1,20. Sem teste.
10. Refund grava status mas AuthGate nunca re-checa → reembolsado mantém acesso.
11. Artefatos de dev no bundle: `/seed-test` (semeia/apaga dados), `lib/ai/advisor.ts` stub.
12. `netlify.toml` contradiz SQLite em disco; deploy limpo pode 404-ar tudo.

## Pontos fortes (reais)
- `lib/sheets/builder.ts` isomórfico, elegante e testado.
- TS strict, **zero `any`/@ts-ignore** no fonte.
- Camada de webhooks/acesso nível produção; **sem SQL injection** (prepared statements).
- `.env.local` e `access.db` fora do git (ok).

## Mínimo pra 1ª venda segura
1. Fechar admin API (token Google server-side) + remover/gatar `/seed-test`.
2. Preencher política+termos (nome/CNPJ/contato) e linkar na landing e no app.
3. Ligar checkout numa landing só; testar 1 compra real de R$1–5 ponta a ponta.
4. Trocar `HOTMART_TOKEN` por segredo forte; setar `HOTMART_ALLOWED_PRODUCTS`.
5. Backup do `access.db` (cron) — é a única lista de compradores.
6. `npm rebuild better-sqlite3` no deploy (Node 24).

## Housekeeping
- Pasta canônica = `/var/www/codigo-da-virada` (alvo do pm2). `codigo-virada` e
  `codigodavirada-net-br` são cópias/variações — decidir qual manter e apagar o resto.
