export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
      <section className="hidden flex-col justify-between bg-teal-deep px-12 py-12 text-white lg:flex">
        <p className="font-display text-3xl">VetAgents</p>
        <div className="max-w-md">
          <h1 className="font-display text-5xl leading-tight">A clínica sabe o que fazer agora.</h1>
          <ul className="mt-8 space-y-3 text-lg text-teal-50">
            <li>O que está acontecendo na operação.</li>
            <li>O que pede a sua decisão.</li>
            <li>O que foi feito e o que foi confirmado.</li>
            <li>O que os registros permitem melhorar.</li>
          </ul>
        </div>
        <p className="text-sm text-teal-100">Dr. Bruno cuida da reputação. Lucas cuida do pós-consulta.</p>
      </section>
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">{children}</section>
    </div>
  );
}
