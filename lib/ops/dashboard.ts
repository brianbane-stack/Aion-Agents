import { averageRating, estimateMinutesSaved, meanResponseHours, ratingDistribution, recurringThemes, TIME_SAVED_METHOD } from "@/lib/reputation/insights";
import { AUTONOMY_LABEL, MESSAGE_STATE_LABEL, REVIEW_STATE_LABEL } from "@/lib/labels";
import { listActivity, listAgents, listIntegrations, listMessages, listReviews, listWorkflows } from "@/lib/db/store";

const OPEN_REVIEWS = new Set(["unanswered", "suggestion_ready", "approved_pending_publish", "publish_failed"]);
const OPEN_MESSAGES = new Set(["awaiting_approval", "approved", "failed"]);

export function clinicOperations(clinicId: string) {
  const reviews = listReviews(clinicId);
  const messages = listMessages(clinicId);
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const periodReviews = reviews.filter((review) => Date.parse(review.reviewedAt) >= since);
  const counts = (rows: Array<{ sourceMode: string }>) => ({
    demonstration: rows.filter((row) => row.sourceMode === "demonstration").length,
    provider: rows.filter((row) => row.sourceMode === "provider").length,
  });
  const published = periodReviews.filter((review) => review.replyState === "published");
  const tasks = [
    ...reviews
      .filter((review) => OPEN_REVIEWS.has(review.replyState))
      .map((review) => ({
        id: review.id,
        href: `/reputacao/${review.id}`,
        title: `${review.authorName} · ${review.rating} de 5`,
        detail: REVIEW_STATE_LABEL[review.replyState],
        tone: review.replyState === "publish_failed" ? "danger" : "progress",
        at: review.reviewedAt,
      })),
    ...messages
      .filter((message) => OPEN_MESSAGES.has(message.state))
      .map((message) => ({
        id: message.id,
        href: `/pos-consulta/${message.workflowId}`,
        title: message.contactName,
        detail: MESSAGE_STATE_LABEL[message.state],
        tone: message.state === "failed" ? "danger" : "progress",
        at: message.createdAt,
      })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  const next = tasks[0];
  return {
    agents: listAgents(clinicId),
    workflows: listWorkflows(clinicId).map((workflow) => ({
      ...workflow,
      autonomyLabel: AUTONOMY_LABEL[workflow.autonomy],
    })),
    integrations: listIntegrations(clinicId),
    tasks,
    nextAction: next ? { href: next.href, title: next.title, reason: next.detail } : null,
    activity: listActivity(clinicId).slice(0, 6),
    metrics: {
      periodLabel: "Últimos 30 dias, a partir da data da avaliação armazenada.",
      sourceLabel: "Fonte: registros desta clínica no banco local. Registros de demonstração não vêm do Google nem da Meta.",
      reviews: counts(periodReviews),
      averageRating: averageRating(periodReviews.map((review) => review.rating)),
      unanswered: periodReviews.filter((review) => review.replyState === "unanswered" || review.replyState === "suggestion_ready").length,
      published: published.length,
      responseHours: meanResponseHours(periodReviews.map((review) => ({ reviewedAt: review.reviewedAt, publishedAt: review.publishedAt }))),
      distribution: ratingDistribution(periodReviews.map((review) => review.rating)),
      messagesPrepared: messages.filter((message) => Date.parse(message.createdAt) >= since).length,
      messagesAccepted: messages.filter((message) => message.acceptedAt && Date.parse(message.acceptedAt) >= since).length,
      messagesDelivered: messages.filter((message) => message.deliveredAt && Date.parse(message.deliveredAt) >= since).length,
      messagesFailed: messages.filter((message) => message.state === "failed").length,
    },
  };
}

export function valueReport(clinicId: string) {
  const reviews = listReviews(clinicId);
  const messages = listMessages(clinicId);
  const published = reviews.filter((review) => review.replyState === "published").length;
  const delivered = messages.filter((message) => message.state === "delivered" || message.state === "read" || message.state === "replied").length;
  const accepted = messages.filter((message) => message.acceptedAt).length;
  const themes = recurringThemes(reviews.map((review) => review.comment));
  return {
    processedReviews: reviews.length,
    preparedReplies: reviews.filter((review) => review.replyState !== "unanswered").length,
    approvedUnpublished: reviews.filter((review) => review.replyState === "approved_pending_publish").length,
    published,
    responseHours: meanResponseHours(reviews.map((review) => ({ reviewedAt: review.reviewedAt, publishedAt: review.publishedAt }))),
    messagesAccepted: accepted,
    messagesDelivered: delivered,
    failures: messages.filter((message) => message.state === "failed").length + reviews.filter((review) => review.replyState === "publish_failed").length,
    humanTouches: listActivity(clinicId).filter((event) => event.actorKey === "user").length,
    minutesSaved: estimateMinutesSaved(published, delivered),
    method: TIME_SAVED_METHOD,
    themes,
    themeNote: themes.length
      ? "Termos que aparecem em pelo menos duas avaliações armazenadas, depois de remover palavras muito comuns. Isso é contagem, não uma causa."
      : "Ainda não há comentários suficientes para observar temas recorrentes. O mínimo usado aqui é quatro avaliações com texto.",
    limits: "Atividade não é resultado. Envio aceito não é entrega. Avaliação recebida não prova efeito da automação.",
  };
}

export function exportClinic(clinicId: string) {
  const operations = clinicOperations(clinicId);
  return {
    clinicId,
    exportedAt: new Date().toISOString(),
    reviews: listReviews(clinicId).map((review) => ({
      id: review.id,
      authorName: review.authorName,
      rating: review.rating,
      comment: review.comment,
      replyState: review.replyState,
      sourceMode: review.sourceMode,
      publishedAt: review.publishedAt,
    })),
    messages: listMessages(clinicId).map((message) => ({
      id: message.id,
      contactName: message.contactName,
      state: message.state,
      sourceMode: message.sourceMode,
      acceptedAt: message.acceptedAt,
      deliveredAt: message.deliveredAt,
    })),
    activity: operations.activity,
  };
}
