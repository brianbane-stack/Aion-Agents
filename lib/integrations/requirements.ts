export const INTEGRATION_REQUIREMENTS = {
  google_business: {
    title: "Google Business Profile",
    summary: "Ler avaliações e publicar respostas em um local verificado, depois da aprovação humana.",
    docs: "https://developers.google.com/my-business/content/review-data",
    scopes: ["https://www.googleapis.com/auth/business.manage"],
    needs: [
      "Cliente OAuth de aplicativo da Web no Google Cloud.",
      "Business Profile APIs habilitadas para a conta.",
      "URI de redirecionamento igual a /api/integrations/google/callback.",
      "A conta Google precisa administrar um local verificado. A listagem de avaliações só vale nesse caso.",
    ],
    limits: [
      "A página de avaliações aceita no máximo 50 itens, conforme a documentação de reviews.list.",
      "A publicação usa PUT em /v4/{review}/reply e só é tratada como feita quando a API responde.",
      "No modo demonstração nenhuma chamada sai deste servidor.",
    ],
  },
  whatsapp_cloud: {
    title: "WhatsApp Cloud API",
    summary: "Enviar modelos aprovados e atualizar entrega somente por webhook assinado.",
    docs: "https://developers.facebook.com/docs/whatsapp/cloud-api",
    scopes: ["whatsapp_business_messaging", "whatsapp_business_management"],
    needs: [
      "Token de acesso do sistema e identificador do número de telefone.",
      "Segredo do aplicativo para validar X-Hub-Signature-256.",
      "Token de verificação do webhook.",
      "Modelo aprovado na Meta. O texto local é só a prévia.",
    ],
    limits: [
      "Mensagem de negócio inicia por template. Aceite da API não é entrega.",
      "Entrega, leitura e falha vêm do webhook de statuses.",
      "Há um limite local de 20 aceites por minuto, além dos limites da conta na Meta.",
      "No modo demonstração nenhuma chamada sai deste servidor.",
    ],
  },
} as const;

export type ProviderKey = keyof typeof INTEGRATION_REQUIREMENTS;
