import Link from "next/link";
import { notFound } from "next/navigation";
import { can } from "@/lib/auth/permissions";
import { requireOnboarded } from "@/lib/auth/guard";
import { getReview, listApprovals, listSuggestions } from "@/lib/db/store";
import { REVIEW_STATE_LABEL } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import { approveReply, discardReply, generateReply, publishReply } from "@/features/work/actions";
import { PageHeader } from "@/components/page-header";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { ReplyEditor } from "@/components/reputation/reply-editor";

export const metadata = { title: "Avaliação" };

export default async function ReviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireOnboarded();
  const { id } = await params;
  const query = await searchParams;
  const review = getReview(actor.clinicId, id);
  if (!review) notFound();
  const suggestions = listSuggestions(actor.clinicId, review.id);
  const current = suggestions.find((item) => item.status === "approved" || item.status === "edited" || item.status === "draft") || suggestions[0];
  const approvals = current ? listApprovals(actor.clinicId, current.id) : [];
  const back = query.lista ? `/reputacao?${query.lista}` : "/reputacao";
  const canEdit = can(actor.role, "edit_suggestion");
  const canApprove = can(actor.role, "approve");
  return (
    <>
      <Link href={back} className="text-sm font-semibold text-teal">Voltar à lista</Link>
      <PageHeader eyebrow="Dr. Bruno" title={review.authorName} description={`${review.rating} de 5 · ${formatDateTime(review.reviewedAt)} · ${REVIEW_STATE_LABEL[review.replyState]} · ${review.sourceMode === "demonstration" ? "demonstração" : "provedor"}`} />
      {query.aviso ? <Notice tone="warning">{query.aviso}</Notice> : null}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <article className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-lg font-semibold">Avaliação original</h2>
          <p className="mt-3 whitespace-pre-wrap leading-7">{review.comment || "Esta avaliação não tem comentário escrito."}</p>
          {review.publishedReply ? (
            <div className="mt-6 border-t border-line pt-4">
              <h3 className="font-semibold">Resposta confirmada pelo Google</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{review.publishedReply}</p>
              <p className="mt-2 text-sm text-muted">{review.publishedAt ? formatDateTime(review.publishedAt) : ""}</p>
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted">Não há resposta confirmada pelo Google para esta avaliação.</p>
          )}
          {review.publishError ? <p className="mt-3 text-sm text-danger">Última falha: {review.publishError}</p> : null}
        </article>
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-lg font-semibold">Sugestão</h2>
          <p className="mt-1 text-sm text-muted">O texto abaixo é um rascunho até que a publicação seja confirmada.</p>
          {current ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-muted">Origem: {current.modelLabel}. {current.appliedMemory.join(" ")}</p>
              {current.policyNotes.length ? <p className="text-sm text-muted">{current.policyNotes.join(" ")}</p> : null}
              {canEdit && review.replyState !== "published" ? (
                <ReplyEditor reviewId={review.id} suggestionId={current.id} body={current.body} />
              ) : (
                <p className="whitespace-pre-wrap leading-7">{current.body}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {canApprove && review.replyState !== "published" ? (
                  <form action={approveReply}>
                    <input type="hidden" name="reviewId" value={review.id} />
                    <input type="hidden" name="suggestionId" value={current.id} />
                    <SubmitButton pendingLabel="Aprovando…">Aprovar sem publicar</SubmitButton>
                  </form>
                ) : null}
                {canEdit && review.replyState !== "published" ? (
                  <form action={discardReply}>
                    <input type="hidden" name="reviewId" value={review.id} />
                    <input type="hidden" name="suggestionId" value={current.id} />
                    <SubmitButton variant="danger" pendingLabel="Descartando…">Descartar sugestão</SubmitButton>
                  </form>
                ) : null}
                {canApprove && (review.replyState === "approved_pending_publish" || review.replyState === "publish_failed") ? (
                  <form action={publishReply}>
                    <input type="hidden" name="reviewId" value={review.id} />
                    <SubmitButton variant="secondary" pendingLabel="Publicando…">Tentar publicação</SubmitButton>
                  </form>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">Ainda não há sugestão.</p>
          )}
          {canEdit && review.replyState !== "published" ? (
            <form action={generateReply} className="mt-4">
              <input type="hidden" name="reviewId" value={review.id} />
              <SubmitButton variant="secondary" pendingLabel="Preparando…">{current ? "Gerar outra sugestão" : "Gerar sugestão"}</SubmitButton>
            </form>
          ) : null}
          {approvals.length ? (
            <div className="mt-6">
              <h3 className="font-semibold">Decisões</h3>
              <ul className="mt-2 space-y-2 text-sm text-muted">
                {approvals.map((approval) => (
                  <li key={approval.decidedAt}>{approval.decision === "approved" ? "Aprovada" : "Recusada"} · {formatDateTime(approval.decidedAt)}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {suggestions.length > 1 ? (
            <div className="mt-6">
              <h3 className="font-semibold">Histórico de rascunhos</h3>
              <ul className="mt-2 space-y-3">
                {suggestions.map((suggestion) => (
                  <li key={suggestion.id} className="text-sm">
                    <span className="font-semibold">{suggestion.status}</span>
                    <span className="mt-1 block text-muted">{suggestion.body.slice(0, 180)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}
