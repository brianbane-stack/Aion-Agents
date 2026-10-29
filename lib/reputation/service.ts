import { createReviewDraft } from "@/lib/ai/provider";
import { enforceReplyPolicy } from "@/lib/ai/guard";
import { externalCallsAllowed } from "@/lib/env";
import { sanitizeProviderError } from "@/lib/format";
import { can } from "@/lib/auth/permissions";
import { fail, ok, type ServiceResult } from "@/lib/result";
import {
  addActivity,
  addApproval,
  addAudit,
  getClinic,
  getReview,
  getSuggestion,
  insertMemory,
  insertSuggestion,
  listSuggestions,
  loadMemory,
  setReviewState,
  setSuggestionStatus,
  supersedeOtherSuggestions,
  updateSuggestionBody,
} from "@/lib/db/store";
import { putReviewReply } from "@/lib/integrations/google";
import { googleAccessToken } from "@/lib/integrations/credentials";
import type { Actor } from "@/types/domain";

const missing = "Registro não encontrado nesta clínica.";

function denied(actor: Actor, permission: Parameters<typeof can>[1]): ServiceResult<never> | null {
  if (!can(actor.role, permission)) return fail("Seu perfil não pode fazer essa ação.", "forbidden");
  return null;
}

export async function generateSuggestion(actor: Actor, reviewId: string, fetchImpl?: typeof fetch) {
  const block = denied(actor, "edit_suggestion");
  if (block) return block;
  const review = getReview(actor.clinicId, reviewId);
  if (!review) return fail(missing, "not_found");
  if (review.replyState === "published") {
    return fail("Já existe uma resposta publicada e confirmada. Não criei outra sugestão.", "already_published");
  }
  const clinic = getClinic(actor.clinicId);
  if (!clinic) return fail(missing, "not_found");
  const memory = loadMemory(actor.clinicId);
  const draft = await createReviewDraft(
    {
      clinicName: clinic.name,
      phone: clinic.phone,
      authorName: review.authorName,
      rating: review.rating,
      comment: review.comment,
      memory,
    },
    fetchImpl,
  );
  const suggestionId = insertSuggestion({
    reviewId,
    clinicId: actor.clinicId,
    body: draft.body,
    modelLabel: draft.modelLabel,
    policyNotes: draft.policyNotes,
    appliedMemory: draft.applied,
    createdBy: actor.userId,
  });
  setReviewState(actor.clinicId, reviewId, { replyState: "suggestion_ready", publishError: null });
  addActivity({
    clinicId: actor.clinicId,
    kind: "action_required",
    actorType: "agent",
    actorKey: "bruno",
    actorLabel: "Dr. Bruno",
    title: `Sugestão preparada para ${review.authorName}`,
    detail: "O rascunho está pronto para revisão humana. Nenhuma resposta foi publicada.",
    subjectType: "review",
    subjectId: reviewId,
    result: "Sugestão local. Publicação não executada.",
  });
  addAudit({ clinicId: actor.clinicId, actorUserId: actor.userId, action: "suggestion.created", subjectType: "review", subjectId: reviewId });
  return ok("Sugestão preparada. Ela ainda não foi publicada.", { suggestionId });
}

export function editSuggestion(actor: Actor, input: { reviewId: string; suggestionId: string; body: string; remember: boolean }) {
  const block = denied(actor, "edit_suggestion");
  if (block) return block;
  const review = getReview(actor.clinicId, input.reviewId);
  const suggestion = getSuggestion(actor.clinicId, input.suggestionId);
  if (!review || !suggestion || suggestion.reviewId !== review.id) return fail(missing, "not_found");
  if (review.replyState === "published") return fail("A resposta já foi publicada e confirmada. A edição não altera o Google.", "already_published");
  const clinic = getClinic(actor.clinicId);
  if (!clinic) return fail(missing, "not_found");
  const memory = loadMemory(actor.clinicId);
  const checked = enforceReplyPolicy(input.body, {
    clinicName: clinic.name,
    phone: clinic.phone,
    authorName: review.authorName,
    rating: review.rating,
    comment: review.comment,
    memory,
  });
  if (!checked.ok) return fail("O texto foi recusado pela política de resposta. A sugestão anterior foi mantida.", "policy");
  updateSuggestionBody(actor.clinicId, suggestion.id, checked.body, checked.notes);
  setReviewState(actor.clinicId, review.id, { replyState: "suggestion_ready" });
  if (input.remember) {
    insertMemory(actor.clinicId, {
      kind: "approved_example",
      title: `Exemplo de ${review.authorName}`,
      body: checked.body.slice(0, 500),
      source: "user",
    });
  }
  addAudit({
    clinicId: actor.clinicId,
    actorUserId: actor.userId,
    action: input.remember ? "suggestion.edited_and_remembered" : "suggestion.edited",
    subjectType: "review",
    subjectId: review.id,
  });
  return ok(input.remember ? "Edição salva e guardada como exemplo para as próximas sugestões." : "Edição salva só nesta resposta.");
}

