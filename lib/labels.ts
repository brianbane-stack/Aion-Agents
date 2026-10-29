import type { Autonomy, MessageState, ReviewState, Role, RunState } from "@/types/domain";

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Responsável",
  admin: "Administração",
  operator: "Operação",
  approver: "Aprovação",
  viewer: "Leitura",
};

export const REVIEW_STATE_LABEL: Record<ReviewState, string> = {
  unanswered: "Sem resposta",
  suggestion_ready: "Sugestão para revisar",
  approved_pending_publish: "Aprovada, ainda não publicada",
  published: "Publicação confirmada",
  publish_failed: "Falha na publicação",
  discarded: "Sugestão descartada",
};

export const MESSAGE_STATE_LABEL: Record<MessageState, string> = {
  prepared: "Rascunho preparado",
  awaiting_approval: "Aguardando aprovação",
  approved: "Aprovada, envio não executado",
  send_accepted: "Envio aceito (entrega não confirmada)",
  sent: "Enviada ao WhatsApp (entrega não confirmada)",
  delivered: "Entrega confirmada",
  read: "Leitura confirmada",
  replied: "Resposta vinculada recebida",
  failed: "Falha de envio",
  not_sent_demo: "Não enviada — demonstração",
  blocked_consent: "Bloqueada por consentimento",
  skipped_duplicate: "Duplicidade evitada",
};

export const RUN_STATE_LABEL: Record<RunState, string> = {
  prepared: "Preparado",
  skipped: "Ignorado",
  not_executed: "Não executado",
  accepted: "Aceito pelo provedor",
  completed: "Concluído com confirmação",
  failed: "Falhou",
  cancelled: "Cancelado",
};

export const AUTONOMY_LABEL: Record<Autonomy, string> = {
  suggestion: "Sugestão",
  supervised: "Supervisionado",
  restricted: "Autonomia restrita",
};

export const FORMALITY_LABEL = {
  formal: "Formal",
  cordial: "Cordial",
  acolhedor: "Acolhedor",
} as const;
