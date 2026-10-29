import type { Autonomy, WorkflowConfig } from "@/types/domain";

export type WorkflowBlueprint = {
  key: string;
  agentKey: "bruno" | "lucas";
  name: string;
  objective: string;
  autonomy: Autonomy;
  config: WorkflowConfig;
  templateName: string;
  templateBody: string;
  providerTemplateName: string;
};

const shared = {
  sources: ["Registros da clínica neste sistema"],
  requiredPermissions: ["Conexão válida do provedor, quando a ação sair da plataforma"],
  stopConditions: ["Agente pausado", "Fluxo pausado", "Consentimento recusado", "Limite de tentativas atingido"],
  escalation: "Intervenção humana quando a ação externa não está autorizada ou a chamada falha.",
  failurePolicy: "Registrar a falha, não repetir automaticamente uma chamada com efeito externo.",
};

export function workflowBlueprints(): WorkflowBlueprint[] {
  return [
    {
      key: "reply-reviews",
      agentKey: "bruno",
      name: "Respostas de avaliações",
      objective: "Preparar respostas fiéis às avaliações e publicá-las somente após aprovação e confirmação do Google.",
      autonomy: "supervised",
      templateName: "Resposta pública",
      templateBody: "A resposta é redigida para cada avaliação. Este fluxo não usa um modelo único de WhatsApp.",
      providerTemplateName: "",
      config: {
        waitHours: 0,
        maxAttempts: 1,
        sources: ["Avaliações armazenadas", "Memória explícita da clínica"],
        allowedActions: ["Gerar sugestão", "Editar", "Aprovar", "Publicar se a integração estiver ativa"],
        requiredPermissions: ["OAuth business.manage e local verificado para publicar"],
        stopConditions: ["Avaliação já publicada", "Agente pausado", "Modo demonstração"],
        escalation: "A publicação sempre exige aprovação de um perfil autorizador.",
        failurePolicy: "Se o Google recusar, o estado fica em falha e só uma nova ação humana tenta de novo.",
        successCriteria: "A API confirma a resposta publicada.",
        neutralRequest: false,
      },
    },
    {
      key: "postvisit-followup",
      agentKey: "lucas",
      name: "Acompanhamento após a consulta",
      objective: "Perguntar como o tutor e o animal estão depois do atendimento, sem pressão comercial.",
      autonomy: "supervised",
      templateName: "Acompanhamento",
      templateBody:
        "Olá, {{1}}. Aqui é a equipe da clínica. Passamos para saber como você e seu animal estão depois da consulta. Se precisar falar com a gente, responda esta mensagem ou ligue para a clínica.",
      providerTemplateName: "",
      config: {
        waitHours: 24,
        maxAttempts: 2,
        ...shared,
        allowedActions: ["Preparar mensagem", "Aguardar aprovação", "Enviar template se a Cloud API estiver ativa"],
        successCriteria: "Webhook confirma a entrega. Aceite de envio não conta como entrega.",
        neutralRequest: false,
      },
    },
    {
      key: "postvisit-review",
      agentKey: "lucas",
      name: "Convite neutro para avaliação",
      objective: "Convidar o tutor a avaliar publicamente, sem recompensa e sem excluir pessoas por nota presumida.",
      autonomy: "supervised",
      templateName: "Convite neutro",
      templateBody:
        "Olá, {{1}}. Se quiser registrar como foi o atendimento, a avaliação pública da clínica está disponível. A escolha é inteiramente sua.",
      providerTemplateName: "",
      config: {
        waitHours: 72,
        maxAttempts: 1,
        ...shared,
        allowedActions: ["Preparar convite neutro", "Aguardar aprovação", "Enviar template aprovado na Meta"],
        successCriteria: "Webhook confirma a entrega do convite. A avaliação recebida não é atribuída automaticamente a este envio.",
        neutralRequest: true,
      },
    },
  ];
}
