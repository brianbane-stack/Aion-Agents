import { createHash } from "node:crypto";
import { externalCallsAllowed } from "@/lib/env";
import { addActivity, findMessageByProviderId, insertWebhookEvent, listIntegrationSecrets, updateMessageState } from "@/lib/db/store";
import { decryptSecret, safeEqual } from "@/lib/security/secrets";
import { verifyMetaSignature } from "@/lib/security/webhook";
import { nextMessageState } from "@/lib/messages/states";
import type { WhatsappSecret } from "@/lib/integrations/credentials";

type StatusName = "sent" | "delivered" | "read" | "failed";

type Payload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string };
        statuses?: Array<{ id?: string; status?: string; timestamp?: string }>;
        messages?: Array<{ id?: string; from?: string; timestamp?: string; text?: { body?: string }; context?: { id?: string } }>;
      };
    }>;
  }>;
};

function stamp(current: string | null, next: string) {
  return current || next;
}

export function webhookVerify(mode: string | null, token: string | null, challenge: string | null) {
  if (mode !== "subscribe" || !token || !challenge) return { ok: false as const, status: 400 };
  const secrets = listIntegrationSecrets();
  const matched = secrets.some((row) => {
    const secret = decryptSecret<WhatsappSecret>({ ciphertext: String(row.ciphertext), iv: String(row.iv), authTag: String(row.auth_tag) });
    return secret.verifyToken ? safeEqual(secret.verifyToken, token) : false;
  });
  if (!matched) return { ok: false as const, status: 403 };
  return { ok: true as const, challenge };
}

export function processWhatsappWebhook(rawBody: string, signature: string | null) {
  const secrets = listIntegrationSecrets().flatMap((row) => {
    const secret = decryptSecret<WhatsappSecret>({ ciphertext: String(row.ciphertext), iv: String(row.iv), authTag: String(row.auth_tag) });
    if (!secret.appSecret) return [];
    return [{ clinicId: String(row.clinic_id), appSecret: secret.appSecret, publicConfig: String(row.public_config_json) }];
  });
  if (!secrets.length) return { status: 503, body: { error: "webhook_not_configured" } };
  const matched = secrets.find((secret) => verifyMetaSignature(rawBody, signature, secret.appSecret));
  if (!matched) return { status: 401, body: { error: "invalid_signature" } };

  let payload: Payload;
  try {
    payload = JSON.parse(rawBody) as Payload;
  } catch {
    return { status: 400, body: { error: "invalid_json" } };
  }
  const hash = createHash("sha256").update(rawBody).digest("hex");
  let handled = 0;
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;
      const phoneNumberId = value.metadata?.phone_number_id;
      let clinicId = matched.clinicId;
      if (phoneNumberId) {
        const owner = secrets.find((secret) => {
          try {
            const config = JSON.parse(secret.publicConfig) as { phoneNumberId?: string };
            return config.phoneNumberId === phoneNumberId;
          } catch {
            return false;
          }
        });
        if (owner) clinicId = owner.clinicId;
      }
      for (const status of value.statuses ?? []) {
        if (!status.id || !status.status) continue;
        const externalId = `${status.id}:${status.status}:${status.timestamp || ""}`;
        const inserted = insertWebhookEvent({
          clinicId,
          provider: "whatsapp_cloud",
          externalEventId: externalId,
          payloadHash: hash,
          status: externalCallsAllowed() ? "processed" : "ignored_demonstration",
          summary: `status ${status.status}`,
        });
        if (inserted === "duplicate") continue;
        if (!externalCallsAllowed()) {
          addActivity({
            clinicId,
            kind: "info",
            actorType: "integration",
            actorKey: "integration",
            actorLabel: "WhatsApp Cloud API",
            title: "Webhook autêntico ignorado",
            detail: "Ambiente de demonstração. Nenhum estado de entrega foi alterado.",
            result: "Ignorado.",
          });
          continue;
        }
        const message = findMessageByProviderId(status.id);
        const incoming = status.status as StatusName;
        if (!message || !["sent", "delivered", "read", "failed"].includes(incoming)) continue;
        const next = nextMessageState(message.state, incoming);
        if (!next) continue;
        const when = status.timestamp ? new Date(Number(status.timestamp) * 1000).toISOString() : new Date().toISOString();
        updateMessageState(message.clinicId, message.id, {
          state: next,
          runStatus: next === "failed" ? "failed" : next === "delivered" || next === "read" ? "completed" : message.runStatus,
          sentAt: incoming === "sent" ? stamp(message.sentAt, when) : message.sentAt,
          deliveredAt: incoming === "delivered" ? stamp(message.deliveredAt, when) : message.deliveredAt,
          readAt: incoming === "read" ? stamp(message.readAt, when) : message.readAt,
          lastError: incoming === "failed" ? "O provedor informou falha depois do aceite." : null,
          reason: `Webhook ${incoming}.`,
        });
        addActivity({
          clinicId: message.clinicId,
          kind: incoming === "failed" ? "failure" : "info",
          actorType: "integration",
          actorKey: "integration",
          actorLabel: "WhatsApp Cloud API",
          title: `Estado atualizado: ${incoming}`,
          detail: "Atualização vinda de webhook assinado. O conteúdo da mensagem não foi copiado para o histórico.",
          subjectType: "message",
          subjectId: message.id,
          result: incoming === "delivered" || incoming === "read" ? "Confirmação do provedor." : "Evento do provedor registrado.",
        });
        handled += 1;
      }
      for (const inbound of value.messages ?? []) {
        if (!inbound.context?.id) continue;
        const externalId = `inbound:${inbound.id || inbound.context.id}:${inbound.timestamp || ""}`;
        const inserted = insertWebhookEvent({
          clinicId,
          provider: "whatsapp_cloud",
          externalEventId: externalId,
          payloadHash: hash,
          status: externalCallsAllowed() ? "processed" : "ignored_demonstration",
          summary: "mensagem recebida vinculada",
        });
        if (inserted === "duplicate" || !externalCallsAllowed()) continue;
        const message = findMessageByProviderId(inbound.context.id);
        if (!message) continue;
        const next = nextMessageState(message.state, "replied");
        if (!next) continue;
        const excerpt = (inbound.text?.body || "").replace(/[\u0000-\u001F]/g, " ").trim().slice(0, 400);
        updateMessageState(message.clinicId, message.id, {
          state: "replied",
          runStatus: "completed",
          repliedAt: new Date().toISOString(),
          inboundExcerpt: excerpt,
          reason: "Mensagem recebida com contexto do envio.",
        });
        addActivity({
          clinicId: message.clinicId,
          kind: "info",
          actorType: "integration",
          actorKey: "integration",
          actorLabel: "WhatsApp Cloud API",
          title: "Mensagem recebida relacionada a um envio",
          detail: "O conteúdo fica apenas no registro da mensagem, visível para a equipe da clínica.",
          subjectType: "message",
          subjectId: message.id,
          result: "Resposta vinculada pelo identificador de contexto.",
        });
        handled += 1;
      }
    }
  }
  return { status: 200, body: { received: true, handled } };
}
