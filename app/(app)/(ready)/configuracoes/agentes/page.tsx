import Link from "next/link";
import { can } from "@/lib/auth/permissions";
import { requireOnboarded } from "@/lib/auth/guard";
import { AUTONOMY_LABEL } from "@/lib/labels";
import { listAgents, listWorkflows } from "@/lib/db/store";
import { pauseAgent } from "@/features/work/actions";
import { PageHeader } from "@/components/page-header";
import { SettingsNav } from "@/components/settings-nav";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "Agentes" };

export default async function AgentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireOnboarded();
  const query = await searchParams;
  const agents = listAgents(actor.clinicId);
  const workflows = listWorkflows(actor.clinicId);
  const canPause = can(actor.role, "pause_agent");
  return (
    <>
      <PageHeader
        title="Agentes"
        description="A autonomia é de cada fluxo. Pausar o agente impede novas ações externas daquele responsável. Uma pontuação do modelo não autoriza publicação nem envio."
      />
      <SettingsNav />
      {query.aviso ? <Notice tone="info">{query.aviso}</Notice> : null}
      <div className="mt-4 space-y-6">
        {agents.map((agent) => {
          const flows = workflows.filter((workflow) => workflow.agentKey === agent.key);
          return (
            <section key={agent.id} className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-3xl">{agent.displayName}</h2>
                  <p className="text-sm text-muted">{agent.status === "active" ? "Ativo" : "Pausado"} · {agent.key === "bruno" ? "Reputação" : "Pós-consulta"}</p>
                </div>
                {canPause ? (
                  <form action={pauseAgent}>
                    <input type="hidden" name="key" value={agent.key} />
                    <input type="hidden" name="paused" value={agent.status === "active" ? "1" : "0"} />
                    <SubmitButton variant="secondary" pendingLabel="Atualizando…">{agent.status === "active" ? "Pausar agente" : "Retomar agente"}</SubmitButton>
                  </form>
                ) : null}
              </div>
              <ul className="mt-5 divide-y divide-line">
                {flows.map((flow) => (
                  <li key={flow.id} className="py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-semibold">{flow.name}</h3>
                      <p className="text-sm text-muted">{AUTONOMY_LABEL[flow.autonomy]} · {flow.status === "active" ? "no ar" : "pausado"}</p>
                    </div>
                    <p className="mt-1 text-sm leading-6">{flow.objective}</p>
                    <dl className="mt-3 grid gap-2 text-sm text-muted md:grid-cols-2">
                      <div><dt className="font-semibold text-ink">Ações permitidas</dt><dd>{flow.config.allowedActions.join(" · ")}</dd></div>
                      <div><dt className="font-semibold text-ink">Interrompe quando</dt><dd>{flow.config.stopConditions.join(" · ")}</dd></div>
                      <div><dt className="font-semibold text-ink">Falha</dt><dd>{flow.config.failurePolicy}</dd></div>
                      <div><dt className="font-semibold text-ink">Sucesso</dt><dd>{flow.config.successCriteria}</dd></div>
                    </dl>
                    <Link className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-teal" href={agent.key === "bruno" ? "/reputacao" : `/pos-consulta/${flow.id}`}>
                      Abrir fluxo
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
