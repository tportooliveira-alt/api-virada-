import { ExtraIncomeIdea, Goal, Income, Debt, Expense, Lesson, Mission } from "@/lib/types";

export const expenseCategories = [
  "Mercado",
  "Compra",
  "Fornecedor",
  "Estoque",
  "Impostos",
  "Marketing",
  "Funcionário",
  "Aluguel",
  "Energia",
  "Água",
  "Internet",
  "Transporte",
  "Cartão",
  "Dívida",
  "Delivery",
  "Lazer",
  "Saúde",
  "Educação",
  "Outros",
] as const;

export const incomeCategories = [
  "Salário",
  "Venda",
  "Recebimento",
  "Renda extra",
  "Venda de item",
  "Serviço",
  "Comissão",
  "Outros",
] as const;

export const paymentMethods = ["Pix", "Dinheiro", "Débito", "Crédito", "Boleto", "Outro"] as const;
export const debtPriorities = ["baixa", "média", "alta"] as const;
export const debtStatuses = ["aberta", "negociando", "quitada"] as const;
export const goalTypes = ["reserva", "dívida", "economia", "renda extra"] as const;

const currentDate = new Date();
const year = currentDate.getFullYear();
const month = String(currentDate.getMonth() + 1).padStart(2, "0");

export const seedExpenses: Expense[] = [
  {
    id: "expense-seed-market",
    description: "Mercado do mês",
    value: 650,
    category: "Mercado",
    date: `${year}-${month}-05`,
    paymentMethod: "Pix",
    nature: "essencial",
  },
  {
    id: "expense-seed-energy",
    description: "Conta de energia",
    value: 180,
    category: "Energia",
    date: `${year}-${month}-08`,
    paymentMethod: "Boleto",
    nature: "essencial",
  },
  {
    id: "expense-seed-rent",
    description: "Aluguel",
    value: 950,
    category: "Aluguel",
    date: `${year}-${month}-10`,
    paymentMethod: "Pix",
    nature: "essencial",
  },
  {
    id: "expense-seed-transport",
    description: "Transporte",
    value: 320,
    category: "Transporte",
    date: `${year}-${month}-12`,
    paymentMethod: "Débito",
    nature: "essencial",
  },
];

export const seedIncomes: Income[] = [
  {
    id: "income-seed-salary",
    description: "Salário",
    value: 2500,
    category: "Salário",
    date: `${year}-${month}-01`,
  },
];

export const seedDebts: Debt[] = [
  {
    id: "debt-seed-card",
    name: "Cartão",
    totalValue: 3200,
    installmentValue: 450,
    dueDate: `${year}-${month}-20`,
    priority: "alta",
    status: "aberta",
  },
];

export const seedGoals: Goal[] = [
  {
    id: "goal-seed-reserve",
    name: "Reserva de Emergência",
    targetValue: 1000,
    currentValue: 100,
    type: "reserva",
  },
];

