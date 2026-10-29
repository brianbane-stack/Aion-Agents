import { can } from "@/lib/auth/permissions";
import { requireOnboarded } from "@/lib/auth/guard";
import { getBrandPreferences, getClinic } from "@/lib/db/store";
import { ClinicForm } from "@/components/settings/clinic-form";
import { PageHeader } from "@/components/page-header";
import { SettingsNav } from "@/components/settings-nav";

export const metadata = { title: "Clínica" };

export default async function ClinicSettingsPage() {
  const actor = await requireOnboarded();
  const clinic = getClinic(actor.clinicId);
  const prefs = getBrandPreferences(actor.clinicId);
  if (!clinic) return null;
  return (
    <>
      <PageHeader
        title="Clínica"
        description="Cadastro, responsável técnico e preferências que entram nas próximas sugestões. Uma correção de resposta só vira memória se você marcar isso no editor."
      />
      <SettingsNav />
      <ClinicForm
        canEdit={can(actor.role, "edit_clinic")}
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
