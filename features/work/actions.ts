"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOnboarded, requireUser } from "@/lib/auth/guard";
import { approveSuggestion, discardSuggestion, editSuggestion, generateSuggestion, publishApprovedReply } from "@/lib/reputation/service";
import { approveMessage, changeConsent, executeApprovedInWorkflow, executeMessage, prepareEligible, saveWorkflow, setAgentPaused, setWorkflowPaused } from "@/lib/postvisit/service";
import { addMemory, changeRole, completeOnboarding, removeMemory, saveClinic, toggleMemory } from "@/lib/settings/service";
import { disconnectIntegration, loadGoogleLocations, saveWhatsappConfig, selectGoogleLocation, syncGoogleReviews, testWhatsapp } from "@/lib/integrations/service";
import { oldestOpenReview, searchClinic } from "@/lib/db/store";
import { clinicSchema, linesToList, memorySchema, roleSchema, whatsappConfigSchema, workflowSchema } from "@/lib/validation/schemas";
import type { ActionState } from "@/features/action-state";

function done(path: string, result: { ok: boolean; message: string }): ActionState {
  revalidatePath(path);
  revalidatePath("/hoje");
  revalidatePath("/atividade");
  return result;
}

export async function generateReply(formData: FormData) {
  const actor = await requireOnboarded();
  const reviewId = String(formData.get("reviewId") || "");
  const result = await generateSuggestion(actor, reviewId);
  revalidatePath(`/reputacao/${reviewId}`);
  revalidatePath("/hoje");
  redirect(`/reputacao/${reviewId}?aviso=${encodeURIComponent(result.message)}`);
}

export async function saveReply(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireOnboarded();
  const reviewId = String(formData.get("reviewId") || "");
  const result = editSuggestion(actor, {
    reviewId,
    suggestionId: String(formData.get("suggestionId") || ""),
    body: String(formData.get("body") || ""),
    remember: formData.get("remember") === "on",
  });
  return done(`/reputacao/${reviewId}`, result);
}

export async function approveReply(formData: FormData) {
  const actor = await requireOnboarded();
  const reviewId = String(formData.get("reviewId") || "");
  const result = approveSuggestion(actor, reviewId, String(formData.get("suggestionId") || ""));
  revalidatePath(`/reputacao/${reviewId}`);
  revalidatePath("/hoje");
  redirect(`/reputacao/${reviewId}?aviso=${encodeURIComponent(result.message)}`);
}

export async function discardReply(formData: FormData) {
  const actor = await requireOnboarded();
  const reviewId = String(formData.get("reviewId") || "");
  const result = discardSuggestion(actor, reviewId, String(formData.get("suggestionId") || ""));
  revalidatePath(`/reputacao/${reviewId}`);
  redirect(`/reputacao/${reviewId}?aviso=${encodeURIComponent(result.message)}`);
}

export async function publishReply(formData: FormData) {
  const actor = await requireOnboarded();
  const reviewId = String(formData.get("reviewId") || "");
  const result = await publishApprovedReply(actor, reviewId);
  revalidatePath(`/reputacao/${reviewId}`);
  revalidatePath("/resultados");
  redirect(`/reputacao/${reviewId}?aviso=${encodeURIComponent(result.message)}`);
}

export async function saveWorkflowAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireOnboarded();
  const parsed = workflowSchema.safeParse({
    workflowId: String(formData.get("workflowId") || ""),
    waitHours: Number(formData.get("waitHours")),
    maxAttempts: Number(formData.get("maxAttempts")),
    autonomy: formData.get("autonomy"),
    templateBody: String(formData.get("templateBody") || ""),
    providerTemplateName: String(formData.get("providerTemplateName") || ""),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message || "Revise as regras." };
  const result = saveWorkflow(actor, parsed.data);
  return done(`/pos-consulta/${parsed.data.workflowId}`, result);
}