export const missions: Mission[] = [
  { id: "mission-1", day: 1, title: "Faça seu raio-x financeiro", description: "Veja quanto entra, quanto sai e onde seu dinheiro está indo hoje." },
  { id: "mission-2", day: 2, title: "Anote todos os gastos", description: "Registre tudo, até o valor pequeno. Seu dinheiro não some. Ele vai para algum lugar." },
  { id: "mission-3", day: 3, title: "Liste suas dívidas", description: "Escreva nome, valor, parcela e prioridade para tirar o peso da cabeça." },
  { id: "mission-4", day: 4, title: "Cancele um desperdício", description: "Escolha uma despesa que não está ajudando sua vida e corte hoje." },
  { id: "mission-5", day: 5, title: "Aplique a regra das 24 horas", description: "Se der vontade de comprar algo, espere um dia antes de decidir." },
  { id: "mission-6", day: 6, title: "Anuncie um item parado", description: "Separe uma coisa que você não usa e coloque para vender ainda hoje." },
  { id: "mission-7", day: 7, title: "Monte seu calendário de contas", description: "Organize vencimentos e fuja do susto com datas esquecidas." },
  { id: "mission-8", day: 8, title: "Escolha uma dívida prioritária", description: "Defina qual dívida precisa da sua energia primeiro." },
  { id: "mission-9", day: 9, title: "Mande mensagem para negociar uma dívida", description: "Dê o primeiro passo. Não é dinheiro fácil. É direção." },
  { id: "mission-10", day: 10, title: "Separe o primeiro valor para reserva", description: "Mesmo que seja pouco, marque o começo da sua proteção." },
  { id: "mission-11", day: 11, title: "Faça uma lista de coisas que pode vender", description: "Escreva pelo menos cinco itens com potencial de virar caixa." },
  { id: "mission-12", day: 12, title: "Ofereça um serviço simples", description: "Pode ser faxina, ajuda digital, currículo ou algo que você saiba fazer." },
  { id: "mission-13", day: 13, title: "Revise seus gastos com delivery", description: "Veja o total e decida onde reduzir sem culpa, mas com clareza." },
  { id: "mission-14", day: 14, title: "Monte uma lista antes do mercado", description: "Lista pronta evita fuga de dinheiro no improviso." },
  { id: "mission-15", day: 15, title: "Escolha uma ideia de renda extra", description: "Não abrace tudo. Escolha uma e avance nela hoje." },
  { id: "mission-16", day: 16, title: "Fale com 5 pessoas oferecendo algo", description: "Movimento gera resposta. Comece pequeno, mas comece hoje." },
  { id: "mission-17", day: 17, title: "Poste uma oferta no WhatsApp", description: "Use sua rede para abrir oportunidade de venda ou serviço." },
  { id: "mission-18", day: 18, title: "Revise assinaturas", description: "Corte o que ficou automático e não faz sentido no seu momento." },
  { id: "mission-19", day: 19, title: "Evite compra por impulso", description: "Passe um dia inteiro sem gastar com vontade passageira." },
  { id: "mission-20", day: 20, title: "Guarde qualquer valor", description: "O valor importa menos do que a construção do hábito." },
  { id: "mission-21", day: 21, title: "Veja quanto economizou", description: "Olhar o progresso reforça que organização também dá resultado." },
  { id: "mission-22", day: 22, title: "Atualize suas metas", description: "Ajuste números e deixe seu plano mais realista." },
  { id: "mission-23", day: 23, title: "Revise suas dívidas", description: "Veja o que mudou, o que venceu e o que precisa de ação." },
  { id: "mission-24", day: 24, title: "Procure um comércio local para oferecer serviço", description: "Uma conversa simples pode virar uma primeira renda." },
  { id: "mission-25", day: 25, title: "Organize sua próxima semana", description: "Agenda boa reduz atraso, impulso e desordem financeira." },
  { id: "mission-26", day: 26, title: "Defina uma meta de renda extra", description: "Escolha um valor para perseguir com foco, não no escuro." },
  { id: "mission-27", day: 27, title: "Venda ou anuncie mais um item", description: "Repita o movimento. A virada vem da constância." },
  { id: "mission-28", day: 28, title: "Revise seu cartão", description: "Confira fatura, parcelas e compras que ainda pesam no mês." },
  { id: "mission-29", day: 29, title: "Monte plano do próximo mês", description: "Entre no mês seguinte com mapa, não só com esperança." },
  { id: "mission-30", day: 30, title: "Avalie sua evolução", description: "Reveja o que você aprendeu e o que já mudou no seu comportamento." },
];

