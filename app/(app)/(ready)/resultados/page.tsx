import Link from "next/link";
import { can } from "@/lib/auth/permissions";
import { requireOnboarded } from "@/lib/auth/guard";
import { valueReport } from "@/lib/ops/dashboard";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Resultados" };

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold text-muted">{label}</h2>
      <p className="mt-2 font-display text-4xl">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{note}</p>
    </article>
  );
}

export default async function ResultsPage() {
  const actor = await requireOnboarded();
  const report = valueReport(actor.clinicId);
  const hours = report.responseHours === null ? "Sem base" : `${report.responseHours} h`;
  return (
    <>
      <PageHeader
        title="Resultados"
        description="Contagens dos registros desta clínica. Atividade registrada não é o mesmo que um resultado confirmado pelo Google ou pela Meta."
        actions={can(actor.role, "export_data") ? (
          <a className="inline-flex min-h-11 items-center rounded-xl border border-line bg-surface px-4 text-sm font-semibold" href="/api/clinica/export">Exportar JSON</a>
        ) : null}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Metric label="Avaliações armazenadas" value={String(report.processedReviews)} note="Todas as avaliações desta clínica, inclusive as de demonstração." />
        <Metric label="Respostas preparadas" value={String(report.preparedReplies)} note="Saíram do estado sem resposta. Inclui sugestão, aprovação, descarte e publicação." />
        <Metric label="Aprovadas e ainda não publicadas" value={String(report.approvedUnpublished)} note="A aprovação existe. A publicação no Google não foi confirmada." />
        <Metric label="Publicações confirmadas" value={String(report.published)} note="Somente quando o provedor confirmou a resposta." />
        <Metric label="Tempo médio até a resposta" value={hours} note="Média entre a data da avaliação e a publicação confirmada. Sem publicação, não há média." />
        <Metric label="Envios aceitos" value={String(report.messagesAccepted)} note="A Cloud API aceitou o envio. Isso não confirma entrega." />
        <Metric label="Entregas confirmadas" value={String(report.messagesDelivered)} note="Webhook registrou entrega, leitura ou resposta vinculada." />
        <Metric label="Falhas" value={String(report.failures)} note="Publicação ou envio que falhou e ainda pede intervenção." />
        <Metric label="Intervenções humanas no histórico recente" value={String(report.humanTouches)} note="Eventos de usuário entre os 200 mais recentes. Não é o total histórico se a clínica passar desse limite." />
      </div>
      <section className="mt-8 rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-lg font-semibold">Tempo estimado</h2>
        <p className="mt-2 font-display text-4xl">{report.minutesSaved} min</p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{report.method}</p>
      </section>
      <section className="mt-8 rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-lg font-semibold">Temas observados</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{report.themeNote}</p>
        {report.themes.length ? (
          <ul className="mt-4 space-y-2">
            {report.themes.map((theme) => (
              <li key={theme.term} className="flex items-center justify-between gap-4 text-sm">
                <span>{theme.term}</span>
                <span className="text-muted">{theme.count} avaliações</span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-4 text-sm text-muted">{report.limits}</p>
      </section>
      <p className="mt-6 flex flex-wrap gap-4 text-sm font-semibold">
        <Link className="text-teal" href="/reputacao">Ver avaliações</Link>
        <Link className="text-teal" href="/pos-consulta">Ver fluxos</Link>
        <Link className="text-teal" href="/atividade">Ver atividade</Link>
      </p>
    </>
  );
}
