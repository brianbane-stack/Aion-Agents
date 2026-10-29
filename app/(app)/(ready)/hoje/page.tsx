import Link from "next/link";
import { requireOnboarded } from "@/lib/auth/guard";
import { formatLongDate } from "@/lib/format";
import { AUTONOMY_LABEL } from "@/lib/labels";
import { clinicOperations } from "@/lib/ops/dashboard";
import { getClinic } from "@/lib/db/store";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Hoje" };

export default async function TodayPage() {
  const actor = await requireOnboarded();
  const clinic = getClinic(actor.clinicId);
  const operations = clinicOperations(actor.clinicId);
  const metrics = operations.metrics;
  return (
    <>
      <PageHeader
        eyebrow={formatLongDate(new Date().toISOString(), clinic?.timezone || "America/Sao_Paulo")}
        title="Hoje"
        description={operations.tasks.length ? "Há decisões esperando você. O restante da operação segue registrado." : "Não há tarefas pedindo intervenção."}
      />
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-lg font-semibold">Estado da operação</h2>
        <p className="mt-2 max-w-3xl text-base leading-7">
          {operations.tasks.length
            ? `${operations.tasks.length} pendência(s) aberta(s), entre avaliações e mensagens que ainda não tiveram um resultado confirmado.`
            : "Os agentes não têm fila de revisão, falha ou publicação pendente."}
        </p>
        {operations.nextAction ? (
          <Link className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-teal px-4 text-sm font-semibold text-white" href={operations.nextAction.href}>
            Continuar: {operations.nextAction.title}
          </Link>
        ) : (
          <p className="mt-4 text-sm text-muted">Nenhuma próxima ação foi inventada para preencher este espaço.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">O que pede você</h2>
        {operations.tasks.length === 0 ? (
          <p className="mt-3 text-muted">A fila está vazia.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
            {operations.tasks.map((task) => (
              <li key={task.id}>
                <Link href={task.href} className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 hover:bg-canvas">
                  <span>
                    <span className="block font-semibold">{task.title}</span>
                    <span className="text-sm text-muted">{task.detail}</span>
                  </span>
                  <span className="text-sm text-teal">Abrir</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {operations.agents.map((agent) => {
          const flows = operations.workflows.filter((workflow) => workflow.agentKey === agent.key);
          return (
            <article key={agent.id} className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="font-display text-2xl">{agent.displayName}</h2>
              <p className="mt-1 text-sm text-muted">{agent.status === "active" ? "Ativo" : "Pausado"} · {agent.key === "bruno" ? "Reputação" : "Pós-consulta"}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {flows.map((flow) => (
                  <li key={flow.id} className="flex items-center justify-between gap-3">
                    <span>{flow.name}</span>
                    <span className="text-muted">{AUTONOMY_LABEL[flow.autonomy]} · {flow.status === "active" ? "no ar" : "pausado"}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Indicadores de 30 dias</h2>
        <p className="mt-1 text-sm text-muted">{metrics.periodLabel} {metrics.sourceLabel}</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Avaliações no período" value={String(metrics.reviews.demonstration + metrics.reviews.provider)} hint={`${metrics.reviews.demonstration} de demonstração · ${metrics.reviews.provider} do provedor`} />
          <Metric label="Nota média" value={metrics.averageRating === null ? "—" : String(metrics.averageRating)} hint="Média aritmética das notas armazenadas no período." />
          <Metric label="Sem resposta confirmada" value={String(metrics.unanswered)} hint="Sem resposta ou só com sugestão. Aprovada ainda não publicada não entra aqui." />
          <Metric label="Publicações confirmadas" value={String(metrics.published)} hint={metrics.responseHours === null ? "Sem tempo médio: não há publicação confirmada no período." : `Tempo médio até a confirmação: ${metrics.responseHours} h.`} />
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Atividade recente</h2>
        <ul className="mt-3 space-y-3">
          {operations.activity.map((event) => (
            <li key={event.id}>
              <Link href={`/atividade/${event.id}`} className="block rounded-2xl border border-line bg-surface px-4 py-3 hover:border-teal">
                <span className="block font-semibold">{event.title}</span>
                <span className="text-sm text-muted">{event.actorLabel} · {event.result}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 font-display text-3xl">{value}</dd>
      <p className="mt-2 text-sm leading-5 text-muted">{hint}</p>
    </div>
  );
}
