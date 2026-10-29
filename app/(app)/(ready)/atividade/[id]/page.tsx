import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboarded } from "@/lib/auth/guard";
import { getActivity } from "@/lib/db/store";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Evento" };

export default async function ActivityDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireOnboarded();
  const { id } = await params;
  const query = await searchParams;
  const event = getActivity(actor.clinicId, id);
  if (!event) notFound();
  const back = query.lista ? `/atividade?${query.lista}` : "/atividade";
  const href = event.subjectType === "review" && event.subjectId
    ? `/reputacao/${event.subjectId}`
    : event.subjectType === "workflow" && event.subjectId
      ? `/pos-consulta/${event.subjectId}`
      : event.subjectType === "message"
        ? "/pos-consulta"
        : null;
  return (
    <>
      <Link href={back} className="text-sm font-semibold text-teal">Voltar à atividade</Link>
      <PageHeader title={event.title} description={`${event.actorLabel} · ${formatDateTime(event.createdAt)}`} />
      <article className="rounded-2xl border border-line bg-surface p-5">
        <p className="leading-7">{event.detail}</p>
        <p className="mt-4 text-sm"><span className="font-semibold">Resultado: </span>{event.result}</p>
        {href ? <Link className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-teal" href={href}>Abrir o contexto</Link> : null}
      </article>
    </>
  );
}
