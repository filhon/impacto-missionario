"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useSession } from "@/lib/context/session";
import { countPending } from "@/lib/dexie/repos";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const { event, team, user } = useSession();
  const pending = useLiveQuery(() => countPending(), []);
  const total = pending ? pending.activities + pending.people : 0;

  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-sm">
      {/* Avatar */}
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
        style={{ backgroundColor: team?.color ?? "hsl(33 85% 34%)" }}
        aria-label={user.name}
      >
        {initials}
      </div>

      {/* Event + team */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight">
          {event.name}
        </p>
        {team && (
          <p
            className="truncate text-xs leading-tight font-medium"
            style={{ color: team.color ?? undefined }}
          >
            {team.name}
          </p>
        )}
      </div>

      {/* Right actions */}
      <div className="flex shrink-0 items-center gap-1">
        {total > 0 && (
          <Link
            href="/sync"
            className={cn(
              "flex h-7 min-w-7 items-center justify-center rounded-full px-2",
              "bg-amber-100 text-xs font-semibold tabular-nums text-amber-800",
              "dark:bg-amber-900/40 dark:text-amber-300",
              "hover:opacity-80 transition-opacity",
            )}
            aria-label={`${total} itens pendentes de sincronização`}
          >
            {total}
          </Link>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
