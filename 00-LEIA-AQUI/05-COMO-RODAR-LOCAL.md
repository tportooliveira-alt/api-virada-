# Como rodar localmente

## Primeira vez

```bash
cd "C:\Users\Thiago Porto\vendas e book\codigo-da-virada"
npm install
```

## Criar `.env.local`

Crie o arquivo `.env.local` na raiz do projeto:

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=cole_aqui_o_client_id_do_google
HOTMART_TOKEN=qualquercoisaaleatoria
EDUZZ_TOKEN=qualquercoisaaleatoria
KIWIFY_TOKEN=qualquercoisaaleatoria
MONETIZZE_TOKEN=qualquercoisaaleatoria
CAKTO_TOKEN=qualquercoisaaleatoria
PERFECTPAY_TOKEN=qualquercoisaaleatoria
```

> Para teste local sem token, deixe as envs vazias — o webhook fica aberto.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento em http://localhost:3000 |
| `npm run build` | Build de produção (gera `.next/`) |
| `npm run start` | Roda o build de produção |
| `npm run lint` | Lint (Next + ESLint) |
| `npm run typecheck` | Checagem de tipos TypeScript |
| `npx tsx scripts/test-sheets-build.ts` | Suite de teste da planilha (69 asserts) |
| `npx tsx scripts/test-webhooks.ts` | Suite de teste dos webhooks (25 asserts) |

## Testar webhook manualmente

```bash
curl -X POST http://localhost:3000/api/webhooks/hotmart \
  -H "Content-Type: application/json" \
  -d '{
    "event": "PURCHASE_APPROVED",
    "data": {
      "buyer": { "email": "teste@gmail.com", "name": "Cliente Teste" },
      "product": { "name": "Código da Virada" },
      "purchase": { "transaction": "TEST-001" }
    }
  }'
```

Resposta esperada:

```json
{
  "ok": true,
  "event": "approved",
  "member": {
    "email": "teste@gmail.com",
    "platform": "hotmart",
    "status": "ativo",
    ...
  }
}
```

## Inspecionar o banco SQLite

Use o **DB Browser for SQLite** (gratuito) ou o CLI:

```bash
sqlite3 data/access.db
> SELECT * FROM members;
> SELECT * FROM webhook_log ORDER BY received_at DESC LIMIT 20;
> .quit
```

## Resetar o banco

```bash
rm data/access.db data/access.db-wal data/access.db-shm
```

Vai ser recriado vazio na próxima requisição.
