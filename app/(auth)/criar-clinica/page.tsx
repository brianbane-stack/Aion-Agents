import Link from "next/link";
import { createClinic } from "@/features/auth/actions";
import { BoundForm } from "@/components/forms/bound-form";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "Criar clínica" };

const fields = [
  ["name", "Seu nome", "text"],
  ["email", "E-mail", "email"],
  ["password", "Senha", "password"],
  ["clinicName", "Nome da clínica", "text"],
  ["city", "Cidade", "text"],
  ["state", "Estado", "text"],
  ["phone", "Telefone", "tel"],
  ["technicalManager", "Responsável técnico", "text"],
  ["crmv", "CRMV", "text"],
] as const;

export default function CreateClinicPage() {
  return (
    <div className="w-full max-w-md">
      <h1 className="font-display text-4xl">Criar clínica</h1>
      <p className="mt-2 text-muted">Você será o responsável. A configuração inicial vem em seguida.</p>
      <BoundForm action={createClinic} className="mt-6 space-y-3">
        {fields.map(([name, label, type]) => (
          <label key={name} className="block text-sm font-semibold" htmlFor={name}>
            {label}
            <input id={name} name={name} type={type} required className="field mt-1" autoComplete={name === "password" ? "new-password" : "on"} />
          </label>
        ))}
        <SubmitButton pendingLabel="Criando…">Criar e continuar</SubmitButton>
      </BoundForm>
      <Link className="mt-6 inline-block text-sm text-teal" href="/login">Já tenho acesso</Link>
    </div>
  );
}
