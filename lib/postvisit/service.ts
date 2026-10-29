import { can } from "@/lib/auth/permissions";
import { externalCallsAllowed } from "@/lib/env";
import { fail, ok } from "@/lib/result";
import { neutralReviewIssue, renderTemplate } from "@/lib/messages/policy";
import { isTerminalSend } from "@/lib/messages/states";
import {
  addActivity,
  addApproval,
  addAudit,
  blockUnsentForContact,
  countRecentAcceptances,
  findRunByIdempotency,
  getContact,
  getMessage,
  getTemplate,
  getWorkflow,
  insertPreparedMessage,
  listAgents,
  listContacts,
  listMessages,
  setAgentStatus,
  setConsent,
  updateMessageState,
  updateTemplate,
  updateWorkflow,
} from "@/lib/db/store";
import { whatsappCredentials } from "@/lib/integrations/credentials";
import { sendWhatsappTemplate } from "@/lib/integrations/whatsapp";
import type { Actor, Autonomy } from "@/types/domain";

const missing = "Registro não encontrado nesta clínica.";

function denied(actor: Actor, permission: Parameters<typeof can>[1]) {
  if (!can(actor.role, permission)) return fail("Seu perfil não pode fazer essa ação.", "forbidden");
  return null;
}

export function saveWorkflow(actor: Actor, input: {
  workflowId: string;
  waitHours: number;
  maxAttempts: number;
  autonomy: Autonomy;
  templateBody: string;
  providerTemplateName: string;
}) {
  const block = denied(actor, "manage_workflows");
  if (block) return block;
  const workflow = getWorkflow(actor.clinicId, input.workflowId);
  if (!workflow) return fail(missing, "not_found");
  if (input.autonomy === "restricted" && !can(actor.role, "set_restricted_autonomy")) {
    return fail("Só responsável ou administração pode ativar autonomia restrita.", "forbidden");
  }
  if (workflow.config.neutralRequest || workflow.key === "postvisit-review") {
    const issue = neutralReviewIssue(input.templateBody);
    if (issue) return fail(issue, "neutral");
  }
  const config = {
    ...workflow.config,
    waitHours: input.waitHours,
    maxAttempts: input.maxAttempts,
    neutralRequest: workflow.key === "postvisit-review" ? true : workflow.config.neutralRequest,
  };
  updateWorkflow(actor.clinicId, workflow.id, { autonomy: input.autonomy, status: workflow.status, config });
  updateTemplate(actor.clinicId, workflow.id, input.templateBody, input.providerTemplateName);
  addAudit({ clinicId: actor.clinicId, actorUserId: actor.userId, action: "workflow.updated", subjectType: "workflow", subjectId: workflow.id });
  return ok("Regras do fluxo salvas.");
}

export function setWorkflowPaused(actor: Actor, workflowId: string, paused: boolean) {
  const block = denied(actor, "manage_workflows");
  if (block) return block;
  const workflow = getWorkflow(actor.clinicId, workflowId);
  if (!workflow) return fail(missing, "not_found");
  updateWorkflow(actor.clinicId, workflow.id, {
    autonomy: workflow.autonomy,
    status: paused ? "paused" : "active",
    config: workflow.config,
  });
  addActivity({
    clinicId: actor.clinicId,
    kind: "info",
    actorType: "user",
    actorKey: "user",
    actorLabel: actor.name,
    title: paused ? `${workflow.name} pausado` : `${workflow.name} reativado`,
    detail: paused ? "Novos envios deste fluxo não serão executados." : "O fluxo voltou a aceitar preparação e execução autorizada.",
    subjectType: "workflow",
    subjectId: workflow.id,
    result: paused ? "Pausado." : "Ativo.",
  });
  return ok(paused ? "Fluxo pausado." : "Fluxo reativado.");
}

