"use client";

import { saveReply } from "@/features/work/actions";
import { BoundForm } from "@/components/forms/bound-form";
import { SubmitButton } from "@/components/ui/submit-button";

export function ReplyEditor({
  reviewId,
  suggestionId,
  body,
}: {
  reviewId: string;
  suggestionId: string;
  body: string;
}) {
  return (
    <BoundForm key={suggestionId} action={saveReply} className="space-y-4">
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="suggestionId" value={suggestionId} />
      <label className="block text-sm font-semibold" htmlFor="body">
        Texto da resposta
        <textarea id="body" name="body" defaultValue={body} rows={9} className="field mt-2 min-h-48 leading-7" />
      </label>
      <label className="flex items-start gap-3 text-sm leading-6">
        <input type="checkbox" name="remember" className="mt-1 size-4" />
        <span>Guardar esta versão como exemplo para sugestões futuras. Sem marcar, a edição vale só para esta avaliação.</span>
      </label>
      <SubmitButton pendingLabel="Salvando…">Salvar edição</SubmitButton>
    </BoundForm>
  );
}
