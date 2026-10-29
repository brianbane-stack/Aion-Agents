"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Search } from "lucide-react";
import { searchRecords } from "@/features/work/actions";
import { COMMAND_LINKS } from "@/components/shell/nav";

type Item = { href: string; label: string; meta: string };

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<Item[]>([]);
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => {
      if (query.trim().length < 2) {
        setRecords([]);
        setStatus("");
        return;
      }
      void searchRecords(query).then((result) => {
        const next = [
          ...result.reviews.map((item) => ({ href: item.href, label: item.label, meta: "Avaliação" })),
          ...result.contacts.map((item) => ({ href: item.href, label: item.label, meta: item.meta })),
          ...result.workflows.map((item) => ({ href: item.href, label: item.label, meta: item.meta })),
        ];
        setRecords(next);
        setStatus(next.length ? `${next.length} registros` : "Nenhum registro acessível para essa busca.");
      });
    }, 180);
    return () => window.clearTimeout(handle);
  }, [open, query]);

  const links = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return COMMAND_LINKS.filter((item) => !term || item.label.toLocaleLowerCase("pt-BR").includes(term)).map((item) => ({
      href: item.href,
      label: item.label,
      meta: item.group,
    }));
  }, [query]);

  const items = [...links, ...records];

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm text-muted motion-safe:transition hover:border-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal">
        <Search className="size-4" aria-hidden="true" />
        Buscar
        <span className="hidden text-xs sm:inline">Ctrl K</span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-[#172033]/40" />
        <Dialog.Content
          className="fixed left-1/2 top-[12vh] w-[min(36rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-line bg-surface p-3 shadow-[0_16px_40px_rgba(23,32,51,0.12)]"
          aria-describedby="busca-descricao"
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((value) => Math.min(value + 1, Math.max(items.length - 1, 0)));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((value) => Math.max(value - 1, 0));
            }
            if (event.key === "Enter" && items[active]) {
              event.preventDefault();
              go(items[active].href);
            }
          }}
        >
          <Dialog.Title className="sr-only">Busca e ações</Dialog.Title>
          <p id="busca-descricao" className="sr-only">
            Navegue pelas áreas existentes ou encontre registros desta clínica.
          </p>
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            placeholder="Ir para uma área ou buscar um registro"
            className="field"
            aria-label="Buscar"
          />
          <div className="mt-3 max-h-80 overflow-auto">
            {items.length === 0 ? (
              <p className="px-2 py-6 text-sm text-muted">{status || "Nenhum destino correspondente."}</p>
            ) : (
              <ul>
                {items.map((item, index) => (
                  <li key={`${item.meta}-${item.href}-${item.label}`}>
                    <button
                      type="button"
                      className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left text-sm ${index === active ? "bg-aqua-soft text-teal-deep" : "hover:bg-canvas"}`}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => go(item.href)}
                    >
                      <span>{item.label}</span>
                      <span className="text-xs text-muted">{item.meta}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
