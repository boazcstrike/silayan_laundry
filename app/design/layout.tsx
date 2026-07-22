"use client";

/**
 * Design gallery layout.
 *
 * Wraps every /design route with a sticky proposal switcher so the client can
 * flip between the three redesign proposals (and the scored hub) without losing
 * their place. Each proposal is a real, fully-wired page under /design/[a|b|c].
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const PROPOSALS = [
  { href: "/design", label: "Overview", short: "★" },
  { href: "/design/b", label: "Full Deck", short: "B" },
] as const;

export default function DesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-14 z-10 border-b bg-background/80 backdrop-blur">
        <nav
          aria-label="Design proposals"
          className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-2"
        >
          {PROPOSALS.map((p) => {
            const active =
              p.href === "/design"
                ? pathname === "/design"
                : pathname === p.href;
            return (
              <Link
                key={p.href}
                href={p.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-[40px] items-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-full text-xs font-bold",
                    active
                      ? "bg-primary-foreground/20"
                      : "bg-muted text-foreground/70"
                  )}
                >
                  {p.short}
                </span>
                {p.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </div>
  );
}
