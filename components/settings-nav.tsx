"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SETTINGS_NAV } from "@/components/shell/nav";
import { cn } from "@/lib/cn";

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Configurações" className="mb-6 flex gap-2 overflow-x-auto">
      {SETTINGS_NAV.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold",
              active ? "bg-teal text-white" : "bg-surface text-ink ring-1 ring-line",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
