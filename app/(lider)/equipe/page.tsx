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

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{team.name}</h1>
          <button
            type="button"
            onClick={handleCopyCode}
            aria-label="Copiar código da equipe"
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs tracking-wider">
              {team.code_4dig ?? "—"}
            </code>
            <Copy className="size-3" />
          </button>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums">{totalAtividades}</p>
            <p className="text-xs text-muted-foreground">atividades</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums">{peopleCount}</p>
            <p className="text-xs text-muted-foreground">pessoas</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {entries.map(([type, config]) => {
          const Icon = ICONS[type];
          const count = totalsByType[type] ?? 0;
          return (
            <div
              key={type}
              className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-2"
            >
              <Icon
                className="size-4 shrink-0"
                style={{ color: config.color }}
              />
              <span className="text-sm font-bold tabular-nums">{count}</span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {config.label}
              </span>
            </div>
          );
        })}
      </div>

      <Tabs defaultValue="atividades">
        <TabsList variant="line">
          <TabsTrigger value="atividades">Atividades recentes</TabsTrigger>
          <TabsTrigger value="pessoas">Pessoas registradas</TabsTrigger>
        </TabsList>

        <TabsContent value="atividades" className="pt-2">
          <div className="relative w-full overflow-x-auto">
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

        <TabsContent value="pessoas" className="pt-2">
          <div className="relative w-full overflow-x-auto">
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
                    className="cursor-pointer"
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
  );
}
