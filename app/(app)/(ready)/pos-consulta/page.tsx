import Link from "next/link";
import { requireOnboarded } from "@/lib/auth/guard";
import { listMessages, listWorkflows } from "@/lib/db/store";
import { AUTONOMY_LABEL } from "@/lib/labels";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Pós-consulta" };

export default async function PostVisitPage() {
  const actor = await requireOnboarded();
  const workflows = listWorkflows(actor.clinicId).filter((workflow) => workflow.agentKey === "lucas");
  const messages = listMessages(actor.clinicId);
  return (
    <>
      <PageHeader eyebrow="Lucas" title="Pós-consulta" description="Fluxos de relacionamento com espera, consentimento e estados separados de preparação, aceite e entrega." />
      <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
        {workflows.map((workflow) => {
          const related = messages.filter((message) => message.workflowId === workflow.id);
          return (
            <li key={workflow.id}>
              <Link href={`/pos-consulta/${workflow.id}`} className="block px-4 py-4 hover:bg-canvas">
                <span className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{workflow.name}</span>
                  <span className="text-sm text-muted">{workflow.status === "active" ? "Ativo" : "Pausado"}</span>
                </span>
                <span className="mt-1 block text-sm text-muted">{AUTONOMY_LABEL[workflow.autonomy]} · espera de {workflow.config.waitHours} h · até {workflow.config.maxAttempts} tentativa(s)</span>
                <span className="mt-2 block text-sm">{related.length} registro(s) neste fluxo</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