export async function pauseWorkflow(formData: FormData) {
  const actor = await requireOnboarded();
  const id = String(formData.get("workflowId") || "");
  const result = setWorkflowPaused(actor, id, formData.get("paused") === "1");
  revalidatePath(`/pos-consulta/${id}`);
  redirect(`/pos-consulta/${id}?aviso=${encodeURIComponent(result.message)}`);
}

export async function prepareWorkflow(formData: FormData) {
  const actor = await requireOnboarded();
  const id = String(formData.get("workflowId") || "");
  const result = prepareEligible(actor, id);
  revalidatePath(`/pos-consulta/${id}`);
  redirect(`/pos-consulta/${id}?aviso=${encodeURIComponent(result.message)}`);
}

export async function approveOutbound(formData: FormData) {
  const actor = await requireOnboarded();
  const workflowId = String(formData.get("workflowId") || "");
  const result = approveMessage(actor, String(formData.get("messageId") || ""));
  revalidatePath(`/pos-consulta/${workflowId}`);
  redirect(`/pos-consulta/${workflowId}?aviso=${encodeURIComponent(result.message)}`);
}

export async function executeOutbound(formData: FormData) {
  const actor = await requireOnboarded();
  const workflowId = String(formData.get("workflowId") || "");
  const result = await executeMessage(actor, String(formData.get("messageId") || ""));
  revalidatePath(`/pos-consulta/${workflowId}`);
  revalidatePath("/resultados");
  redirect(`/pos-consulta/${workflowId}?aviso=${encodeURIComponent(result.message)}`);
}

export async function executeWorkflow(formData: FormData) {
  const actor = await requireOnboarded();
  const id = String(formData.get("workflowId") || "");
  const result = await executeApprovedInWorkflow(actor, id);
  revalidatePath(`/pos-consulta/${id}`);
  redirect(`/pos-consulta/${id}?aviso=${encodeURIComponent(result.message)}`);
}

export async function updateConsent(formData: FormData) {
  const actor = await requireOnboarded();
  const workflowId = String(formData.get("workflowId") || "");
  const status = String(formData.get("status") || "");
  if (status !== "opted_in" && status !== "opted_out" && status !== "unknown") {
    redirect(`/pos-consulta/${workflowId}?aviso=${encodeURIComponent("Consentimento inválido.")}`);
  }
  const result = changeConsent(actor, String(formData.get("contactId") || ""), status);
  revalidatePath(`/pos-consulta/${workflowId}`);
  redirect(`/pos-consulta/${workflowId}?aviso=${encodeURIComponent(result.message)}`);
}

export async function pauseAgent(formData: FormData) {
  const actor = await requireOnboarded();
  const key = formData.get("key") === "lucas" ? "lucas" : "bruno";
  const result = setAgentPaused(actor, key, formData.get("paused") === "1");
  revalidatePath("/configuracoes/agentes");
  revalidatePath("/hoje");
  redirect(`/configuracoes/agentes?aviso=${encodeURIComponent(result.message)}`);
}

export async function saveClinicAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser();
  const parsed = clinicSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email") || "",
    address: formData.get("address") || "",
    city: formData.get("city") || "",
    state: formData.get("state") || "",
    technicalManager: formData.get("technicalManager") || "",
    crmv: formData.get("crmv") || "",
    formality: formData.get("formality"),
    emojiPolicy: formData.get("emojiPolicy"),
    signOff: formData.get("signOff") || "",
    preferredPhrases: linesToList(String(formData.get("preferredPhrases") || "")),
    avoidedPhrases: linesToList(String(formData.get("avoidedPhrases") || "")),
    communicationRules: formData.get("communicationRules") || "",
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message || "Revise os campos." };
  const finishing = formData.get("onboarding") === "1";
  const result = finishing ? completeOnboarding(actor, parsed.data) : saveClinic(actor, parsed.data);
  if (!result.ok) return result;
  revalidatePath("/configuracoes");
  revalidatePath("/hoje");
  if (finishing) {
    const reviewId = oldestOpenReview(actor.clinicId);
    redirect(reviewId ? `/reputacao/${reviewId}` : "/hoje");
  }
  return result;
}

