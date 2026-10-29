"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";

type Location = { resource: string; title: string };

export function LocationPicker({
  action,
  choose,
}: {
  action: () => Promise<{ ok: boolean; message: string; data?: { locations: Location[] } }>;
  choose: (formData: FormData) => Promise<void>;
}) {
  const [message, setMessage] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  return (
    <div className="space-y-3">
      <button
        type="button"
        className="inline-flex min-h-11 items-center rounded-xl border border-line bg-surface px-4 text-sm font-semibold"
        onClick={() => {
          void action().then((result) => {
            setMessage(result.message);
            setLocations(result.data?.locations ?? []);
          });
        }}
      >
        Listar locais autorizados
      </button>
      {message ? <p className="text-sm text-muted">{message}</p> : null}
      {locations.map((location) => (
        <form key={location.resource} action={choose} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2">
          <input type="hidden" name="resource" value={location.resource} />
          <input type="hidden" name="title" value={location.title} />
          <span className="text-sm">{location.title}</span>
          <SubmitButton variant="secondary" pendingLabel="Salvando…">Usar este local</SubmitButton>
        </form>
      ))}
    </div>
  );
}
