import { draftReviewReply, enforceReplyPolicy, SYSTEM_POLICY, untrustedDataBlock, type Draft, type DraftInput } from "@/lib/ai/guard";
import { externalCallsAllowed } from "@/lib/env";

export async function createReviewDraft(input: DraftInput, fetchImpl: typeof fetch = fetch): Promise<Draft> {
  const fallback = draftReviewReply(input);
  if (!externalCallsAllowed()) return fallback;
  const key = process.env.AI_API_KEY;
  const base = process.env.AI_BASE_URL;
  const model = process.env.AI_MODEL;
  if (!key || !base || !model) return fallback;

  try {
    const endpoint = `${base.replace(/\/$/, "")}/chat/completions`;
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM_POLICY },
          {
            role: "user",
            content: untrustedDataBlock({
              clinica: input.clinicName,
              telefone: input.phone,
              autor: input.authorName,
              nota: input.rating,
              comentario: input.comment,
              preferencias: input.memory,
            }),
          },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      return note(fallback, "O provedor de IA não respondeu com sucesso. O rascunho local foi mantido.");
    }
    const json = (await response.json()) as { choices?: Array<{ message?: { content?: unknown } }> };
    const text = json.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      return note(fallback, "O provedor de IA devolveu um formato inesperado. O rascunho local foi mantido.");
    }
    const checked = enforceReplyPolicy(text, input);
    if (!checked.ok) {
      return note(fallback, "A resposta do modelo foi recusada pela política. O rascunho local foi mantido.");
    }
    return {
      body: checked.body,
      modelLabel: model,
      applied: [...fallback.applied, "Texto do provedor de IA aceito após a política."],
      policyNotes: checked.notes,
    };
  } catch {
    return note(fallback, "Falha ao contatar o provedor de IA. O rascunho local foi mantido.");
  }
}

function note(draft: Draft, message: string): Draft {
  return { ...draft, policyNotes: [...draft.policyNotes, message] };
}
