import Link from "next/link";
import { requireOnboarded } from "@/lib/auth/guard";
import { listIntegrations, listWebhookEvents } from "@/lib/db/store";
import { formatDateTime } from "@/lib/format";
import { INTEGRATION_REQUIREMENTS } from "@/lib/integrations/requirements";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Integrações" };

const STATUS: Record<string, string> = {
  not_configured: "Não configurada",
  credentials_stored: "Credenciais salvas, conexão não testada",
  connected: "Conectada",
  error: "Erro na última operação",
  expired: "Acesso expirado",
};

export default async function IntegrationsPage() {
  const actor = await requireOnboarded();
  const integrations = listIntegrations(actor.clinicId);
  const events = listWebhookEvents(actor.clinicId);
  return (
    <>
      <PageHeader title="Integrações" description="Cada conector mostra o estado real. Ausência de credencial não vira sucesso." />
      <ul className="grid gap-4 md:grid-cols-2">
        {integrations.map((integration) => {
          const meta = INTEGRATION_REQUIREMENTS[integration.provider];
          return (
            <li key={integration.id}>
              <Link href={`/integracoes/${integration.provider}`} className="block h-full rounded-2xl border border-line bg-surface p-5 hover:border-teal">
                <h2 className="font-display text-2xl">{meta.title}</h2>
                <p className="mt-2 text-sm font-semibold">{STATUS[integration.status] || integration.status}</p>
                <p className="mt-2 text-sm text-muted">Última sincronização confirmada: {integration.lastSyncAt ? formatDateTime(integration.lastSyncAt) : "nenhuma"}</p>
                {integration.lastError ? <p className="mt-2 text-sm text-danger">{integration.lastError}</p> : null}
              </Link>
            </li>
          );
        })}
      </ul>
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Eventos recentes</h2>
        {events.length === 0 ? <p className="mt-2 text-sm text-muted">Nenhum webhook processado para esta clínica.</p> : (
          <ul className="mt-3 space-y-2 text-sm">
            {events.map((event) => (
              <li key={`${event.receivedAt}-${event.summary}`} className="rounded-xl border border-line bg-surface px-4 py-3">
                {event.provider} · {event.status} · {event.summary} · {formatDateTime(event.receivedAt)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
