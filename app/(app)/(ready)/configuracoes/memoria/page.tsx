import { can } from "@/lib/auth/permissions";
import { requireOnboarded } from "@/lib/auth/guard";
import { listMemory } from "@/lib/db/store";
import { formatDateTime } from "@/lib/format";
import { addMemoryAction, deleteMemoryAction, toggleMemoryAction } from "@/features/work/actions";
import { BoundForm } from "@/components/forms/bound-form";
import { PageHeader } from "@/components/page-header";
import { SettingsNav } from "@/components/settings-nav";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "Memória" };

const KIND_LABEL: Record<string, string> = {
  explicit_rule: "Regra explícita",
  approved_example: "Exemplo aprovado",
  preferred_expression: "Expressão preferida",
  avoided_expression: "Expressão a evitar",
};

const SOURCE_LABEL: Record<string, string> = {
  user: "Definida por alguém da clínica",
  system_proposal: "Proposta do sistema, ainda não é regra automática",
};

export default async function MemoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireOnboarded();
  const query = await searchParams;
  const entries = listMemory(actor.clinicId);
  const editable = can(actor.role, "edit_memory") || can(actor.role, "edit_clinic");
  return (
    <>
      <PageHeader
        title="Memória da clínica"
        description="Só entra aqui o que alguém registrou de propósito. Desativar ou remover tira a preferência das próximas sugestões. O texto já publicado não muda."
      />
      <SettingsNav />
      {query.aviso ? <Notice tone="info">{query.aviso}</Notice> : null}
      {editable ? (
        <BoundForm action={addMemoryAction} className="mt-4 grid gap-3 rounded-2xl border border-line bg-surface p-5 md:grid-cols-2">
          <label className="block text-sm font-semibold" htmlFor="kind">
            Tipo
            <select id="kind" name="kind" className="field mt-1" defaultValue="explicit_rule">
              {Object.entries(KIND_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold" htmlFor="title">
            Título
            <input id="title" name="title" className="field mt-1" required minLength={3} maxLength={80} />
          </label>
          <label className="block text-sm font-semibold md:col-span-2" htmlFor="body">
            Conteúdo
            <textarea id="body" name="body" rows={3} className="field mt-1" required minLength={3} maxLength={500} />
          </label>
          <div>
            <SubmitButton pendingLabel="Registrando…">Registrar memória</SubmitButton>
          </div>
        </BoundForm>
      ) : null}
      {entries.length === 0 ? (
        <p className="mt-6 text-muted">Nenhuma memória registrada.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-surface">
          {entries.map((entry) => (
            <li key={entry.id} className="space-y-2 px-4 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold">{entry.title}</h2>
                <p className="text-sm text-muted">{entry.active ? "Ativa" : "Desativada"}</p>
              </div>
              <p className="text-sm leading-6">{entry.body}</p>
              <p className="text-sm text-muted">
                {KIND_LABEL[entry.kind] || entry.kind} · {SOURCE_LABEL[entry.source] || entry.source} · registrada em {formatDateTime(entry.createdAt)}
              </p>
              {editable ? (
                <div className="flex flex-wrap gap-2">
                  <form action={toggleMemoryAction}>
                    <input type="hidden" name="id" value={entry.id} />
                    <input type="hidden" name="active" value={entry.active ? "0" : "1"} />
                    <SubmitButton variant="secondary" pendingLabel="Atualizando…">{entry.active ? "Desativar" : "Reativar"}</SubmitButton>
                  </form>
                  <form action={deleteMemoryAction}>
                    <input type="hidden" name="id" value={entry.id} />
                    <SubmitButton variant="danger" pendingLabel="Removendo…">Remover</SubmitButton>
                  </form>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
