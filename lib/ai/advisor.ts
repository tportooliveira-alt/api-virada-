export async function generateFinancialAdvice(userId: string, userMessage: string) {
  void userId;

  if (!process.env.OPENAI_API_KEY) {
    return [
      "Este orientador premium está preparado para IA, mas ainda está em modo demonstrativo.",
      "Pelo que você escreveu, comece com uma ação simples: registre o gasto, veja se ele cabe no mês e escolha um próximo passo sem promessa de dinheiro fácil.",
      `Mensagem analisada: ${userMessage}`,
    ].join(" ");
  }

  return "A integração real de IA deve ser ativada no servidor usando uma chave segura e mantendo o recurso restrito ao plano Premium.";
}
