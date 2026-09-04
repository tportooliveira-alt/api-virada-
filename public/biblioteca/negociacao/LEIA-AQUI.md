# Roteiro de Negociação de Dívidas Interativo

Página web do **Bônus 2 do Kit Duplo** — versão interativa.

## O que faz

### 📝 Aba "Sua dívida"
- Pessoa preenche nome, CPF, credor, tipo de dívida
- **Calculadora de desconto realista** baseada no tipo + tempo de atraso
- Mostra faixa: mínimo / ⭐ sugerido / máximo
- Avisa se o valor disponível dá conta da faixa boa

### ✅ Aba "Preparação"
- Checklist de 8 itens pra fazer ANTES de ligar
- Avisos visuais (regra de ouro: nunca pague no impulso)

### 💬 Aba "Scripts"
- **6 scripts personalizados** com os dados que ela colocou
- Cada um com botão **"Copiar texto"** (clipboard)
- O último tem botão **"Abrir WhatsApp"** com mensagem pronta
- Scripts já vêm com os dados substituídos (não tem mais [SEU NOME] vazio)

### 🗣️ Aba "Frases"
- 7 frases-chave pra usar durante a ligação
- Toca pra copiar
- Tabela de descontos médios por tipo de dívida

### 📋 Aba "Depois"
- Checklist "Antes de pagar" (6 itens de segurança)
- Alerta de armadilhas comuns
- Checklist "Depois do pagamento" (4 itens com prazos)
- Links pra Serasa, Desenrola, Consumidor.gov

## Diferencial competitivo

**Esse é o bônus mais útil de todos.** A maioria das pessoas com dívida tem medo de ligar pro banco. Esse interativo:

- **Reduz a fricção** — script pronto, dados preenchidos
- **Dá confiança** — calculadora mostra o que esperar
- **Vira viral** — quem consegue desconto vai postar print

**Calculadora de desconto** é um diferencial gigante. Concorrentes vendem PDF com "tabela de desconto". Aqui a pessoa coloca o valor e vê EXATAMENTE quanto pedir.

## Como hospedar
Igual aos outros: Netlify Drop ou subdomínio no Hostinger.

## Arquivos
- `index.html` — página completa (~50 KB com carta jurídica)
- `manifest.webmanifest`
- `LEIA-AQUI.md`

## Fontes oficiais (atualizado 15/05/2026)

### Dados BACEN — Estatísticas Monetárias e de Crédito
- **Janeiro/2026**: 424,5% a.a. (rotativo cartão crédito PF)
- **Fevereiro/2026**: 435,9% a.a.
- **Março/2026**: 428,6% a.a. (referência atual usada no app)
- Dataset oficial: https://dadosabertos.bcb.gov.br/dataset/22022

### Taxas por banco usadas no comparador
- Itaú: 540,77% a.a. (16,74%/mês)
- Banco do Brasil: 453,5% a.a. (15,33%/mês)
- Santander: 437,83% a.a. (15,05%/mês)
- Bradesco: 390,34% a.a. (14,17%/mês)
- Nubank: 356,18% a.a. (13,48%/mês)
- Caixa: 254,97% a.a. (11,13%/mês)
- (Inter, C6, Next, PicPay — estimados)

### Legislação citada na carta
- Lei 8.078/90 (CDC) — Art. 43 §1º (direito à exclusão)
- Lei 14.181/2021 (Lei do Superendividamento)
- Lei 13.709/2018 (LGPD)
- Resolução BCB 4.806/2020
- Súmula 548/STJ — baixa em 5 dias úteis após pagamento
- Súmula 530/STJ — juros abusivos > 2× média BACEN
- MP do Novo Desenrola Brasil (04/05/2026) — descontos 30%-90% por 90 dias

### Quando atualizar este app
- **A cada 3 meses**: revisar média BACEN (publicada todo dia 25 do mês seguinte)
- **A cada 6 meses**: revisar taxas por banco
- **Quando houver MP/Lei nova**: revisar artigo da carta jurídica
