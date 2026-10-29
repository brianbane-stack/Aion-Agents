"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { LogOut, Menu, PanelLeft } from "lucide-react";
import { logout } from "@/features/auth/actions";
import { MAIN_NAV, Settings } from "@/components/shell/nav";
import { CommandPalette } from "@/components/shell/command-palette";
import { cn } from "@/lib/cn";

type Counts = { reviews: number; messages: number };

const sidebarStore = {
  collapsed: false,
  listeners: new Set<() => void>(),
};

function emitSidebar() {
  for (const listener of sidebarStore.listeners) listener();
}

function subscribeSidebar(listener: () => void) {
  sidebarStore.listeners.add(listener);
  return () => sidebarStore.listeners.delete(listener);
}

function sidebarSnapshot() {
  return sidebarStore.collapsed;
}

function NavLinks({
  collapsed,
  counts,
  onNavigate,
}: {
  collapsed: boolean;
  counts: Counts;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Seções" className="flex flex-1 flex-col gap-1">
      {MAIN_NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const count = item.href === "/reputacao" ? counts.reviews : item.href === "/pos-consulta" ? counts.messages : 0;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            title={item.label}
            onClick={onNavigate}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold motion-safe:transition",
              active ? "bg-aqua-soft text-teal-deep" : "text-ink hover:bg-canvas",
              collapsed && "justify-center px-0",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {collapsed ? <span className="sr-only">{item.label}</span> : <span className="flex-1">{item.label}</span>}
            {!collapsed && count > 0 ? (
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-teal-deep">{count}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function Shell({
  clinicName,
  userName,
  roleLabel,
  mode,
  counts,
  children,
}: {
  clinicName: string;
  userName: string;
  roleLabel: string;
  mode: "demonstration" | "live";
  counts: Counts;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribeSidebar, sidebarSnapshot, () => false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("va-sidebar") === "1";
    if (stored === sidebarStore.collapsed) return;
    sidebarStore.collapsed = stored;
    emitSidebar();
  }, []);

  function toggleCollapsed() {
    const next = !sidebarStore.collapsed;
    sidebarStore.collapsed = next;
    window.localStorage.setItem("va-sidebar", next ? "1" : "0");
    emitSidebar();
  }

  const settingsActive = pathname.startsWith("/configuracoes");

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        Pular para o conteúdo
      </a>
      <aside className={cn("fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-surface px-3 py-4 lg:flex", collapsed ? "w-[4.5rem]" : "w-64")}>
        <div className={cn("mb-6 flex items-center gap-3 px-2", collapsed && "justify-center px-0")}>
          <span className="grid size-9 place-items-center rounded-xl bg-teal font-display text-lg text-white">V</span>
          {collapsed ? null : (
            <div>
              <p className="font-display text-xl leading-none text-ink">VetAgents</p>
              <p className="mt-1 text-xs text-muted">Operação da clínica</p>
            </div>
          )}
        </div>
        <p className={cn("mb-4 truncate px-3 text-sm text-muted", collapsed && "sr-only")}>{clinicName}</p>
        <NavLinks collapsed={collapsed} counts={counts} />
        <Link
          href="/configuracoes"
          aria-current={settingsActive ? "page" : undefined}
          className={cn(
            "mt-3 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold",
            settingsActive ? "bg-aqua-soft text-teal-deep" : "text-ink hover:bg-canvas",
            collapsed && "justify-center px-0",
          )}
        >
          <Settings className="size-4" aria-hidden="true" />
          {collapsed ? <span className="sr-only">Configurações</span> : "Configurações"}
        </Link>
      </aside>
      <div className={cn("lg:pl-64", collapsed && "lg:pl-[4.5rem]")}>
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:px-6">
          <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
            <Dialog.Trigger className="inline-flex size-11 items-center justify-center rounded-xl border border-line bg-surface lg:hidden" aria-label="Abrir menu">
              <Menu className="size-5" aria-hidden="true" />
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-[#172033]/40 lg:hidden" />
              <Dialog.Content className="fixed inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col bg-surface p-4 lg:hidden" aria-describedby={undefined}>
                <Dialog.Title className="font-display text-2xl">VetAgents</Dialog.Title>
                <p className="mb-4 mt-1 text-sm text-muted">{clinicName}</p>
                <NavLinks collapsed={false} counts={counts} onNavigate={() => setMobileOpen(false)} />
                <Link href="/configuracoes" onClick={() => setMobileOpen(false)} className="mt-3 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold">
                  <Settings className="size-4" aria-hidden="true" /> Configurações
                </Link>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          <button type="button" className="hidden size-11 items-center justify-center rounded-xl border border-line bg-surface lg:inline-flex" aria-label={collapsed ? "Expandir menu" : "Recolher menu"} onClick={toggleCollapsed}>
            <PanelLeft className="size-4" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{clinicName}</p>
            <p className="truncate text-xs text-muted">{userName} · {roleLabel}</p>
          </div>
          <CommandPalette />
          <form action={logout}>
            <button type="submit" className="inline-flex size-11 items-center justify-center rounded-xl border border-line bg-surface" aria-label="Sair">
              <LogOut className="size-4" aria-hidden="true" />
            </button>
          </form>
        </header>
        {mode === "demonstration" ? (
          <p className="border-b border-amber-200 bg-warning-soft px-4 py-2 text-sm text-warning sm:px-6">
            Demonstração. Os registros são fictícios e locais. Nenhuma ação é enviada ao Google ou à Meta.
          </p>
        ) : null}
        <main id="conteudo" className="mx-auto w-full max-w-[1120px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
