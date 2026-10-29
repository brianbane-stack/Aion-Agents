import Link from "next/link";
import { requireOnboarded } from "@/lib/auth/guard";
import { listReviews } from "@/lib/db/store";
import { REVIEW_STATE_LABEL } from "@/lib/labels";
import { excerpt, formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "Reputação" };

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireOnboarded();
  const params = await searchParams;
  const estado = params.estado || "";
  const nota = Number(params.nota || 0);
  const q = params.q || "";
  const reviews = listReviews(actor.clinicId, { state: estado, rating: nota || undefined, query: q });
  const listQuery = new URLSearchParams();
  if (estado) listQuery.set("estado", estado);
  if (nota) listQuery.set("nota", String(nota));
  if (q) listQuery.set("q", q);
  return (
    <>
      <PageHeader eyebrow="Dr. Bruno" title="Reputação" description="Avaliações armazenadas, sugestões e o estado real de publicação. Uma sugestão não é uma resposta publicada." />
      <form method="get" className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-4">
        <label className="text-sm font-semibold">Estado
          <select name="estado" defaultValue={estado} className="field mt-1">
            <option value="">Todos</option>
            {Object.entries(REVIEW_STATE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Nota
          <select name="nota" defaultValue={nota ? String(nota) : ""} className="field mt-1">
            <option value="">Todas</option>
            {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} de 5</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold sm:col-span-2">Busca
          <input name="q" defaultValue={q} className="field mt-1" placeholder="Nome ou trecho do comentário" />
        </label>
        <SubmitButton pendingLabel="Filtrando…" variant="secondary">Filtrar</SubmitButton>
      </form>
      {reviews.length === 0 ? (
        <p className="mt-6 text-muted">Nenhuma avaliação encontrada com esses filtros.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-surface">
          {reviews.map((review) => (
            <li key={review.id}>
              <Link href={`/reputacao/${review.id}?lista=${encodeURIComponent(listQuery.toString())}`} className="block px-4 py-4 hover:bg-canvas">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">{review.authorName}</span>
                  <span>{review.rating} de 5</span>
                </span>
                <span className="mt-1 block text-sm text-muted">{formatDateTime(review.reviewedAt)} · {REVIEW_STATE_LABEL[review.replyState]} · {review.sourceMode === "demonstration" ? "Registro de demonstração" : "Registro do provedor"}</span>
                <span className="mt-2 block text-sm leading-6">{review.comment ? excerpt(review.comment, 180) : "Sem comentário escrito."}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
