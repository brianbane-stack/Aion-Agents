import { can } from "@/lib/auth/permissions";
import { requireOnboarded } from "@/lib/auth/guard";
import { ROLE_LABEL } from "@/lib/labels";
import { listMembers } from "@/lib/db/store";
import { ROLES } from "@/types/domain";
import { changeRoleAction } from "@/features/work/actions";
import { PageHeader } from "@/components/page-header";
import { SettingsNav } from "@/components/settings-nav";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "Equipe" };

export default async function TeamPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireOnboarded();
  const query = await searchParams;
  const members = listMembers(actor.clinicId);
  const manage = can(actor.role, "manage_team");
  return (
    <>
      <PageHeader
        title="Equipe"
        description="O acesso vale para esta clínica. Alterar o identificador na URL não abre os registros de outra."
      />
      <SettingsNav />
      {query.aviso ? <Notice tone="info">{query.aviso}</Notice> : null}
      <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface">
        {members.map((member) => (
          <li key={member.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">{member.name}</p>
              <p className="text-sm text-muted">{member.email}</p>
            </div>
            {manage ? (
              <form action={changeRoleAction} className="flex flex-wrap items-end gap-2">
                <label className="text-sm font-semibold" htmlFor={`role-${member.id}`}>
                  Papel
                  <select id={`role-${member.id}`} name="role" defaultValue={member.role} className="field mt-1 min-w-44">
                    {ROLES.map((role) => (
                      <option key={role} value={role}>{ROLE_LABEL[role]}</option>
                    ))}
                  </select>
                </label>
                <input type="hidden" name="membershipId" value={member.id} />
                <SubmitButton variant="secondary" pendingLabel="Salvando…">Atualizar</SubmitButton>
              </form>
            ) : (
              <p className="text-sm text-muted">{ROLE_LABEL[member.role]}</p>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
