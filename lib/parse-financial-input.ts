import { ParsedFinancialInput, ParsedFinancialType } from "@/lib/types";
import { toInputDate } from "@/lib/utils";

const categoryRules = [
  { category: "Venda", terms: ["venda", "vendi", "vendido", "cliente pagou", "recebi de cliente"] },
  { category: "Recebimento", terms: ["recebi pix", "recebi transferencia", "recebimento", "entrada de dinheiro"] },
  { category: "Compra", terms: ["comprei", "compra", "compras"] },
  { category: "Fornecedor", terms: ["fornecedor", "paguei fornecedor"] },
  { category: "Estoque", terms: ["estoque", "mercadoria", "produto para vender"] },
  { category: "Impostos", terms: ["imposto", "mei", "das", "taxa"] },
  { category: "Marketing", terms: ["anuncio", "anúncio", "trafego", "tráfego", "marketing"] },
  { category: "Funcionário", terms: ["funcionario", "funcionário", "diaria", "diária", "ajudante"] },
  { category: "Mercado", terms: ["mercado", "supermercado", "feira", "compra do mês"] },
  { category: "Energia", terms: ["energia", "luz", "conta de luz"] },
  { category: "Água", terms: ["água", "agua", "saneamento"] },
  { category: "Internet", terms: ["internet", "wifi", "wi-fi"] },
  { category: "Transporte", terms: ["transporte", "uber", "ônibus", "onibus", "gasolina"] },
  { category: "Cartão", terms: ["cartão", "cartao", "fatura"] },
  { category: "Dívida", terms: ["dívida", "divida", "empréstimo", "emprestimo"] },
  { category: "Renda extra", terms: ["renda extra", "freela", "bico", "serviço", "servico"] },
  { category: "Venda de item", terms: ["vendendo", "vendi", "venda", "roupa", "celular usado"] },
  { category: "Reserva", terms: ["reserva", "guardei", "guardar", "poupei"] },
];

function normalize(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getAmount(input: string) {
  const match = normalize(input).match(/(?:r\$?\s*)?(\d+(?:[.,]\d{1,2})?)/);
  return match ? Number(match[1].replace(",", ".")) : 0;
}

function getType(input: string): ParsedFinancialType {
  const text = normalize(input);

  if (/(vendi|venda|recebi|recebimento|entrou|cliente pagou|ganhei|salario|pix recebido)/.test(text)) {
    return "income";
  }

  if (/(guardei|guardar|poupei|reserva)/.test(text)) {
    return "saving";
  }

  if (/(paguei|quitei|abati)/.test(text) && /(cartao|divida|emprestimo|parcela)/.test(text)) {
    return "debt_payment";
  }

  return "expense";
}

function getCategory(input: string, type: ParsedFinancialType) {
  const text = normalize(input);
  const rule = categoryRules.find((item) =>
    item.terms.some((term) => text.includes(normalize(term))),
  );

  if (rule) {
    return rule.category;
  }

  if (type === "income") return "Outros";
  if (type === "saving") return "Reserva";
  if (type === "debt_payment") return "Dívida";
  return "Outros";
}

function cleanDescription(input: string, amount: number) {
  const text = input
    .replace(new RegExp(String(amount).replace(".", "[,.]"), "i"), "")
    .replace(/\b(reais|real|r\$|gastei|paguei|recebi|ganhei|guardei|vendi|venda|comprei)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return text || "lançamento";
}

export function parseFinancialInput(input: string): ParsedFinancialInput | null {
  const amount = getAmount(input);

  if (!input.trim() || amount <= 0) {
    return null;
  }

  const type = getType(input);
  const category = getCategory(input, type);
  const description = cleanDescription(input, amount);

  return {
    type,
    amount,
    category,
    description,
    date: toInputDate(),
    confidence: category === "Outros" ? 0.68 : 0.88,
  };
}
