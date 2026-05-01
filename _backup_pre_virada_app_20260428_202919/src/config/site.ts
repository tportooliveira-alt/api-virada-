// =====================================================================
// CONFIGURAÇÕES DO SITE — edite só este arquivo para personalizar tudo
// =====================================================================

// 🔗 Link de checkout da plataforma (Cakto, Hotmart, Kiwify, Eduzz...)
export const CHECKOUT_URL = "https://SEU-LINK-DE-CHECKOUT-AQUI.com";

// 💬 Link do WhatsApp (substitua 55SEUNUMEROAQUI pelo seu número com DDD)
export const WHATSAPP_URL =
  "https://wa.me/55SEUNUMEROAQUI?text=Quero%20come%C3%A7ar%20minha%20virada%20financeira";

// 📧 E-mail de contato/suporte
export const SUPPORT_EMAIL = "contato@codigodavirada.com.br";

// 🌐 Domínio público
export const SITE_URL = "https://codigodavirada.com.br";

// 🏢 Identificação do vendedor (rodapé / termos)
export const SELLER_NAME = "Código da Virada Financeira";
export const SELLER_DOC = "CPF/CNPJ: 000.000.000-00"; // troque

// 💰 Preços
export const PRICE_FROM = "R$ 97,00";
export const PRICE_NOW = "R$ 27,00";
export const PRICE_PARCELADO = "ou 3x de R$ 9,00 sem juros";
export const PRICE_FULL = "R$ 47,00";

// 🛒 Order bump
export const ORDER_BUMP = {
  enabled: true,
  title: "Mentoria em Vídeo (5h gravadas)",
  desc: "Acompanhe cada capítulo do livro em vídeo, com explicações práticas.",
  priceFrom: "R$ 97",
  priceNow: "R$ 17",
};

// ⏰ Contador regressivo (reseta a cada 24h — ético)
export const COUNTDOWN_HOURS = 24;

// 🚪 Pop-up de saída
export const EXIT_POPUP = {
  enabled: true,
  headline: "Espera! Antes de ir embora…",
  subhead:
    "Quero te dar mais 10% de desconto. Use o cupom VIRADA10 no checkout.",
  coupon: "VIRADA10",
};

// 🛎️ Notificações de venda em tempo real (mockadas com dados rotativos)
export const LIVE_SALES = {
  enabled: true,
  pool: [
    "Maria de Fortaleza acabou de adquirir",
    "João de São Paulo acabou de adquirir",
    "Ana de Belo Horizonte acabou de adquirir",
    "Roberto de Curitiba acabou de adquirir",
    "Patrícia do Recife acabou de adquirir",
    "Carlos de Salvador acabou de adquirir",
    "Juliana de Porto Alegre acabou de adquirir",
    "Lucas de Manaus acabou de adquirir",
  ],
};

// 📊 Pixel / GTM (preencha em .env.local)
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? "";
export const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID ?? "";
