"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <h1 className="font-display text-3xl">Não foi possível abrir esta área.</h1>
      <p className="mt-2 text-muted">O erro ficou nesta tela. Os dados das outras clínicas não foram exibidos.</p>
      <button type="button" className="mt-4 min-h-11 rounded-xl bg-teal px-4 text-sm font-semibold text-white" onClick={() => reset()}>
        Tentar de novo
      </button>
    </div>
  );
}