export async function addMemoryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireOnboarded();
  const parsed = memorySchema.safeParse({
    kind: formData.get("kind"),
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message || "Revise a memória." };
  const result = addMemory(actor, parsed.data);
  return done("/configuracoes/memoria", result);
}

export async function toggleMemoryAction(formData: FormData) {
  const actor = await requireOnboarded();
  const result = toggleMemory(actor, String(formData.get("id") || ""), formData.get("active") === "1");
  revalidatePath("/configuracoes/memoria");
  redirect(`/configuracoes/memoria?aviso=${encodeURIComponent(result.message)}`);
}

export async function deleteMemoryAction(formData: FormData) {
  const actor = await requireOnboarded();
  const result = removeMemory(actor, String(formData.get("id") || ""));
  revalidatePath("/configuracoes/memoria");
  redirect(`/configuracoes/memoria?aviso=${encodeURIComponent(result.message)}`);
}

export async function changeRoleAction(formData: FormData) {
  const actor = await requireOnboarded();
  const parsed = roleSchema.safeParse({ membershipId: formData.get("membershipId"), role: formData.get("role") });
  const result = parsed.success ? changeRole(actor, parsed.data.membershipId, parsed.data.role) : { ok: false, message: "Permissão inválida." };
  revalidatePath("/configuracoes/equipe");
  redirect(`/configuracoes/equipe?aviso=${encodeURIComponent(result.message)}`);
}

export async function saveWhatsappAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireOnboarded();
  const parsed = whatsappConfigSchema.safeParse({
    phoneNumberId: String(formData.get("phoneNumberId") || ""),
    wabaId: String(formData.get("wabaId") || ""),
    accessToken: String(formData.get("accessToken") || ""),
    appSecret: String(formData.get("appSecret") || ""),
    verifyToken: String(formData.get("verifyToken") || ""),
    clearAccessToken: formData.get("clearAccessToken") === "on",
    clearAppSecret: formData.get("clearAppSecret") === "on",
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message || "Revise a configuração." };
  const result = await saveWhatsappConfig(actor, parsed.data);
  return done("/integracoes/whatsapp_cloud", result);
}

export async function testWhatsappAction() {
  const actor = await requireOnboarded();
  const result = await testWhatsapp(actor);
  revalidatePath("/integracoes/whatsapp_cloud");
  redirect(`/integracoes/whatsapp_cloud?aviso=${encodeURIComponent(result.message)}`);
}

export async function syncGoogleAction() {
  const actor = await requireOnboarded();
  const result = await syncGoogleReviews(actor);
  revalidatePath("/reputacao");
  revalidatePath("/integracoes/google_business");
  redirect(`/integracoes/google_business?aviso=${encodeURIComponent(result.message)}`);
}

export async function disconnectAction(formData: FormData) {
  const actor = await requireOnboarded();
  const provider = formData.get("provider") === "whatsapp_cloud" ? "whatsapp_cloud" : "google_business";
  const result = await disconnectIntegration(actor, provider);
  revalidatePath(`/integracoes/${provider}`);
  redirect(`/integracoes/${provider}?aviso=${encodeURIComponent(result.message)}`);
}

export async function chooseLocation(formData: FormData) {
  const actor = await requireOnboarded();
  const result = await selectGoogleLocation(actor, String(formData.get("resource") || ""), String(formData.get("title") || ""));
  revalidatePath("/integracoes/google_business");
  redirect(`/integracoes/google_business?aviso=${encodeURIComponent(result.message)}`);
}

export async function searchRecords(query: string) {
  const actor = await requireUser();
  const trimmed = query.trim();
  if (trimmed.length < 2) return { reviews: [], contacts: [], workflows: [] };
  return searchClinic(actor.clinicId, trimmed);
}

export async function listLocationsAction() {
  const actor = await requireOnboarded();
  return loadGoogleLocations(actor);
}
