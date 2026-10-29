import { can } from "@/lib/auth/permissions";
import { externalCallsAllowed } from "@/lib/env";
import { nowIso, sanitizeProviderError } from "@/lib/format";
import { fail, ok } from "@/lib/result";
import {
  addActivity,
  addAudit,
  clearIntegrationSecret,
  getIntegration,
  readIntegrationSecret,
  saveIntegrationSecret,
  updateIntegration,
  upsertProviderReview,
} from "@/lib/db/store";
import { googleAccessToken, type GoogleSecret, type WhatsappSecret } from "@/lib/integrations/credentials";
import { listAllGoogleReviews, listGoogleAccounts, listGoogleLocations } from "@/lib/integrations/google";
import { readWhatsappNumber } from "@/lib/integrations/whatsapp";
import type { Actor } from "@/types/domain";

function denied(actor: Actor) {
  if (!can(actor.role, "manage_integrations")) return fail("Seu perfil não pode fazer essa ação.", "forbidden");
  return null;
}

export async function syncGoogleReviews(actor: Actor, fetchImpl: typeof fetch = fetch) {
  const block = denied(actor);
  if (block) return block;
  if (!externalCallsAllowed()) {
    return fail("Ambiente de demonstração. Nenhuma consulta foi feita ao Google.", "demonstration");
  }
  const token = await googleAccessToken(actor.clinicId, fetchImpl);
  if (!token.ok) return fail(token.message, token.code);
  const integration = token.integration;
  if (!integration.locationResource) {
    return fail("Nenhum local do Google foi selecionado. A lista de avaliações não foi consultada.", "missing_location");
  }
  const listed = await listAllGoogleReviews(token.accessToken, integration.locationResource, fetchImpl);
  if (!listed.ok) {
    updateIntegration(actor.clinicId, "google_business", { status: "error", lastError: listed.message });
    return fail(listed.message, "provider_error");
  }
  let created = 0;
  for (const review of listed.reviews) {
    const saved = upsertProviderReview({
      clinicId: actor.clinicId,
      externalId: review.reviewId,
      providerResource: review.name,
      authorName: review.authorName,
      rating: review.rating,
      comment: review.comment,
      reviewedAt: review.createTime,
      replyComment: review.replyComment,
      replyUpdatedAt: review.replyUpdateTime,
    });
    if (saved.created) created += 1;
  }
  updateIntegration(actor.clinicId, "google_business", { status: "connected", lastSyncAt: nowIso(), lastError: null });
  addActivity({
    clinicId: actor.clinicId,
    kind: "info",
    actorType: "integration",
    actorKey: "integration",
    actorLabel: "Google Business Profile",
    title: "Avaliações sincronizadas",
    detail: `${listed.reviews.length} avaliação(ões) lidas. ${created} nova(s) gravada(s).`,
    result: "Consulta confirmada pela API.",
  });
  return ok(`${listed.reviews.length} avaliação(ões) lidas do Google. ${created} nova(s).`);
}

export async function selectGoogleLocation(actor: Actor, resource: string, title: string, fetchImpl: typeof fetch = fetch) {
  const block = denied(actor);
  if (block) return block;
  const token = await googleAccessToken(actor.clinicId, fetchImpl);
  if (!token.ok) return fail(token.message, token.code);
  updateIntegration(actor.clinicId, "google_business", { locationResource: resource, locationTitle: title, status: "connected", lastError: null });
  addAudit({ clinicId: actor.clinicId, actorUserId: actor.userId, action: "integration.location", subjectType: "integration", subjectId: "google_business" });
  return ok(`Local selecionado: ${title}.`);
}

export async function loadGoogleLocations(actor: Actor, fetchImpl: typeof fetch = fetch) {
  const block = denied(actor);
  if (block) return block;
  const token = await googleAccessToken(actor.clinicId, fetchImpl);
  if (!token.ok) return { ...token, locations: [] as Array<{ resource: string; title: string }> };
  const accounts = await listGoogleAccounts(token.accessToken, fetchImpl);
  if (!accounts.ok) return fail(accounts.message, "provider_error");
  const locations = [];
  for (const account of accounts.accounts) {
    const listed = await listGoogleLocations(token.accessToken, account.name, fetchImpl);
    if (listed.ok) locations.push(...listed.locations);
  }
  if (!locations.length) return fail("Nenhum local autorizado foi devolvido pelo Google.", "empty");
  return ok("Locais autorizados carregados.", { locations });
}

