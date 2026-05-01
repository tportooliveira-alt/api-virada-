# Plano de Tráfego Pago — R$ 300 (validação inicial)

Objetivo: validar criativos + colher primeiros 5-10 compradores em 7 dias.

---

## Estrutura da campanha

### Plataforma 1: Meta Ads (Instagram + Facebook) — R$ 200
- **Objetivo:** Conversões (compra Hotmart)
- **Pixel:** Meta Pixel já está em `.env.example` como `NEXT_PUBLIC_META_PIXEL_ID` ✅
- **Evento:** Purchase (disparado pelo webhook da Hotmart)
- **Orçamento diário:** R$ 30 x 7 dias = R$ 210 (margem)
- **Públicos (3 ABOs):**
  1. **Frio interesse** — interesses: "Educação financeira", "Nathalia Arcuri", "Me Poupe", "Primo Rico", "Endividados"
  2. **Lookalike 1%** — base: visitantes do app /app/inicio (precisa pixel ativo 7 dias antes — começar AGORA)
  3. **Retargeting** — quem viu vídeo 50%+ + visitou checkout

### Plataforma 2: TikTok Ads — R$ 100
- **Objetivo:** Tráfego pra checkout Hotmart
- **Orçamento diário:** R$ 14 x 7 dias = R$ 98
- **Pixel:** `NEXT_PUBLIC_TIKTOK_PIXEL_ID` ✅
- **Públicos:**
  1. Interesses: finanças pessoais, dívidas, classe C/D
  2. Lookalike de visitantes (após 1 semana de coleta)

---

## Criativos (3 vídeos × 3 cópias = 9 anúncios)

### Vídeo 1 (gancho de dor) — usa Reel 1
- **Headline:** "Onde seu dinheiro some todo mês"
- **Texto:** "12 vazamentos invisíveis que tiram R$ 800 do seu bolso. App + ebook + planilhas por R$ 47."
- **CTA:** "Saiba mais"

### Vídeo 2 (demonstração) — usa Reel 3
- **Headline:** "Lança um gasto em 5 segundos"
- **Texto:** "App de finanças sem mensalidade. R$ 47 pra sempre."
- **CTA:** "Comprar"

### Vídeo 3 (prova social) — usa Reel 5
- **Headline:** "R$ 1.800 quitados em 21 dias"
- **Texto:** "Mariana saiu do vermelho com o Virada App. Você também pode."
- **CTA:** "Saiba mais"

---

## Métricas-alvo (7 dias)
- **Investido:** R$ 300
- **Receita esperada (mínima):** R$ 235 (5 vendas × R$ 47)
- **Receita esperada (alvo):** R$ 470 (10 vendas)
- **CPA aceitável:** até R$ 47 (ROAS 1x — empate, valida criativo)
- **CPA bom:** R$ 25-30 (ROAS 1.5-2x — escala)

---

## Decisão na sexta (dia 7)
- ROAS > 1.5x → escala dobrando orçamento (manter criativo vencedor)
- ROAS entre 1x e 1.5x → mantém R$ 300/sem, troca 2 criativos
- ROAS < 1x → pausa Meta, tenta TikTok puro mais 7 dias com criativo orgânico-style

---

## Como configurar (passo a passo)

1. **Meta Business Suite:**
   - Criar conta de anúncios (se não tiver)
   - Verificar domínio do app (Settings > Brand Safety)
   - Instalar pixel: já está no app via `<MetaPixel />` (verificar `components/`)
   - Criar conjunto de anúncios "Virada-Lançamento-Frio-1"
   - Subir 3 criativos × 3 cópias

2. **TikTok Ads Manager:**
   - Criar conta
   - Instalar pixel (mesmo `NEXT_PUBLIC_TIKTOK_PIXEL_ID`)
   - Campanha "Virada-TT-Frio"
   - Subir mesmos 3 vídeos (formatos 9:16)

3. **Hotmart:**
   - Pegar link de checkout direto (sem squeeze)
   - Pegar `transaction_id` no parâmetro pra rastrear
   - Configurar postback de Purchase pro pixel Meta
