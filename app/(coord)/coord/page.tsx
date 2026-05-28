"use client";

import { useSession } from "@/lib/context/session";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { ACTIVITY_TYPES, type ActivityType } from "@/types/domain";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { MapPoint } from "@/components/activity-map";

const ActivityMap = dynamic(() => import("@/components/activity-map"), {
  ssr: false,
  loading: () => (
    <div className="h-80 w-full animate-pulse rounded-lg bg-muted" />
  ),
});
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Users, Heart, MapPin } from "lucide-react";

type TeamInfo = {
  id: string;
  name: string;
  code_4dig: string;
  color: string | null;
  leader_id: string | null;
};

type ActivityRow = {
  id: string;
  count: number;
  activity_type: string;
  team_id: string;
  user_id: string;
  occurred_at: string;
  lat: number | null;
  lng: number | null;
};

type PersonRow = {
  id: string;
  conversion_decision: boolean | null;
  neighborhood: string | null;
  consent_level: number;
  team_id: string;
};

type UserRow = {
  id: string;
  name: string;
  team_id: string | null;
};

const ALL_VALUE = "__all__";

export default function CoordDashboard() {
  const { event } = useSession();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [teamFilter, setTeamFilter] = useState(ALL_VALUE);
  const [typeFilter, setTypeFilter] = useState(ALL_VALUE);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { isPending: eventInfoPending } = useQuery({
    queryKey: ["coord", event?.id, "event-info"],
    queryFn: async () => {
      if (!event?.id) return null;
      const supabase = createClient();
      const { data } = await supabase
        .from("events")
        .select("start_date, end_date")
        .eq("id", event.id)
        .single();
      return data;
    },
    enabled: !!event?.id,
  });

  const { data: teams } = useQuery({
    queryKey: ["coord", event?.id, "teams"],
    queryFn: async () => {
      if (!event?.id) return [];
      const supabase = createClient();
      const { data } = await supabase
        .from("teams")
        .select("id, name, code_4dig, color, leader_id")
        .eq("event_id", event.id)
        .order("name");
      return (data ?? []) as TeamInfo[];
    },
    enabled: !!event?.id,
  });

  const { data: activityRows } = useQuery({
    queryKey: [
      "coord",
      event?.id,
      "activities",
      startDate,
      endDate,
      teamFilter,
      typeFilter,
    ],
    queryFn: async () => {
      if (!event?.id) return [];
      const supabase = createClient();
      let query = supabase
        .from("activity_events")
        .select(
          "id, count, activity_type, team_id, user_id, occurred_at, lat, lng",
        )
        .eq("event_id", event.id);

      if (startDate) {
        query = query.gte("occurred_at", `${startDate}T00:00:00`);
      }
      if (endDate) {
        query = query.lte("occurred_at", `${endDate}T23:59:59`);
      }
      if (teamFilter !== ALL_VALUE) {
        query = query.eq("team_id", teamFilter);
      }
      if (typeFilter !== ALL_VALUE) {
        query = query.eq("activity_type", typeFilter);
      }

      const { data } = await query;
      return (data ?? []) as ActivityRow[];
    },
    enabled: !!event?.id && !eventInfoPending,
  });

  const { data: peopleRows } = useQuery({
    queryKey: ["coord", event?.id, "people", startDate, endDate, teamFilter],
    queryFn: async () => {
      if (!event?.id) return [];
      const supabase = createClient();
      let query = supabase
        .from("people_reached")
        .select("id, conversion_decision, neighborhood, consent_level, team_id")
        .eq("event_id", event.id);

      if (startDate) {
        query = query.gte("created_at", `${startDate}T00:00:00`);
      }
      if (endDate) {
        query = query.lte("created_at", `${endDate}T23:59:59`);
      }
      if (teamFilter !== ALL_VALUE) {
        query = query.eq("team_id", teamFilter);
      }

      const { data } = await query;
      return (data ?? []) as PersonRow[];
    },
    enabled: !!event?.id && !eventInfoPending,
  });

  const { data: users } = useQuery({
    queryKey: ["coord", event?.id, "users"],
    queryFn: async () => {
      if (!event?.id) return [];
      const supabase = createClient();
      const { data } = await supabase
        .from("users")
        .select("id, name, team_id")
        .eq("event_id", event.id);
      return (data ?? []) as UserRow[];
    },
    enabled: !!event?.id,
  });

  const { data: lastActivityPerUser } = useQuery({
    queryKey: ["coord", event?.id, "last-activity-per-user"],
    queryFn: async () => {
      if (!event?.id) return new Map<string, string>();
      const supabase = createClient();
      const { data } = await supabase
        .from("activity_events")
        .select("user_id, occurred_at")
        .eq("event_id", event.id)
        .order("occurred_at", { ascending: false })
        .limit(2000); // cap to prevent large transfers on big events

      if (!data) return new Map();

      const map = new Map<string, string>();
      const seen = new Set<string>();
      for (const row of data) {
        if (!seen.has(row.user_id)) {
          seen.add(row.user_id);
          map.set(row.user_id, row.occurred_at);
        }
      }
      return map;
    },
    enabled: !!event?.id,
  });

  const { data: totalPerTeam } = useQuery({
    queryKey: ["coord", event?.id, "team-totals"],
    queryFn: async () => {
      if (!event?.id) return new Map<string, number>();
      const supabase = createClient();
      const { data } = await supabase
        .from("activity_events")
        .select("team_id, count")
        .eq("event_id", event.id);

      if (!data) return new Map();

      const map = new Map<string, number>();
      for (const row of data) {
        map.set(row.team_id, (map.get(row.team_id) ?? 0) + row.count);
      }
      return map;
    },
    enabled: !!event?.id,
  });

  const { data: peopleCountPerTeam } = useQuery({
    queryKey: ["coord", event?.id, "team-people-count"],
    queryFn: async () => {
      if (!event?.id) return new Map<string, number>();
      const supabase = createClient();
      const { data } = await supabase
        .from("people_reached")
        .select("team_id")
        .eq("event_id", event.id);

      if (!data) return new Map();

      const map = new Map<string, number>();
      for (const row of data) {
        map.set(row.team_id, (map.get(row.team_id) ?? 0) + 1);
      }
      return map;
    },
    enabled: !!event?.id,
  });

  const kpis = useMemo(() => {
    const totalActivities = (activityRows ?? []).reduce(
      (sum, r) => sum + r.count,
      0,
    );

    const totalPeople = (peopleRows ?? []).length;

    const peopleConversions = (peopleRows ?? []).filter(
      (p) => p.conversion_decision === true,
    ).length;
    const activityConversions = (activityRows ?? []).filter(
      (a) => a.activity_type === "conversao",
    ).length;
    const totalConversions = peopleConversions + activityConversions;

    const neighborhoods = new Set(
      (peopleRows ?? [])
        .filter((p) => p.consent_level >= 1 && p.neighborhood)
        .map((p) => p.neighborhood),
    );

    return {
      totalActivities,
      totalPeople,
      totalConversions,
      uniqueNeighborhoods: neighborhoods.size,
    };
  }, [activityRows, peopleRows]);

  const barChartData = useMemo(() => {
    if (!teams || !totalPerTeam) return [];

    return teams
      .map((team) => ({
        name: team.name,
        total: totalPerTeam.get(team.id) ?? 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [teams, totalPerTeam]);

  const lineChartData = useMemo(() => {
    if (!activityRows) return [];

    const dayMap = new Map<string, number>();
    for (const row of activityRows) {
      const day = format(new Date(row.occurred_at), "yyyy-MM-dd");
      dayMap.set(day, (dayMap.get(day) ?? 0) + row.count);
    }

    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({
        date,
        total,
      }));
  }, [activityRows]);

  const mapPoints = useMemo<MapPoint[]>(() => {
    if (!activityRows) return [];
    return activityRows
      .filter((r) => r.lat != null && r.lng != null)
      .map((r) => ({
        lat: r.lat as number,
        lng: r.lng as number,
        activity_type: r.activity_type,
        occurred_at: r.occurred_at,
      }));
  }, [activityRows]);

  const teamsTableData = useMemo(() => {
    if (!teams) return [];

    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    ).toISOString();

    return teams.map((team) => {
      const leader = users?.find((u) => u.id === team.leader_id);
      const teamMembers = users?.filter((u) => u.team_id === team.id) ?? [];

      const teamLastActivity = lastActivityPerUser
        ? Array.from(lastActivityPerUser.entries())
            .filter(([userId]) => teamMembers.some((m) => m.id === userId))
            .sort(
              ([, a], [, b]) => new Date(b).getTime() - new Date(a).getTime(),
            )
        : [];

      const lastActivityRaw = teamLastActivity[0]?.[1] ?? null;

      const activeVolunteers = lastActivityPerUser
        ? Array.from(lastActivityPerUser.entries()).filter(
            ([userId, occurredAt]) =>
              teamMembers.some((m) => m.id === userId) &&
              occurredAt >= twentyFourHoursAgo,
          ).length
        : 0;

      return {
        id: team.id,
        name: team.name,
        code: team.code_4dig,
        leaderName: leader?.name ?? "—",
        activeVolunteers,
        totalRecords: totalPerTeam?.get(team.id) ?? 0,
        lastActivity: lastActivityRaw
          ? formatDistanceToNow(new Date(lastActivityRaw), {
              addSuffix: true,
              locale: ptBR,
            })
          : "—",
      };
    });
  }, [teams, users, lastActivityPerUser, totalPerTeam]);

  if (!event?.id) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <p className="text-sm text-muted-foreground">Evento não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
      </div>

      <div className="sticky top-12 z-40 -mx-4 bg-background px-4 py-2 shadow-sm">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg
            className={`size-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 4h18M7 8h10M11 12h2"
            />
          </svg>
          Filtros
          {(teamFilter !== ALL_VALUE || typeFilter !== ALL_VALUE) && (
            <span className="flex size-2 rounded-full bg-primary" />
          )}
        </button>

        {filtersOpen && (
          <div className="mt-2 flex flex-wrap items-center gap-2 pb-1">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                De
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Até
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              />
            </div>
            <Select
              value={teamFilter}
              onValueChange={(v) => v && setTeamFilter(v)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Todas as equipes</SelectItem>
                {teams?.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={typeFilter}
              onValueChange={(v) => v && setTypeFilter(v)}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Todos os tipos</SelectItem>
                {(
                  Object.entries(ACTIVITY_TYPES) as [
                    ActivityType,
                    { label: string; color: string },
                  ][]
                ).map(([type, config]) => (
                  <SelectItem key={type} value={type}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Activity className="size-3.5" />
            <span>Atividades</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums leading-none">
            {kpis.totalActivities}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Users className="size-3.5" />
            <span>Pessoas</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums leading-none">
            {kpis.totalPeople}
          </p>
        </div>
        <div className="col-span-2 rounded-2xl border border-primary/25 bg-primary/8 p-4 md:col-span-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Heart className="size-3.5" />
            <span>Conversões</span>
          </div>
          <p className="mt-2 text-[2rem] font-bold tabular-nums leading-none text-primary">
            {kpis.totalConversions}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <MapPin className="size-3.5" />
            <span>Bairros</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums leading-none">
            {kpis.uniqueNeighborhoods}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Total por equipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            {barChartData.every((d) => d.total === 0) ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                Nenhum dado disponível
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barChartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    className="text-xs text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    className="text-xs text-muted-foreground"
                  />
                  <Tooltip />
                  <Bar
                    dataKey="total"
                    fill="var(--color-primary, hsl(33 85% 34%))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Total por dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lineChartData.every((d) => d.total === 0) ||
            lineChartData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                Nenhum dado disponível
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={lineChartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    className="text-xs text-muted-foreground"
                    tickFormatter={(val) => format(new Date(val), "dd/MM")}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    className="text-xs text-muted-foreground"
                  />
                  <Tooltip
                    labelFormatter={(val) =>
                      format(new Date(val), "dd/MM/yyyy", { locale: ptBR })
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="var(--color-primary, hsl(33 85% 34%))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Atividades no mapa
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          {mapPoints.length === 0 ? (
            <div className="flex h-80 items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
              Nenhuma atividade com localização registrada
            </div>
          ) : (
            <ActivityMap points={mapPoints} />
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Equipes</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Líder</TableHead>
                <TableHead>Ativos (24h)</TableHead>
                <TableHead>Registros</TableHead>
                <TableHead>Última atividade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamsTableData.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    Nenhuma equipe encontrada.
                  </TableCell>
                </TableRow>
              )}
              {teamsTableData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap font-medium">
                    {row.name}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono tracking-wider">
                    {row.code}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {row.leaderName}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {row.activeVolunteers}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {row.totalRecords}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {row.lastActivity}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
