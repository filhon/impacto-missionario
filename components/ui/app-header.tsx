"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useSession } from "@/lib/context/session";
import { countPending } from "@/lib/dexie/repos";
import { Badge } from "@/components/ui/badge";

export function AppHeader() {
  const { event, team } = useSession();
  const pending = useLiveQuery(() => countPending(), []);
  const total = pending ? pending.activities + pending.people : 0;

  return (
    <header className="sticky top-0 z-50 flex h-12 items-center justify-between border-b border-border bg-background px-4">
      <span className="truncate text-sm font-semibold">{event.name}</span>

      <div className="flex items-center gap-2">
        {team && (
          <Badge
            variant="outline"
            className="flex items-center gap-1.5 border-none text-xs font-medium"
            style={
              team.color
                ? { backgroundColor: team.color + "20", color: team.color }
                : undefined
            }
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: team.color ?? undefined }}
            />
            {team.name}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-1">
        {total > 0 && (
          <Badge variant="secondary" className="text-xs tabular-nums">
            {total}
          </Badge>
        )}
      </div>
    </header>
  );
}
