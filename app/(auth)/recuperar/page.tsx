import Link from "next/link";
import { requestRecovery } from "@/features/auth/actions";
import { BoundForm } from "@/components/forms/bound-form";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "Recuperar acesso" };

export default function RecoveryPage() {
  return (
    <div className="w-full max-w-md">
      <h1 className="font-display text-4xl">Recuperar acesso</h1>
      <p className="mt-2 text-muted">Não há provedor de e-mail configurado. A mensagem abaixo é o comportamento real deste ambiente.</p>
      <BoundForm action={requestRecovery} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold" htmlFor="email">
          E-mail
          <input id="email" name="email" type="email" required className="field mt-2" />
        </label>
        <SubmitButton pendingLabel="Verificando…">Pedir instruções</SubmitButton>
      </BoundForm>
      <Link className="mt-6 inline-block text-sm text-teal" href="/login">Voltar ao acesso</Link>
    </div>
  );
}