export function approveSuggestion(actor: Actor, reviewId: string, suggestionId: string) {
  const block = denied(actor, "approve");
  if (block) return block;
  const review = getReview(actor.clinicId, reviewId);
  const suggestion = getSuggestion(actor.clinicId, suggestionId);
  if (!review || !suggestion || suggestion.reviewId !== review.id) return fail(missing, "not_found");
  if (review.replyState === "published") return fail("Esta avaliação já tem publicação confirmada.", "already_published");
  setSuggestionStatus(actor.clinicId, suggestion.id, "approved");
  supersedeOtherSuggestions(actor.clinicId, review.id, suggestion.id);
  setReviewState(actor.clinicId, review.id, { replyState: "approved_pending_publish", publishError: null });
  addApproval({ clinicId: actor.clinicId, subjectType: "review_reply", subjectId: suggestion.id, decision: "approved", decidedBy: actor.userId });
  addActivity({
    clinicId: actor.clinicId,
    kind: "action_required",
    actorType: "user",
    actorKey: "user",
    actorLabel: actor.name,
    title: `Resposta aprovada para ${review.authorName}`,
    detail: "A aprovação não publica a resposta. A publicação é uma ação separada e só ocorre com integração ativa.",
    subjectType: "review",
    subjectId: review.id,
    result: "Aprovada localmente. Não publicada.",
  });
  addAudit({ clinicId: actor.clinicId, actorUserId: actor.userId, action: "suggestion.approved", subjectType: "review", subjectId: review.id });
  return ok("Resposta aprovada. Ela continua não publicada até a confirmação do Google.");
}

export function discardSuggestion(actor: Actor, reviewId: string, suggestionId: string) {
  const block = denied(actor, "edit_suggestion");
  if (block) return block;
  const review = getReview(actor.clinicId, reviewId);
  const suggestion = getSuggestion(actor.clinicId, suggestionId);
  if (!review || !suggestion || suggestion.reviewId !== review.id) return fail(missing, "not_found");
  if (review.replyState === "published") return fail("Não é possível descartar uma resposta já confirmada pelo Google.", "already_published");
  setSuggestionStatus(actor.clinicId, suggestion.id, "rejected");
  setReviewState(actor.clinicId, review.id, { replyState: "discarded" });
  addApproval({ clinicId: actor.clinicId, subjectType: "review_reply", subjectId: suggestion.id, decision: "rejected", decidedBy: actor.userId });
  addActivity({
    clinicId: actor.clinicId,
    kind: "info",
    actorType: "user",
    actorKey: "user",
    actorLabel: actor.name,
    title: `Sugestão descartada para ${review.authorName}`,
    detail: "Nenhuma resposta foi enviada ao Google.",
    subjectType: "review",
    subjectId: review.id,
    result: "Descartada localmente.",
  });
  return ok("Sugestão descartada. Nada foi publicado.");
}

export async function publishApprovedReply(actor: Actor, reviewId: string, fetchImpl: typeof fetch = fetch): Promise<ServiceResult> {
  const block = denied(actor, "publish");
  if (block) return block;
  const review = getReview(actor.clinicId, reviewId);
  if (!review) return fail(missing, "not_found");
  if (review.replyState === "published") {
    return ok("Esta resposta já estava confirmada como publicada. Nenhuma nova chamada foi feita.");
  }
  if (review.replyState !== "approved_pending_publish" && review.replyState !== "publish_failed") {
    return fail("A publicação só começa depois da aprovação humana.", "not_approved");
  }
  const approved = listSuggestions(actor.clinicId, review.id).find((item) => item.status === "approved");
  if (!approved) return fail("Não há uma sugestão aprovada para publicar.", "not_approved");

  if (!externalCallsAllowed()) {
    addActivity({
      clinicId: actor.clinicId,
      kind: "info",
      actorType: "system",
      actorKey: "bruno",
      actorLabel: "Dr. Bruno",
      title: `Publicação não executada para ${review.authorName}`,
      detail: "O ambiente é de demonstração. Nenhuma chamada foi feita ao Google. A resposta continua apenas aprovada.",
      subjectType: "review",
      subjectId: review.id,
      result: "Bloqueada pelo modo demonstração.",
    });
    return fail("Publicação não executada. Este ambiente é de demonstração e nenhuma chamada foi feita ao Google. A sugestão continua aprovada, mas não publicada.", "demonstration");
  }

  if (!review.providerResource) {
    return fail("Esta avaliação não tem identificador do Google. A publicação não foi tentada.", "missing_provider_id");
  }
  const token = await googleAccessToken(actor.clinicId, fetchImpl);
  if (!token.ok) return fail(token.message, token.code);

  const result = await putReviewReply({
    accessToken: token.accessToken,
    reviewName: review.providerResource,
    comment: approved.body,
    fetchImpl,
  });
  if (!result.ok) {
    const message = sanitizeProviderError(result.message);
    setReviewState(actor.clinicId, review.id, { replyState: "publish_failed", publishError: message });
    addActivity({
      clinicId: actor.clinicId,
      kind: "failure",
      actorType: "integration",
      actorKey: "integration",
      actorLabel: "Google Business Profile",
      title: `Falha ao publicar resposta de ${review.authorName}`,
      detail: message,
      subjectType: "review",
      subjectId: review.id,
      result: "A API não confirmou a publicação.",
    });
    return fail(`O Google não confirmou a publicação. ${message}`, "provider_error");
  }

  setReviewState(actor.clinicId, review.id, {
    replyState: "published",
    publishedReply: approved.body,
    publishedAt: result.updateTime,
    publishError: null,
  });
  addActivity({
    clinicId: actor.clinicId,
    kind: "info",
    actorType: "integration",
    actorKey: "integration",
    actorLabel: "Google Business Profile",
    title: `Resposta publicada para ${review.authorName}`,
    detail: "A API devolveu a resposta atualizada.",
    subjectType: "review",
    subjectId: review.id,
    result: "Publicação confirmada pela API do Google.",
  });
  addAudit({ clinicId: actor.clinicId, actorUserId: actor.userId, action: "review.published", subjectType: "review", subjectId: review.id });
  return ok("Publicação confirmada pela API do Google.");
}
