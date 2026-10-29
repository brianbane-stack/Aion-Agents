import Link from "next/link";
import { notFound } from "next/navigation";
import { can } from "@/lib/auth/permissions";
import { requireOnboarded } from "@/lib/auth/guard";
import { getTemplate, getWorkflow, listContacts, listMessages } from "@/lib/db/store";
import { AUTONOMY_LABEL, MESSAGE_STATE_LABEL, RUN_STATE_LABEL } from "@/lib/labels";
import { displayPhone, formatDateTime } from "@/lib/format";
import { approveOutbound, executeOutbound, executeWorkflow, pauseWorkflow, prepareWorkflow, saveWorkflowAction, updateConsent } from "@/features/work/actions";
import { BoundForm } from "@/components/forms/bound-form";
import { PageHeader } from "@/components/page-header";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "Fluxo" };

export default async function WorkflowPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireOnboarded();
  const { id } = await params;
  const query = await searchParams;
  const workflow = getWorkflow(actor.clinicId, id);
  if (!workflow) notFound();
  const template = getTemplate(actor.clinicId, workflow.id);
  const messages = listMessages(actor.clinicId, workflow.id);
  const contacts = listContacts(actor.clinicId);
  const manage = can(actor.role, "manage_workflows");
  const approve = can(actor.role, "approve");
  const send = can(actor.role, "send_message");
  const seePhone = actor.role !== "viewer";
  return (
    <>
      <Link href="/pos-consulta" className="text-sm font-semibold text-teal">Voltar aos fluxos</Link>
      <PageHeader eyebrow="Lucas" title={workflow.name} description={workflow.objective} />
      {query.aviso ? <Notice tone="warning">{query.aviso}</Notice> : null}
      <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-lg font-semibold">Controle</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-muted">Autonomia</dt><dd>{AUTONOMY_LABEL[workflow.autonomy]}</dd></div>
          <div><dt className="text-muted">Estado</dt><dd>{workflow.status === "active" ? "Ativo" : "Pausado"}</dd></div>
          <div><dt className="text-muted">Fontes</dt><dd>{workflow.config.sources.join(", ")}</dd></div>
          <div><dt className="text-muted">Ações permitidas</dt><dd>{workflow.config.allowedActions.join(", ")}</dd></div>
          <div><dt className="text-muted">Interrompe quando</dt><dd>{workflow.config.stopConditions.join(", ")}</dd></div>
          <div><dt className="text-muted">Sucesso</dt><dd>{workflow.config.successCriteria}</dd></div>
          <div className="sm:col-span-2"><dt className="text-muted">Falha</dt><dd>{workflow.config.failurePolicy}</dd></div>
        </dl>
        {manage ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={pauseWorkflow}>
              <input type="hidden" name="workflowId" value={workflow.id} />
              <input type="hidden" name="paused" value={workflow.status === "active" ? "1" : "0"} />
              <SubmitButton variant="secondary" pendingLabel="Atualizando…">{workflow.status === "active" ? "Pausar fluxo" : "Reativar fluxo"}</SubmitButton>
            </form>
            <form action={prepareWorkflow}>
              <input type="hidden" name="workflowId" value={workflow.id} />
              <SubmitButton pendingLabel="Preparando…">Preparar elegíveis</SubmitButton>
            </form>
            {send && workflow.autonomy !== "suggestion" ? (
              <form action={executeWorkflow}>
                <input type="hidden" name="workflowId" value={workflow.id} />
                <SubmitButton variant="secondary" pendingLabel="Executando…">Executar o que já pode sair</SubmitButton>
              </form>
            ) : null}
          </div>
        ) : null}
      </section>

      {manage && template ? (
        <BoundForm action={saveWorkflowAction} className="mt-6 space-y-4 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-lg font-semibold">Regras e modelo</h2>
          <input type="hidden" name="workflowId" value={workflow.id} />
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-semibold">Espera em horas
              <input name="waitHours" type="number" min={0} max={168} defaultValue={workflow.config.waitHours} className="field mt-1" />
            </label>
            <label className="text-sm font-semibold">Tentativas
              <input name="maxAttempts" type="number" min={1} max={3} defaultValue={workflow.config.maxAttempts} className="field mt-1" />
            </label>
            <label className="text-sm font-semibold">Autonomia
              <select name="autonomy" defaultValue={workflow.autonomy} className="field mt-1">
                <option value="suggestion">Sugestão</option>
                <option value="supervised">Supervisionado</option>
                <option value="restricted">Autonomia restrita</option>
              </select>
            </label>
          </div>
          <label className="block text-sm font-semibold">Prévia local do modelo
            <textarea name="templateBody" defaultValue={template.body} rows={5} className="field mt-1" />
          </label>
          <label className="block text-sm font-semibold">Nome do template na Meta
            <input name="providerTemplateName" defaultValue={template.providerTemplateName} className="field mt-1" placeholder="ex.: acompanhamento_pos_consulta" />
          </label>
          <p className="text-sm text-muted">O envio real usa o template aprovado na WhatsApp Cloud API. A prévia não é entregue como texto livre. Um convite de avaliação não pode prometer benefício nem selecionar quem avalia.</p>
          <SubmitButton pendingLabel="Salvando…">Salvar regras</SubmitButton>
        </BoundForm>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Tutores deste ambiente</h2>
        <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
          {contacts.map((contact) => (
            <li key={contact.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">{contact.displayName}</p>
                <p className="text-sm text-muted">{displayPhone(contact.phoneE164, seePhone)} · {contact.consentStatus} · {contact.sourceMode === "demonstration" ? "demonstração" : "cadastro"}</p>
              </div>
              {manage ? (
                <form action={updateConsent} className="flex items-center gap-2">
                  <input type="hidden" name="workflowId" value={workflow.id} />
                  <input type="hidden" name="contactId" value={contact.id} />
                  <select name="status" defaultValue={contact.consentStatus} className="field w-auto" aria-label={`Consentimento de ${contact.displayName}`}>
                    <option value="opted_in">Autoriza</option>
                    <option value="opted_out">Recusa</option>
                    <option value="unknown">Desconhecido</option>
                  </select>
                  <SubmitButton variant="secondary" pendingLabel="Salvando…">Atualizar</SubmitButton>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Mensagens</h2>
        <p className="mt-1 text-sm text-muted">Aceite da API, entrega, leitura e resposta são estados diferentes. Em demonstração, executar não marca entrega.</p>
        {messages.length === 0 ? <p className="mt-3 text-muted">Nenhuma mensagem neste fluxo.</p> : (
          <ul className="mt-3 space-y-3">
            {messages.map((message) => (
              <li key={message.id} className="rounded-2xl border border-line bg-surface p-4">
                <p className="font-semibold">{message.contactName}</p>
                <p className="text-sm text-muted">{MESSAGE_STATE_LABEL[message.state]} · execução {RUN_STATE_LABEL[message.runStatus]} · {formatDateTime(message.createdAt)}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.bodyRendered}</p>
                {message.lastError ? <p className="mt-2 text-sm text-danger">{message.lastError}</p> : null}
                {message.inboundExcerpt ? <p className="mt-2 text-sm">Resposta vinculada: {message.inboundExcerpt}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {approve && (message.state === "awaiting_approval" || message.state === "prepared") ? (
                    <form action={approveOutbound}>
                      <input type="hidden" name="workflowId" value={workflow.id} />
                      <input type="hidden" name="messageId" value={message.id} />
                      <SubmitButton pendingLabel="Aprovando…">Aprovar</SubmitButton>
                    </form>
                  ) : null}
                  {send ? (
                    <form action={executeOutbound}>
                      <input type="hidden" name="workflowId" value={workflow.id} />
                      <input type="hidden" name="messageId" value={message.id} />
                      <SubmitButton variant="secondary" pendingLabel="Executando…">Executar envio</SubmitButton>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