export function setAgentPaused(actor: Actor, key: "bruno" | "lucas", paused: boolean) {
  const block = denied(actor, "pause_agent");
  if (block) return block;
  if (!setAgentStatus(actor.clinicId, key, paused ? "paused" : "active")) return fail(missing, "not_found");
  addActivity({
    clinicId: actor.clinicId,
    kind: "info",
    actorType: "user",
    actorKey: "user",
    actorLabel: actor.name,
    title: paused ? `${key === "bruno" ? "Dr. Bruno" : "Lucas"} pausado` : `${key === "bruno" ? "Dr. Bruno" : "Lucas"} reativado`,
    detail: "A pausa impede novas ações externas desse agente.",
    result: paused ? "Agente pausado." : "Agente ativo.",
  });
  return ok(paused ? "Agente pausado." : "Agente reativado.");
}

export function changeConsent(actor: Actor, contactId: string, status: "opted_in" | "opted_out" | "unknown") {
  const block = denied(actor, "manage_workflows");
  if (block) return block;
  const contact = getContact(actor.clinicId, contactId);
  if (!contact) return fail(missing, "not_found");
  setConsent(actor.clinicId, contactId, status);
  const blocked = status === "opted_out" ? blockUnsentForContact(actor.clinicId, contactId) : 0;
  addAudit({ clinicId: actor.clinicId, actorUserId: actor.userId, action: "contact.consent", subjectType: "contact", subjectId: contactId, metadata: { status } });
  return ok(status === "opted_out" ? `Consentimento recusado. ${blocked} mensagem(ns) ainda não enviada(s) foram bloqueadas.` : "Consentimento atualizado.");
}

function firstName(name: string) {
  return name.split(" ")[0] || "olá";
}

export function prepareEligible(actor: Actor, workflowId: string) {
  const block = denied(actor, "manage_workflows");
  if (block) return block;
  const workflow = getWorkflow(actor.clinicId, workflowId);
  if (!workflow) return fail(missing, "not_found");
  if (workflow.status !== "active") return fail("O fluxo está pausado. Nada foi preparado.", "paused");
  const agent = listAgents(actor.clinicId).find((item) => item.key === workflow.agentKey);
  if (agent?.status === "paused") return fail("O agente está pausado. Nada foi preparado.", "paused");
  const template = getTemplate(actor.clinicId, workflow.id);
  if (!template) return fail("O fluxo não tem modelo de mensagem.", "missing_template");
  if (workflow.config.neutralRequest) {
    const issue = neutralReviewIssue(template.body);
    if (issue) return fail(issue, "neutral");
  }
  let created = 0;
  let duplicates = 0;
  let blocked = 0;
  for (const contact of listContacts(actor.clinicId)) {
    const key = `${actor.clinicId}:${workflow.id}:${contact.id}`;
    if (findRunByIdempotency(key)) {
      duplicates += 1;
      continue;
    }
    const scheduled = new Date(Date.now() + workflow.config.waitHours * 3_600_000).toISOString();
    if (contact.consentStatus !== "opted_in") {
      insertPreparedMessage({
        clinicId: actor.clinicId,
        workflowId: workflow.id,
        contactId: contact.id,
        templateId: template.id,
        body: renderTemplate(template.body, firstName(contact.displayName)),
        state: "blocked_consent",
        runStatus: "skipped",
        reason: "Sem consentimento de contato. Nenhum envio externo.",
        idempotencyKey: key,
        scheduledFor: scheduled,
        sourceMode: "demonstration",
        lastError: "Consentimento ausente ou recusado.",
      });
      blocked += 1;
      continue;
    }
    const state = workflow.autonomy === "suggestion" ? "prepared" : "awaiting_approval";
    insertPreparedMessage({
      clinicId: actor.clinicId,
      workflowId: workflow.id,
      contactId: contact.id,
      templateId: template.id,
      body: renderTemplate(template.body, firstName(contact.displayName)),
      state,
      runStatus: "prepared",
      reason: "Elegível pelo consentimento. Envio ainda não executado.",
      idempotencyKey: key,
      scheduledFor: scheduled,
      sourceMode: externalCallsAllowed() ? "provider" : "demonstration",
    });
    created += 1;
  }
  addActivity({
    clinicId: actor.clinicId,
    kind: created ? "action_required" : "info",
    actorType: "agent",
    actorKey: workflow.agentKey,
    actorLabel: workflow.agentKey === "bruno" ? "Dr. Bruno" : "Lucas",
    title: `Preparação de ${workflow.name}`,
    detail: `${created} preparado(s), ${blocked} bloqueado(s) por consentimento, ${duplicates} duplicidade(s) evitada(s).`,
    subjectType: "workflow",
    subjectId: workflow.id,
    result: "Nenhuma mensagem foi enviada ao provedor nesta preparação.",
  });
  return ok(`${created} mensagem(ns) preparada(s). ${duplicates} duplicidade(s) evitada(s). ${blocked} bloqueada(s) por consentimento.`, { created, duplicates, blocked });
}

