export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="h-10 w-48 rounded-xl bg-white" />
      <div className="h-24 rounded-2xl bg-white" />
      <div className="h-40 rounded-2xl bg-white" />
      <p className="text-sm text-muted">Carregando a operação da clínica.</p>
    </div>
  );
}