export const extraIncomeIdeas: ExtraIncomeIdea[] = [
  {
    id: "idea-1",
    title: "Vender coisas paradas",
    category: "Venda rápida",
    initialInvestment: "Nenhum",
    difficulty: "Baixa",
    timeToStart: "Hoje",
    steps: ["Separar itens em bom estado", "Tirar fotos claras", "Anunciar em grupos e marketplaces"],
    message: "Oi! Estou vendendo este item em bom estado. Se quiser, te mando mais fotos e valor.",
  },
  {
    id: "idea-2",
    title: "Diária",
    category: "Serviço local",
    initialInvestment: "Baixo",
    difficulty: "Média",
    timeToStart: "1 a 3 dias",
    steps: ["Definir bairros", "Montar valor inicial", "Oferecer em grupos e para conhecidos"],
    message: "Oi! Estou pegando diária para limpeza e organização. Se souber de alguém, posso atender nesta semana.",
  },
  {
    id: "idea-3",
    title: "Lavar carro",
    category: "Serviço local",
    initialInvestment: "Baixo",
    difficulty: "Baixa",
    timeToStart: "Hoje",
    steps: ["Separar balde e pano", "Definir preço simples", "Oferecer para vizinhos"],
    message: "Oi! Estou fazendo lavagem simples de carro por um valor acessível. Se quiser agendar, me chama.",
  },
  {
    id: "idea-4",
    title: "Vender doces",
    category: "Alimentação",
    initialInvestment: "Baixo",
    difficulty: "Média",
    timeToStart: "2 a 5 dias",
    steps: ["Escolher um doce fácil", "Calcular custo", "Testar venda com conhecidos"],
    message: "Oi! Estou fazendo doces por encomenda e pronta entrega. Posso te mandar o cardápio.",
  },
  {
    id: "idea-5",
    title: "Vender marmitas",
    category: "Alimentação",
    initialInvestment: "Médio",
    difficulty: "Média",
    timeToStart: "3 a 7 dias",
    steps: ["Montar 1 cardápio enxuto", "Calcular custo por unidade", "Divulgar nos grupos do bairro"],
    message: "Oi! Estou vendendo marmitas com preço justo aqui na região. Se quiser, te envio o menu de hoje.",
  },
  {
    id: "idea-6",
    title: "Revender produtos",
    category: "Comércio",
    initialInvestment: "Médio",
    difficulty: "Média",
    timeToStart: "1 semana",
    steps: ["Escolher nicho simples", "Comprar pouco para testar", "Divulgar para sua rede"],
    message: "Oi! Estou com alguns produtos para pronta entrega. Posso te mandar as opções e preços.",
  },
  {
    id: "idea-7",
    title: "Cuidar de pets",
    category: "Serviço local",
    initialInvestment: "Nenhum",
    difficulty: "Baixa",
    timeToStart: "Hoje",
    steps: ["Oferecer passeios ou visita", "Definir horários", "Falar com vizinhos e condomínios"],
    message: "Oi! Estou cuidando de pets e fazendo passeios aqui na região. Se precisar, posso te explicar como funciona.",
  },
  {
    id: "idea-8",
    title: "Fazer currículo",
    category: "Serviço digital",
    initialInvestment: "Nenhum",
    difficulty: "Baixa",
    timeToStart: "Hoje",
    steps: ["Criar modelo simples", "Definir valor acessível", "Oferecer em grupos e para conhecidos"],
    message: "Oi! Estou montando currículos de forma simples e organizada. Se quiser, posso te ajudar com o seu.",
  },
  {
    id: "idea-9",
    title: "Criar artes no Canva",
    category: "Serviço digital",
    initialInvestment: "Nenhum",
    difficulty: "Média",
    timeToStart: "1 a 3 dias",
    steps: ["Montar 3 modelos", "Escolher um nicho local", "Mostrar exemplos para clientes"],
    message: "Oi! Estou criando artes para promoções, posts e cardápios. Se quiser, posso te mostrar alguns modelos.",
  },
  {
    id: "idea-10",
    title: "Editar vídeos curtos",
    category: "Serviço digital",
    initialInvestment: "Nenhum",
    difficulty: "Média",
    timeToStart: "2 a 5 dias",
    steps: ["Editar 2 vídeos de exemplo", "Definir pacote inicial", "Abordar quem já posta vídeos"],
    message: "Oi! Estou editando vídeos curtos para Reels e status. Se quiser, posso te mostrar um exemplo.",
  },
  {
    id: "idea-11",
    title: "Cuidar de Instagram de comércio local",
    category: "Serviço digital",
    initialInvestment: "Nenhum",
    difficulty: "Média",
    timeToStart: "3 a 7 dias",
    steps: ["Escolher 1 tipo de negócio", "Montar proposta simples", "Visitar ou chamar no WhatsApp"],
    message: "Oi! Posso ajudar seu Instagram com posts, ideias e organização semanal. Se quiser, explico em 2 minutos.",
  },
  {
    id: "idea-12",
    title: "Criar cardápio digital",
    category: "Serviço digital",
    initialInvestment: "Nenhum",
    difficulty: "Baixa",
    timeToStart: "Hoje",
    steps: ["Criar modelo base", "Oferecer para lanchonetes e docerias", "Entregar rápido para ganhar indicação"],
    message: "Oi! Estou criando cardápios digitais simples e bonitos para pequenos negócios. Posso te mandar um exemplo.",
  },
];

export const lessons: Lesson[] = [
  { id: "lesson-1", title: "Clareza financeira", text: "Antes de resolver qualquer aperto, você precisa enxergar o que está acontecendo com o dinheiro.", action: "Passe 10 minutos olhando o que entrou e o que saiu neste mês." },
  { id: "lesson-2", title: "Organização das contas", text: "Conta sem data definida vira atraso, juros e ansiedade.", action: "Monte uma lista com vencimento de todas as contas fixas." },
  { id: "lesson-3", title: "Dívidas perigosas", text: "Nem toda dívida pesa igual. Algumas drenam energia e juros mais rápido.", action: "Marque qual dívida exige sua atenção primeiro." },
  { id: "lesson-4", title: "Cortes inteligentes", text: "Cortar tudo de uma vez costuma falhar. O melhor corte é o que você consegue sustentar.", action: "Escolha um gasto evitável e reduza nesta semana." },
  { id: "lesson-5", title: "Renda extra", text: "Renda extra não precisa nascer perfeita. Ela começa com ação simples e repetida.", action: "Escolha uma ideia e mande uma primeira oferta hoje." },
  { id: "lesson-6", title: "Reserva de emergência", text: "Reserva não é luxo. É proteção para você respirar quando algo aperta.", action: "Separe qualquer valor e registre como começo da sua reserva." },
  { id: "lesson-7", title: "Direção financeira", text: "Você não precisa de promessa mágica. Precisa de um plano que caiba na sua vida.", action: "Atualize uma meta e defina o próximo passo do seu mês." },
];
