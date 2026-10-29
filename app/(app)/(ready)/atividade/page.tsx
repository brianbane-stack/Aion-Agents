import Link from "next/link";
import { requireOnboarded } from "@/lib/auth/guard";
import { listActivity } from "@/lib/db/store";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "Atividade" };

const kinds = [
  ["", "Todos"],
  ["action_required", "Pendências"],
  ["failure", "Falhas"],
  ["info", "Informativos"],
] as const;

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireOnboarded();
  const params = await searchParams;
  const events = listActivity(actor.clinicId, { kind: params.tipo, actorKey: params.origem, query: params.q });
  const preserved = new URLSearchParams();
  if (params.tipo) preserved.set("tipo", params.tipo);
  if (params.origem) preserved.set("origem", params.origem);
  if (params.q) preserved.set("q", params.q);
  return (
    <>
      <PageHeader title="Atividade" description="Histórico do que a equipe e os agentes fizeram. O resultado descreve o que foi confirmado, não o que se pretendia." />
      <form method="get" className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-4">
        <label className="text-sm font-semibold">Tipo
          <select name="tipo" defaultValue={params.tipo || ""} className="field mt-1">
            {kinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Origem
          <select name="origem" defaultValue={params.origem || ""} className="field mt-1">
            <option value="">Todas</option>
            <option value="bruno">Dr. Bruno</option>
            <option value="lucas">Lucas</option>
            <option value="user">Pessoas</option>
            <option value="integration">Integrações</option>
            <option value="system">Sistema</option>
          </select>
        </label>
        <label className="text-sm font-semibold sm:col-span-2">Busca
          <input name="q" defaultValue={params.q || ""} className="field mt-1" />
        </label>
        <SubmitButton variant="secondary" pendingLabel="Filtrando…">Filtrar</SubmitButton>
      </form>
      {events.length === 0 ? <p className="mt-6 text-muted">Nenhum evento com esses filtros.</p> : (
        <ol className="mt-6 space-y-3">
          {events.map((event) => (
            <li key={event.id}>
              <Link href={`/atividade/${event.id}?lista=${encodeURIComponent(preserved.toString())}`} className="block rounded-2xl border border-line bg-surface px-4 py-3 hover:border-teal">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">{event.kind === "failure" ? "Falha" : event.kind === "action_required" ? "Pendência" : "Informativo"}</span>
                <span className="mt-1 block font-semibold">{event.title}</span>
                <span className="mt-1 block text-sm text-muted">{event.actorLabel} · {formatDateTime(event.createdAt)} · {event.result}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
