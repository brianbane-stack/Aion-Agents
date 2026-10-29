import { appMode } from "@/lib/env";
import { requireUser } from "@/lib/auth/guard";
import { ROLE_LABEL } from "@/lib/labels";
import { clinicOperations } from "@/lib/ops/dashboard";
import { Shell } from "@/components/shell/shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireUser();
  const operations = clinicOperations(actor.clinicId);
  const reviews = operations.tasks.filter((task) => task.href.startsWith("/reputacao")).length;
  const messages = operations.tasks.filter((task) => task.href.startsWith("/pos-consulta")).length;
  return (
    <Shell
      clinicName={actor.clinicName}
      userName={actor.name}
      roleLabel={ROLE_LABEL[actor.role]}
      mode={appMode()}
      counts={{ reviews, messages }}
    >
      {children}
    </Shell>
  );
}
