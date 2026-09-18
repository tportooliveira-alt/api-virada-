# Checklist Mensal Interativo

Página web do **Bônus 4 do Kit Duplo** — versão interativa do Checklist Mensal.

## O que faz

- Pessoa abre no celular ou computador
- Preenche valores (renda, gastos, dívidas, reserva)
- **Calcula totais automaticamente**
- Mostra **score de saúde financeira (0 a 25)** com diagnóstico
- **Salva tudo no aparelho dela** (localStorage) — funciona offline depois da 1ª abertura
- Permite navegar entre meses (histórico completo)
- Imprime ou exporta como PDF
- Backup em JSON pra ela guardar
- Pode instalar como app no celular (PWA)

## Como testar

Clica duas vezes no arquivo `index.html` que ele abre no navegador. Funciona local, sem servidor.

## Como hospedar pra cliente usar

3 opções, da mais fácil pra mais profissional:

### Opção 1 — Netlify Drop (~2 min, grátis)
1. Vai em https://app.netlify.com/drop
2. Arrasta a pasta `07-Checklist-Interativo` inteira
3. Pronto — Netlify dá uma URL pública. Você pode adicionar domínio próprio depois.

### Opção 2 — Subdomínio no Hostinger (a mesma VPS da landing)
- Sobe a pasta em `checklist.codigodavirada.net.br` ou `codigodavirada.net.br/checklist`
- Mesmas instruções do README-DEPLOY.md da landing

### Opção 3 — Dentro do app Virada (futuro)
- Quando o app estiver no ar, integrar como rota `/app/checklist`

## Como entregar pro cliente

Depois que estiver hospedado:
1. Coloca o link no email automático da Cakto após a compra
2. Coloca o link dentro do PDF do Bônus 4 ("Use a versão interativa: [link]")
3. Coloca na landing como prova de "diferencial"

## Diferencial competitivo

99% dos ebooks na Cakto entregam só PDF. Esse checklist interativo:
- **Faz a pessoa lembrar de você todo mês** (uso recorrente)
- **Vira motivo de print no Instagram** (gente postando seus scores)
- **Justifica preço maior** (não é "só um PDF")
- **Funciona offline** (instala como app no celular)

## Arquivos da pasta

- `index.html` — a página inteira (auto-suficiente, ~28 KB)
- `manifest.webmanifest` — config pra instalar como app no celular
- `LEIA-AQUI.md` — este arquivo
