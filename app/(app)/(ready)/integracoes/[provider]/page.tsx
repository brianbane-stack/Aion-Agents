import Link from "next/link";
import { notFound } from "next/navigation";
import { can } from "@/lib/auth/permissions";
import { appMode } from "@/lib/env";
import { requireOnboarded } from "@/lib/auth/guard";
import { getIntegration } from "@/lib/db/store";
import { formatDateTime } from "@/lib/format";
import { INTEGRATION_REQUIREMENTS, type ProviderKey } from "@/lib/integrations/requirements";
import { chooseLocation, disconnectAction, listLocationsAction, saveWhatsappAction, syncGoogleAction, testWhatsappAction } from "@/features/work/actions";
import { BoundForm } from "@/components/forms/bound-form";
import { PageHeader } from "@/components/page-header";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { LocationPicker } from "@/components/integrations/location-picker";

export const metadata = { title: "Integração" };

export default async function IntegrationDetailPage({ params, searchParams }: { params: Promise<{ provider: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireOnboarded();
  const { provider } = await params;
  if (provider !== "google_business" && provider !== "whatsapp_cloud") notFound();
  const integration = getIntegration(actor.clinicId, provider);
  if (!integration) notFound();
  const meta = INTEGRATION_REQUIREMENTS[provider as ProviderKey];
  const query = await searchParams;
  const manage = can(actor.role, "manage_integrations");
  const publicConfig = integration.publicConfig;
  return (
    <>
      <Link href="/integracoes" className="text-sm font-semibold text-teal">Voltar às integrações</Link>
      <PageHeader title={meta.title} description={meta.summary} />
      {query.aviso ? <Notice tone="warning">{query.aviso}</Notice> : null}
      {appMode() === "demonstration" ? <p className="mt-4 text-sm text-warning">Modo demonstração ativo. Conectar, testar e sincronizar não chamam o provedor.</p> : null}
      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-lg font-semibold">Estado</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div><dt className="text-muted">Situação</dt><dd>{integration.status}</dd></div>
            <div><dt className="text-muted">Última sincronização confirmada</dt><dd>{integration.lastSyncAt ? formatDateTime(integration.lastSyncAt) : "Nenhuma"}</dd></div>
            <div><dt className="text-muted">Local ou número</dt><dd>{integration.locationTitle || "Não selecionado"}</dd></div>
            <div><dt className="text-muted">Escopos pedidos</dt><dd>{meta.scopes.join(", ")}</dd></div>
          </dl>
          {integration.lastError ? <p className="mt-3 text-sm text-danger">{integration.lastError}</p> : null}
          <h3 className="mt-5 font-semibold">O que falta configurar</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
            {meta.needs.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <h3 className="mt-5 font-semibold">Limites</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
            {meta.limits.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <a className="mt-4 inline-block text-sm font-semibold text-teal" href={meta.docs}>Documentação oficial</a>
        </article>
        {manage ? (
          <article className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-lg font-semibold">Ações</h2>
            {provider === "google_business" ? (
              <div className="mt-4 space-y-3">
                <a className="inline-flex min-h-11 items-center rounded-xl bg-teal px-4 text-sm font-semibold text-white" href="/api/integrations/google/start">Conectar com Google</a>
                <form action={syncGoogleAction}><SubmitButton variant="secondary" pendingLabel="Sincronizando…">Sincronizar avaliações</SubmitButton></form>
                <LocationPicker action={listLocationsAction} choose={chooseLocation} />
              </div>
            ) : (
              <BoundForm action={saveWhatsappAction} className="mt-4 space-y-3">
                <label className="block text-sm font-semibold">Identificador do número
                  <input name="phoneNumberId" defaultValue={String(publicConfig.phoneNumberId || "")} className="field mt-1" autoComplete="off" />
                </label>
                <label className="block text-sm font-semibold">Identificador da conta WhatsApp
                  <input name="wabaId" defaultValue={String(publicConfig.wabaId || "")} className="field mt-1" autoComplete="off" />
                </label>
                <label className="block text-sm font-semibold">Token de acesso
                  <input name="accessToken" type="password" className="field mt-1" placeholder={publicConfig.hasAccessToken ? "Token já armazenado" : "Não armazenado"} autoComplete="new-password" />
                </label>
                <label className="block text-sm font-semibold">Segredo do aplicativo
                  <input name="appSecret" type="password" className="field mt-1" placeholder={publicConfig.hasAppSecret ? "Segredo já armazenado" : "Não armazenado"} autoComplete="new-password" />
                </label>
                <label className="block text-sm font-semibold">Token de verificação do webhook
                  <input name="verifyToken" type="password" className="field mt-1" placeholder={publicConfig.hasVerifyToken ? "Token já armazenado" : "Não armazenado"} autoComplete="new-password" />
                </label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="clearAccessToken" /> Remover token de acesso</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="clearAppSecret" /> Remover segredo</label>
                <p className="text-sm text-muted">Os segredos não voltam para o navegador. O campo vazio mantém o valor já salvo.</p>
                <SubmitButton pendingLabel="Salvando…">Salvar configuração</SubmitButton>
              </BoundForm>
            )}
            {provider === "whatsapp_cloud" ? (
              <form action={testWhatsappAction} className="mt-3">
                <SubmitButton variant="secondary" pendingLabel="Testando…">Testar conexão</SubmitButton>
              </form>
            ) : null}
            <form action={disconnectAction} className="mt-4">
              <input type="hidden" name="provider" value={provider} />
              <SubmitButton variant="danger" pendingLabel="Removendo…">Desconectar</SubmitButton>
            </form>
          </article>
        ) : <p className="text-sm text-muted">Seu perfil pode consultar o estado, mas não alterar a integração.</p>}
      </section>
    </>
  );
}
