import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { getBrandPreferences, getClinic } from "@/lib/db/store";
import { ClinicForm } from "@/components/settings/clinic-form";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Configuração inicial" };

export default async function StartPage() {
  const actor = await requireUser();
  if (actor.onboardingCompleted) redirect("/hoje");
  const clinic = getClinic(actor.clinicId);
  if (!clinic) redirect("/login");
  const prefs = getBrandPreferences(actor.clinicId);
  return (
    <>
      <PageHeader
        eyebrow="Primeira tarefa"
        title="Como a clínica deve falar"
        description="Salve o tom, o telefone e as frases que as próximas sugestões devem respeitar. Em seguida você abre a avaliação mais antiga ainda sem resposta."
      />
      <ClinicForm
        onboarding
        canEdit
        defaults={{
          name: clinic.name,
          phone: clinic.phone,
          email: clinic.email,
          address: clinic.address,
          city: clinic.city,
          state: clinic.state,
          technicalManager: clinic.technicalManager,
          crmv: clinic.crmv,
          formality: prefs.formality,
          emojiPolicy: prefs.emojiPolicy,
          signOff: prefs.signOff,
          preferredPhrases: prefs.preferredPhrases.join("\n"),
          avoidedPhrases: prefs.avoidedPhrases.join("\n"),
          communicationRules: prefs.communicationRules,
        }}
      />
    </>
  );
}
