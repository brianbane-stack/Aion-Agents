import "server-only";
import { externalCallsAllowed } from "@/lib/env";
import { nowIso } from "@/lib/format";
import { getIntegration, readIntegrationSecret, saveIntegrationSecret, updateIntegration } from "@/lib/db/store";
import { refreshGoogleToken } from "@/lib/integrations/google";

export type GoogleSecret = { accessToken?: string; refreshToken?: string; expiresAt?: string };
export type WhatsappSecret = { accessToken?: string; appSecret?: string; verifyToken?: string };

export async function googleAccessToken(clinicId: string, fetchImpl: typeof fetch = fetch) {
  if (!externalCallsAllowed()) {
    return { ok: false as const, message: "Ambiente de demonstração: o Google não foi consultado.", code: "demonstration" };
  }
  const integration = getIntegration(clinicId, "google_business");
  if (!integration || integration.status === "not_configured") {
    return { ok: false as const, message: "A integração com o Google não está configurada. Nenhuma chamada foi feita.", code: "not_configured" };
  }
  const secret = readIntegrationSecret<GoogleSecret>(integration.id) ?? {};
  if (!secret.accessToken && !secret.refreshToken) {
    return { ok: false as const, message: "Não há token do Google armazenado.", code: "not_configured" };
  }
  const expires = secret.expiresAt ? Date.parse(secret.expiresAt) : 0;
  if (secret.accessToken && expires > Date.now() + 60_000) {
    return { ok: true as const, accessToken: secret.accessToken, integration };
  }
  if (!secret.refreshToken) {
    updateIntegration(clinicId, "google_business", { status: "expired", lastError: "O acesso expirou e não há refresh token." });
    return { ok: false as const, message: "O acesso ao Google expirou. Conecte de novo.", code: "expired" };
  }
  const refreshed = await refreshGoogleToken(secret.refreshToken, fetchImpl);
  if (!refreshed.ok) {
    updateIntegration(clinicId, "google_business", { status: "expired", lastError: refreshed.message });
    return { ok: false as const, message: refreshed.message, code: "expired" };
  }
  saveIntegrationSecret(integration.id, { ...secret, accessToken: refreshed.accessToken, expiresAt: refreshed.expiresAt });
  updateIntegration(clinicId, "google_business", { status: "connected", lastError: null, lastSyncAt: nowIso() });
  return { ok: true as const, accessToken: refreshed.accessToken, integration };
}

export function whatsappCredentials(clinicId: string) {
  const integration = getIntegration(clinicId, "whatsapp_cloud");
  if (!integration) return { ok: false as const, message: "Integração de WhatsApp ausente.", code: "not_configured" };
  const secret = readIntegrationSecret<WhatsappSecret>(integration.id) ?? {};
  const phoneNumberId = String(integration.publicConfig.phoneNumberId || "");
  return { ok: true as const, integration, secret, phoneNumberId };
}
