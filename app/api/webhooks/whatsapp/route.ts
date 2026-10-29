import { processWhatsappWebhook, webhookVerify } from "@/lib/integrations/whatsapp-events";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = webhookVerify(url.searchParams.get("hub.mode"), url.searchParams.get("hub.verify_token"), url.searchParams.get("hub.challenge"));
  if (!result.ok) return new Response("verificação recusada", { status: result.status });
  return new Response(result.challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
}

export async function POST(request: Request) {
  const raw = await request.text();
  const result = processWhatsappWebhook(raw, request.headers.get("x-hub-signature-256"));
  return Response.json(result.body, { status: result.status });
}