export function approveMessage(actor: Actor, messageId: string) {
  const block = denied(actor, "approve");
  if (block) return block;
  const message = getMessage(actor.clinicId, messageId);
  if (!message) return fail(missing, "not_found");
  if (isTerminalSend(message.state) || message.state === "failed") {
    return fail("Esta mensagem não está mais em revisão.", "invalid_state");
  }
  updateMessageState(actor.clinicId, message.id, { state: "approved", runStatus: "prepared", reason: "Aprovada para envio. O envio ainda não foi executado." });
  addApproval({ clinicId: actor.clinicId, subjectType: "outbound_message", subjectId: message.id, decision: "approved", decidedBy: actor.userId });
  addActivity({
    clinicId: actor.clinicId,
    kind: "action_required",
    actorType: "user",
    actorKey: "user",
    actorLabel: actor.name,
    title: `Mensagem aprovada para ${message.contactName}`,
    detail: "A aprovação não significa envio nem entrega.",
    subjectType: "message",
    subjectId: message.id,
    result: "Aprovada localmente. Não enviada.",
  });
  return ok("Mensagem aprovada. O envio ainda não foi executado.");
}

export async function executeMessage(actor: Actor, messageId: string, fetchImpl: typeof fetch = fetch) {
  const block = denied(actor, "send_message");
  if (block) return block;
  const message = getMessage(actor.clinicId, messageId);
  if (!message) return fail(missing, "not_found");
  const workflow = getWorkflow(actor.clinicId, message.workflowId);
  if (!workflow) return fail(missing, "not_found");
  if (workflow.status !== "active") return fail("O fluxo está pausado. O envio não foi executado.", "paused");
  const agent = listAgents(actor.clinicId).find((item) => item.key === workflow.agentKey);
  if (agent?.status === "paused") return fail("O agente está pausado. O envio não foi executado.", "paused");
  if (isTerminalSend(message.state)) {
    return fail("Esta execução já foi registrada. Nenhum novo envio foi criado.", "duplicate");
  }
  const contact = getContact(actor.clinicId, message.contactId);
  if (!contact || contact.consentStatus !== "opted_in") {
    updateMessageState(actor.clinicId, message.id, { state: "blocked_consent", runStatus: "skipped", lastError: "Consentimento ausente no momento do envio.", reason: "Bloqueada por consentimento." });
    return fail("O contato não autoriza mensagens. Nenhum envio foi feito.", "consent");
  }
  if (workflow.autonomy === "suggestion") {
    return fail("Este fluxo está em modo sugestão e não envia mensagens.", "autonomy");
  }
  if (workflow.autonomy === "supervised" && message.state !== "approved") {
    return fail("No modo supervisionado, o envio só ocorre depois da aprovação.", "not_approved");
  }
  if (message.attemptCount >= workflow.config.maxAttempts) {
    return fail("O limite de tentativas deste fluxo já foi atingido. Não repeti o envio.", "attempts");
  }
  if (workflow.config.neutralRequest) {
    const issue = neutralReviewIssue(message.bodyRendered);
    if (issue) return fail(issue, "neutral");
  }

  if (!externalCallsAllowed()) {
    updateMessageState(actor.clinicId, message.id, {
      state: "not_sent_demo",
      runStatus: "not_executed",
      attemptCount: message.attemptCount + 1,
      lastError: null,
      reason: "Ambiente de demonstração. Nenhuma chamada à Meta.",
    });
    addActivity({
      clinicId: actor.clinicId,
      kind: "info",
      actorType: "agent",
      actorKey: workflow.agentKey,
      actorLabel: workflow.agentKey === "bruno" ? "Dr. Bruno" : "Lucas",
      title: `Envio não executado para ${message.contactName}`,
      detail: "O ambiente é de demonstração. A mensagem não foi aceita, enviada nem entregue pela Meta.",
      subjectType: "message",
      subjectId: message.id,
      result: "Não enviada — demonstração.",
    });
    return fail("Envio não executado. Ambiente de demonstração. Nenhuma chamada foi feita à Meta.", "demonstration");
  }

  const template = getTemplate(actor.clinicId, workflow.id);
  if (!template?.providerTemplateName) {
    return fail("O modelo não tem o nome cadastrado na WhatsApp Cloud API. Nenhum envio foi tentado.", "missing_template");
  }
  const creds = whatsappCredentials(actor.clinicId);
  if (!creds.ok || !creds.secret.accessToken || !creds.phoneNumberId || creds.integration.status !== "connected") {
    return fail("A WhatsApp Cloud API não está conectada. Nenhum envio foi tentado.", "not_configured");
  }
  const since = new Date(Date.now() - 60_000).toISOString();
  if (countRecentAcceptances(actor.clinicId, since) >= 20) {
    return fail("Limite local de segurança: 20 envios aceitos por minuto nesta clínica. A chamada não foi feita.", "rate_limit");
  }
  const parameters = template.body.includes("{{1}}") ? [firstName(contact.displayName)] : [];
  const sent = await sendWhatsappTemplate({
    accessToken: creds.secret.accessToken,
    phoneNumberId: creds.phoneNumberId,
    to: contact.phoneE164,
    templateName: template.providerTemplateName,
    language: template.language,
    parameters,
    fetchImpl,
  });
  if (!sent.ok) {
    updateMessageState(actor.clinicId, message.id, {
      state: "failed",
      runStatus: "failed",
      attemptCount: message.attemptCount + 1,
      lastError: sent.message,
      reason: "A API não aceitou o envio.",
    });
    addActivity({
      clinicId: actor.clinicId,
      kind: "failure",
      actorType: "integration",
      actorKey: "integration",
      actorLabel: "WhatsApp Cloud API",
      title: `Falha ao enviar para ${message.contactName}`,
      detail: sent.message,
      subjectType: "message",
      subjectId: message.id,
      result: "Envio não aceito. Entrega não confirmada.",
    });
    return fail(`A API não aceitou o envio. ${sent.message}`, "provider_error");
  }
  const acceptedAt = new Date().toISOString();
  updateMessageState(actor.clinicId, message.id, {
    state: "send_accepted",
    runStatus: "accepted",
    providerMessageId: sent.providerMessageId,
    attemptCount: message.attemptCount + 1,
    acceptedAt,
    lastError: null,
    reason: "A API aceitou o envio. A entrega depende de webhook.",
  });
  addActivity({
    clinicId: actor.clinicId,
    kind: "info",
    actorType: "integration",
    actorKey: "integration",
    actorLabel: "WhatsApp Cloud API",
    title: `Envio aceito para ${message.contactName}`,
    detail: "O identificador da mensagem foi registrado. Isso não confirma entrega.",
    subjectType: "message",
    subjectId: message.id,
    result: "Aceito pelo provedor. Entrega ainda não confirmada.",
  });
  return ok("A API aceitou o envio. A entrega só muda quando um webhook confirmar.");
}

export async function executeApprovedInWorkflow(actor: Actor, workflowId: string, fetchImpl: typeof fetch = fetch) {
  const workflow = getWorkflow(actor.clinicId, workflowId);
  if (!workflow) return fail(missing, "not_found");
  const candidates = listMessages(actor.clinicId, workflowId).filter((message) => {
    if (workflow.autonomy === "restricted") return message.state === "prepared" || message.state === "awaiting_approval" || message.state === "approved";
    return message.state === "approved";
  });
  const results = [];
  for (const message of candidates) {
    results.push(await executeMessage(actor, message.id, fetchImpl));
  }
  const sent = results.filter((result) => result.ok).length;
  const blocked = results.length - sent;
  return ok(`${sent} execução(ões) aceita(s) ou concluída(s) no registro. ${blocked} não seguiram. Veja o estado de cada mensagem.`, { sent, blocked });
}

export function workflowAutonomy(workflow: { autonomy: Autonomy }) {
  return workflow.autonomy;
}