export async function saveWhatsappConfig(actor: Actor, input: {
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  appSecret: string;
  verifyToken: string;
  clearAccessToken: boolean;
  clearAppSecret: boolean;
}) {
  const block = denied(actor);
  if (block) return block;
  const integration = getIntegration(actor.clinicId, "whatsapp_cloud");
  if (!integration) return fail("Integração ausente.", "not_found");
  const current = readIntegrationSecret<WhatsappSecret>(integration.id) ?? {};
  const next: WhatsappSecret = {
    accessToken: input.clearAccessToken ? undefined : input.accessToken.trim() || current.accessToken,
    appSecret: input.clearAppSecret ? undefined : input.appSecret.trim() || current.appSecret,
    verifyToken: input.verifyToken.trim() || current.verifyToken,
  };
  if (next.accessToken || next.appSecret || next.verifyToken) saveIntegrationSecret(integration.id, next);
  else clearIntegrationSecret(integration.id);
  const hasAny = Boolean(input.phoneNumberId || next.accessToken);
  updateIntegration(actor.clinicId, "whatsapp_cloud", {
    status: hasAny ? "credentials_stored" : "not_configured",
    externalAccountId: input.wabaId || null,
    publicConfig: {
      phoneNumberId: input.phoneNumberId,
      wabaId: input.wabaId,
      hasAccessToken: Boolean(next.accessToken),
      hasAppSecret: Boolean(next.appSecret),
      hasVerifyToken: Boolean(next.verifyToken),
    },
    lastError: null,
  });
  addAudit({ clinicId: actor.clinicId, actorUserId: actor.userId, action: "integration.whatsapp_saved", subjectType: "integration", subjectId: integration.id });
  return ok("Configuração salva. O teste de conexão ainda não foi feito.");
}

export async function testWhatsapp(actor: Actor, fetchImpl: typeof fetch = fetch) {
  const block = denied(actor);
  if (block) return block;
  if (!externalCallsAllowed()) return fail("Ambiente de demonstração. A conexão não foi testada com a Meta.", "demonstration");
  const integration = getIntegration(actor.clinicId, "whatsapp_cloud");
  if (!integration) return fail("Integração ausente.", "not_found");
  const secret = readIntegrationSecret<WhatsappSecret>(integration.id) ?? {};
  const phoneNumberId = String(integration.publicConfig.phoneNumberId || "");
  if (!secret.accessToken || !phoneNumberId) return fail("Informe o identificador do número e o token antes de testar. Nenhuma chamada foi feita.", "not_configured");
  const result = await readWhatsappNumber({ accessToken: secret.accessToken, phoneNumberId, fetchImpl });
  if (!result.ok) {
    updateIntegration(actor.clinicId, "whatsapp_cloud", { status: "error", lastError: sanitizeProviderError(result.message) });
    return fail(result.message, "provider_error");
  }
  updateIntegration(actor.clinicId, "whatsapp_cloud", {
    status: "connected",
    locationTitle: result.verifiedName || result.displayPhone,
    lastSyncAt: nowIso(),
    lastError: null,
    publicConfig: { ...integration.publicConfig, hasAccessToken: true },
  });
  return ok(`Conexão confirmada${result.verifiedName ? ` para ${result.verifiedName}` : ""}.`);
}

export async function disconnectIntegration(actor: Actor, provider: "google_business" | "whatsapp_cloud", fetchImpl: typeof fetch = fetch) {
  const block = denied(actor);
  if (block) return block;
  const integration = getIntegration(actor.clinicId, provider);
  if (!integration) return fail("Integração ausente.", "not_found");
  let revokeNote = "Credenciais locais removidas.";
  if (provider === "google_business" && externalCallsAllowed()) {
    const secret = readIntegrationSecret<GoogleSecret>(integration.id);
    const token = secret?.refreshToken || secret?.accessToken;
    if (token) {
      try {
        const response = await fetchImpl("https://oauth2.googleapis.com/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token }),
          signal: AbortSignal.timeout(15_000),
        });
        revokeNote = response.ok ? "Credenciais locais removidas e token revogado no Google." : "Credenciais locais removidas. A revogação no Google não foi confirmada.";
      } catch {
        revokeNote = "Credenciais locais removidas. A revogação no Google não foi confirmada.";
      }
    }
  }
  clearIntegrationSecret(integration.id);
  updateIntegration(actor.clinicId, provider, {
    status: "not_configured",
    externalAccountId: null,
    locationResource: null,
    locationTitle: null,
    lastError: null,
    lastSyncAt: null,
    scopes: "",
    publicConfig: {},
  });
  addActivity({
    clinicId: actor.clinicId,
    kind: "info",
    actorType: "user",
    actorKey: "user",
    actorLabel: actor.name,
    title: provider === "google_business" ? "Google desconectado" : "WhatsApp desconectado",
    detail: revokeNote,
    result: "Integração local removida.",
  });
  return ok(revokeNote);
}

export async function storeGoogleTokens(clinicId: string, secret: GoogleSecret, accountId: string | null) {
  const integration = getIntegration(clinicId, "google_business");
  if (!integration) return;
  const previous = readIntegrationSecret<GoogleSecret>(integration.id) ?? {};
  saveIntegrationSecret(integration.id, { ...previous, ...secret, refreshToken: secret.refreshToken || previous.refreshToken });
  updateIntegration(clinicId, "google_business", {
    status: "credentials_stored",
    externalAccountId: accountId,
    scopes: "https://www.googleapis.com/auth/business.manage",
    lastError: null,
  });
}
