import Link from "next/link";
import { appMode } from "@/lib/env";
import { getDemoPassword } from "@/lib/auth/demo-password";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Entrar" };

export default function LoginPage() {
  const demonstration = appMode() === "demonstration";
  return (
    <div className="w-full max-w-md">
      <p className="font-display text-3xl text-ink lg:hidden">VetAgents</p>
      <h1 className="mt-2 font-display text-4xl text-ink">Entrar</h1>
      <p className="mt-2 text-muted">Acesse a operação da sua clínica.</p>
      <div className="mt-6">
        <LoginForm demonstration={demonstration} password={demonstration ? getDemoPassword() : null} />
      </div>
      <p className="mt-6 flex flex-col gap-2 text-sm">
        <Link className="text-teal underline-offset-4 hover:underline" href="/recuperar">Esqueci minha senha</Link>
        <Link className="text-teal underline-offset-4 hover:underline" href="/criar-clinica">Criar uma clínica</Link>
      </p>
    </div>
  );
}
