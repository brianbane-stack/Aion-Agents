import { graphApiVersion } from "@/lib/env";
import { sanitizeProviderError } from "@/lib/format";

export async function sendWhatsappTemplate(input: {
  accessToken: string;
  phoneNumberId: string;
  to: string;
  templateName: string;
  language: string;
  parameters: string[];
  fetchImpl?: typeof fetch;
}) {
  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: input.to.replace(/^\+/, ""),
    type: "template",
    template: {
      name: input.templateName,
      language: { code: input.language || "pt_BR" },
      ...(input.parameters.length
        ? { components: [{ type: "body", parameters: input.parameters.map((text) => ({ type: "text", text })) }] }
        : {}),
    },
  };
  try {
    const response = await (input.fetchImpl ?? fetch)(
      `https://graph.facebook.com/${graphApiVersion()}/${input.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      },
    );
    const json = (await response.json()) as { messages?: Array<{ id?: string }>; error?: { message?: string } };
    if (!response.ok || !json.messages?.[0]?.id) {
      return { ok: false as const, message: sanitizeProviderError(json.error?.message || `HTTP ${response.status}`) };
    }
    return { ok: true as const, providerMessageId: json.messages[0].id };
  } catch {
    return { ok: false as const, message: "Não foi possível contatar a API do WhatsApp." };
  }
}

export async function readWhatsappNumber(input: { accessToken: string; phoneNumberId: string; fetchImpl?: typeof fetch }) {
  try {
    const response = await (input.fetchImpl ?? fetch)(
      `https://graph.facebook.com/${graphApiVersion()}/${input.phoneNumberId}?fields=display_phone_number,verified_name`,
      {
        headers: { Authorization: `Bearer ${input.accessToken}` },
        signal: AbortSignal.timeout(15_000),
      },
    );
    const json = (await response.json()) as { display_phone_number?: string; verified_name?: string; error?: { message?: string } };
    if (!response.ok) return { ok: false as const, message: sanitizeProviderError(json.error?.message || `HTTP ${response.status}`) };
    return { ok: true as const, displayPhone: json.display_phone_number || "", verifiedName: json.verified_name || "" };
  } catch {
    return { ok: false as const, message: "Não foi possível contatar a API do WhatsApp." };
  }
}
