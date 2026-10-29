import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6">
      <p className="text-sm font-semibold text-teal">VetAgents</p>
      <h1 className="mt-3 font-display text-4xl text-ink">Esta página não existe.</h1>
      <p className="mt-3 text-muted">O endereço não corresponde a uma área da operação.</p>
      <Link className="mt-6 text-teal underline-offset-4 hover:underline" href="/hoje">
        Voltar para Hoje
      </Link>
    </main>
  );
}
