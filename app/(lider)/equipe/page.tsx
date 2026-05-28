"use client";

import { useSession } from "@/lib/context/session";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { ACTIVITY_TYPES, type ActivityType } from "@/types/domain";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Book,
  BookOpenText,
  FileText,
  DoorOpen,
  HandHeart,
  Heart,
  Stethoscope,
  Radio,
  Copy,
  MapPin,
  ChevronRight,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

const ICONS: Record<ActivityType, React.ElementType> = {
  biblia: Book,
  joao: BookOpenText,
  folheto: FileText,
  visita: DoorOpen,
  oracao: HandHeart,
  conversao: Heart,
  medico: Stethoscope,
  radio: Radio,
};

type ActivityRow = {
  id: string;
  activity_type: string;
  count: number;
  occurred_at: string;
  lat: number | null;
  lng: number | null;
  volunteer: { name: string | null } | null;
};

type PersonRow = {
  id: string;
  name: string | null;
  consent_level: number;
  neighborhood: string | null;
  created_at: string | null;
  registrant: { name: string | null } | null;
};

const CONSENT_BADGE: Record<number, string> = {
  0: "bg-muted text-muted-foreground",
  1: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  2: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  3: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};

export default function EquipePage() {
  const { team } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();

  const teamId = team?.id;

  useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ["equipe"] });
    };
    window.addEventListener("sync-complete", handler);
    return () => window.removeEventListener("sync-complete", handler);
  }, [queryClient]);

  const { data: activityRows } = useQuery({
    queryKey: ["equipe", teamId, "activities"],
    queryFn: async () => {
      if (!teamId) return [];
      const supabase = createClient();
      const { data } = await supabase
        .from("activity_events")
        .select(
          "id, activity_type, count, occurred_at, lat, lng, volunteer:users!activity_events_user_id_fkey(name)",
        )
        .eq("team_id", teamId)
        .order("occurred_at", { ascending: false })
        .limit(50);
      return (data ?? []) as ActivityRow[];
    },
    enabled: !!teamId,
    refetchInterval: 60_000,
  });

  const { data: totalsRaw } = useQuery({
    queryKey: ["equipe", teamId, "totals"],
    queryFn: async () => {
      if (!teamId) return [];
      const supabase = createClient();
      const { data } = await supabase
        .from("activity_events")
        .select("activity_type, count")
        .eq("team_id", teamId);
      return data ?? [];
    },
    enabled: !!teamId,
    refetchInterval: 60_000,
  });

  const { data: peopleCount } = useQuery({
    queryKey: ["equipe", teamId, "people-count"],
    queryFn: async () => {
      if (!teamId) return 0;
      const supabase = createClient();
      const { count } = await supabase
        .from("people_reached")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId);
      return count ?? 0;
    },
    enabled: !!teamId,
    refetchInterval: 60_000,
  });

  const { data: peopleRows } = useQuery({
    queryKey: ["equipe", teamId, "people"],
    queryFn: async () => {
      if (!teamId) return [];
      const supabase = createClient();
      const { data } = await supabase
        .from("people_reached")
        .select(
          "id, name, consent_level, neighborhood, created_at, registrant:users!people_reached_registered_by_fkey(name)",
        )
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as PersonRow[];
    },
    enabled: !!teamId,
    refetchInterval: 60_000,
  });

  const totalsByType = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const row of totalsRaw ?? []) {
      acc[row.activity_type] = (acc[row.activity_type] ?? 0) + row.count;
    }
    return acc;
  }, [totalsRaw]);

  const totalAtividades = useMemo(
    () => Object.values(totalsByType).reduce((a, b) => a + b, 0),
    [totalsByType],
  );

  const handleCopyCode = async () => {
    if (team?.code_4dig) {
      await navigator.clipboard.writeText(team.code_4dig);
      toast.success("Código copiado!");
    }
  };

  if (!teamId || !team) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <p className="text-sm text-muted-foreground">Equipe não encontrada.</p>
      </div>
    );
  }

  const entries = Object.entries(ACTIVITY_TYPES) as [
    ActivityType,
    (typeof ACTIVITY_TYPES)[ActivityType],
  ][];

  const isLoadingTotals = totalsRaw === undefined;

  return (
    <div className="flex flex-col pb-6">
      {/* Header */}
      <div className="border-b border-border px-4 pb-4 pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold leading-tight">{team.name}</h1>
            <button
              type="button"
              onClick={handleCopyCode}
              aria-label="Copiar código da equipe"
              className="mt-1.5 flex min-h-[36px] items-center gap-1.5 rounded-md px-1.5 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <code className="font-mono text-xs tracking-widest">
                {team.code_4dig ?? "—"}
              </code>
              <Copy className="size-3.5" />
            </button>
          </div>
          <div className="flex shrink-0 gap-6">
            <div className="text-right">
              {isLoadingTotals ? (
                <Skeleton className="ml-auto mb-1 h-7 w-12" />
              ) : (
                <p className="text-2xl font-bold tabular-nums leading-none">
                  {totalAtividades}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">atividades</p>
            </div>
            <div className="text-right">
              {peopleCount === undefined ? (
                <Skeleton className="ml-auto mb-1 h-7 w-8" />
              ) : (
                <p className="text-2xl font-bold tabular-nums leading-none">
                  {peopleCount}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">pessoas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity breakdown chips */}
      <div className="overflow-x-auto border-b border-border py-3">
        <div className="flex w-max gap-2 px-4">
          {entries.map(([type, config]) => {
            const Icon = ICONS[type];
            const count = totalsByType[type] ?? 0;
            return (
              <div
                key={type}
                className="flex min-w-[60px] shrink-0 flex-col items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-2.5"
              >
                <Icon className="size-5 shrink-0" style={{ color: config.color }} />
                {isLoadingTotals ? (
                  <Skeleton className="h-5 w-7" />
                ) : (
                  <span className="text-base font-bold tabular-nums leading-none">
                    {count}
                  </span>
                )}
                <span className="whitespace-nowrap text-center text-[10px] leading-tight text-muted-foreground">
                  {config.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-3">
        <Tabs defaultValue="atividades">
          <TabsList variant="line">
            <TabsTrigger value="atividades">Atividades recentes</TabsTrigger>
            <TabsTrigger value="pessoas">Pessoas registradas</TabsTrigger>
          </TabsList>

          {/* Activities tab */}
          <TabsContent value="atividades" className="pt-2">
            {/* Mobile card list */}
            <div className="sm:hidden">
              {!activityRows && (
                <div className="divide-y divide-border">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 py-3">
                      <Skeleton className="size-9 shrink-0 rounded-lg" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-36" />
                      </div>
                      <Skeleton className="h-6 w-8" />
                    </div>
                  ))}
                </div>
              )}
              {activityRows?.length === 0 && (
                <div className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    Nenhuma atividade registrada.
                  </p>
                </div>
              )}
              <div className="divide-y divide-border">
                {activityRows?.map((row) => {
                  const activityConfig =
                    ACTIVITY_TYPES[row.activity_type as ActivityType];
                  const Icon = activityConfig
                    ? ICONS[row.activity_type as ActivityType]
                    : null;
                  return (
                    <div key={row.id} className="flex items-center gap-3 py-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        {Icon && (
                          <Icon
                            className="size-4"
                            style={{ color: activityConfig?.color }}
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {activityConfig?.label ?? row.activity_type}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.volunteer?.name ?? "—"}&nbsp;&middot;&nbsp;
                          {format(new Date(row.occurred_at), "dd/MM HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-lg font-bold tabular-nums leading-none">
                          {row.count}
                        </span>
                        {row.lat && row.lng ? (
                          <a
                            href={`https://www.google.com/maps?q=${row.lat},${row.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-0.5 text-xs text-primary"
                          >
                            <MapPin className="size-3" />
                            GPS
                          </a>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Desktop table */}
            <div className="relative hidden w-full overflow-x-auto sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Voluntário</TableHead>
                    <TableHead>Atividade</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>GPS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!activityRows &&
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-8" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-10" />
                        </TableCell>
                      </TableRow>
                    ))}
                  {activityRows?.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
                        Nenhuma atividade registrada.
                      </TableCell>
                    </TableRow>
                  )}
                  {activityRows?.map((row) => {
                    const activityConfig =
                      ACTIVITY_TYPES[row.activity_type as ActivityType];
                    const Icon = activityConfig
                      ? ICONS[row.activity_type as ActivityType]
                      : null;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap">
                          {row.volunteer?.name ?? "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            {Icon && (
                              <Icon
                                className="size-3.5"
                                style={{ color: activityConfig?.color }}
                              />
                            )}
                            {activityConfig?.label ?? row.activity_type}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {row.count}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {format(new Date(row.occurred_at), "dd/MM HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {row.lat && row.lng ? (
                            <a
                              href={`https://www.google.com/maps?q=${row.lat},${row.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <MapPin className="size-3" />
                              Ver
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* People tab */}
          <TabsContent value="pessoas" className="pt-2">
            {/* Mobile card list */}
            <div className="sm:hidden">
              {!peopleRows && (
                <div className="divide-y divide-border">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 py-3">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-5 w-8 rounded-full" />
                        </div>
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {peopleRows?.length === 0 && (
                <div className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    Nenhuma pessoa registrada.
                  </p>
                </div>
              )}
              <div className="divide-y divide-border">
                {peopleRows?.map((row) => (
                  <div
                    key={row.id}
                    className={`flex items-center gap-3 py-3 ${row.consent_level >= 2 ? "cursor-pointer" : ""}`}
                    onClick={() => {
                      if (row.consent_level >= 2) {
                        router.push(`/pessoa/${row.id}`);
                      }
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {row.consent_level >= 2 && row.name ? (
                          <p className="truncate text-sm font-medium">
                            {row.name}
                          </p>
                        ) : (
                          <p className="text-sm italic text-muted-foreground">
                            Anônimo
                          </p>
                        )}
                        <span
                          className={`inline-flex h-5 shrink-0 items-center rounded-full px-2 text-xs font-medium ${CONSENT_BADGE[row.consent_level]}`}
                        >
                          N{row.consent_level}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {row.registrant?.name ?? "—"}
                        {row.neighborhood ? ` · ${row.neighborhood}` : ""}
                        {row.created_at
                          ? ` · ${format(new Date(row.created_at), "dd/MM", { locale: ptBR })}`
                          : ""}
                      </p>
                    </div>
                    {row.consent_level >= 2 && (
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop table */}
            <div className="relative hidden w-full overflow-x-auto sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Consentimento</TableHead>
                    <TableHead>Registrado por</TableHead>
                    <TableHead>Bairro</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!peopleRows &&
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-8 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                      </TableRow>
                    ))}
                  {peopleRows?.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
                        Nenhuma pessoa registrada.
                      </TableCell>
                    </TableRow>
                  )}
                  {peopleRows?.map((row) => (
                    <TableRow
                      key={row.id}
                      className={row.consent_level >= 2 ? "cursor-pointer" : ""}
                      onClick={() => {
                        if (row.consent_level >= 2) {
                          router.push(`/pessoa/${row.id}`);
                        }
                      }}
                    >
                      <TableCell className="whitespace-nowrap">
                        {row.consent_level >= 2 && row.name ? (
                          row.name
                        ) : (
                          <span className="italic text-muted-foreground">
                            Anônimo
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span
                          className={`inline-flex h-5 items-center rounded-full px-2 text-xs font-medium ${CONSENT_BADGE[row.consent_level]}`}
                        >
                          N{row.consent_level}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {row.registrant?.name ?? "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {row.neighborhood ?? "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {row.created_at
                          ? format(new Date(row.created_at), "dd/MM HH:mm", {
                              locale: ptBR,
                            })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
