"use server";

import { createClient } from "@/lib/supabase/server";
import { ACTIVITY_TYPES } from "@/types/domain";

export interface ExportCsvFilters {
  startDate?: string;
  endDate?: string;
  teamIds?: string[];
}

export async function exportCsv(filters: ExportCsvFilters) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data: userData } = await supabase
    .from("users")
    .select("id, role, event_id")
    .eq("id", user.id)
    .single();

  if (!userData || userData.role !== "coord") {
    return { error: "Não autorizado" };
  }

  const eventId = userData.event_id;

  const { data: eventData } = await supabase
    .from("events")
    .select("name")
    .eq("id", eventId)
    .single();

  if (!eventData) return { error: "Evento não encontrado" };

  let query = supabase
    .from("activity_events")
    .select(
      `
      id,
      activity_type,
      count,
      lat,
      lng,
      occurred_at,
      notes,
      teams ( name ),
      users ( name ),
      people_reached ( consent_level, neighborhood, city )
    `,
    )
    .eq("event_id", eventId)
    .order("occurred_at", { ascending: true });

  if (filters.startDate) {
    query = query.gte("occurred_at", `${filters.startDate}T00:00:00`);
  }
  if (filters.endDate) {
    query = query.lte("occurred_at", `${filters.endDate}T23:59:59`);
  }
  if (filters.teamIds && filters.teamIds.length > 0) {
    query = query.in("team_id", filters.teamIds);
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error("Export CSV error:", error);
    return { error: "Erro ao gerar CSV" };
  }

  const csvRows: string[][] = [];

  csvRows.push([
    "event_id",
    "equipe",
    "voluntario",
    "atividade",
    "contagem",
    "lat",
    "lng",
    "data_hora",
    "pessoa_consentimento",
    "pessoa_bairro",
    "pessoa_cidade",
    "notas",
  ]);

  for (const row of rows) {
    const person = row.people_reached as {
      consent_level?: number;
      neighborhood?: string | null;
      city?: string | null;
    } | null;

    const consentLevel = person?.consent_level ?? 0;
    const neighborhood = consentLevel >= 1 ? (person?.neighborhood ?? "") : "";
    const city = consentLevel >= 2 ? (person?.city ?? "") : "";

    csvRows.push([
      row.id,
      (row.teams as { name: string }).name,
      (row.users as { name: string }).name,
      ACTIVITY_TYPES[row.activity_type as keyof typeof ACTIVITY_TYPES]?.label ??
        row.activity_type,
      String(row.count),
      row.lat != null ? String(row.lat) : "",
      row.lng != null ? String(row.lng) : "",
      row.occurred_at ?? "",
      String(consentLevel),
      neighborhood,
      city,
      row.notes ?? "",
    ]);
  }

  const bom = "\uFEFF";
  const csv = bom + csvRows.map(escapeRow).join("\n");

  const sanitizedName = eventData.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const today = new Date().toISOString().slice(0, 10);
  const filename = `impacto-missionario-${sanitizedName}-${today}.csv`;

  return { csv, filename };
}

export interface AggregateReportFilters {
  startDate?: string;
  endDate?: string;
  teamIds?: string[];
}

export interface RelatorioReportData {
  evento: {
    name: string;
    start_date: string;
    end_date: string;
    region: string;
  };
  totais: {
    biblia: number;
    joao: number;
    folheto: number;
    visita: number;
    oracao: number;
    conversao: number;
    medico: number;
    radio: number;
  };
  totalPessoas: number;
  totalConversoes: number;
  bairrosAlcancados: string[];
  porDia: Array<{
    data: string;
    totais: Record<string, number>;
    porEquipe: Array<{ equipe: string; total: number }>;
  }>;
}

export async function aggregateForReport(
  filters: AggregateReportFilters,
): Promise<RelatorioReportData | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data: userData } = await supabase
    .from("users")
    .select("id, role, event_id")
    .eq("id", user.id)
    .single();

  if (!userData || userData.role !== "coord") {
    return { error: "Não autorizado" };
  }

  const eventId = userData.event_id;

  const { data: eventData } = await supabase
    .from("events")
    .select("name, start_date, end_date, region")
    .eq("id", eventId)
    .single();

  if (!eventData) return { error: "Evento não encontrado" };

  let activityQuery = supabase
    .from("activity_events")
    .select("activity_type, count, team_id, occurred_at")
    .eq("event_id", eventId);

  if (filters.startDate) {
    activityQuery = activityQuery.gte(
      "occurred_at",
      `${filters.startDate}T00:00:00`,
    );
  }
  if (filters.endDate) {
    activityQuery = activityQuery.lte(
      "occurred_at",
      `${filters.endDate}T23:59:59`,
    );
  }
  if (filters.teamIds && filters.teamIds.length > 0) {
    activityQuery = activityQuery.in("team_id", filters.teamIds);
  }

  const { data: activityRows } = await activityQuery;

  let peopleQuery = supabase
    .from("people_reached")
    .select(
      "conversion_decision, neighborhood, consent_level, team_id, created_at",
    )
    .eq("event_id", eventId);

  if (filters.startDate) {
    peopleQuery = peopleQuery.gte(
      "created_at",
      `${filters.startDate}T00:00:00`,
    );
  }
  if (filters.endDate) {
    peopleQuery = peopleQuery.lte("created_at", `${filters.endDate}T23:59:59`);
  }
  if (filters.teamIds && filters.teamIds.length > 0) {
    peopleQuery = peopleQuery.in("team_id", filters.teamIds);
  }

  const { data: peopleRows } = await peopleQuery;

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name")
    .eq("event_id", eventId)
    .order("name");

  const teamNames = new Map((teams ?? []).map((t) => [t.id, t.name]));

  const totais: RelatorioReportData["totais"] = {
    biblia: 0,
    joao: 0,
    folheto: 0,
    visita: 0,
    oracao: 0,
    conversao: 0,
    medico: 0,
    radio: 0,
  };

  for (const row of activityRows ?? []) {
    const type = row.activity_type as keyof typeof totais;
    if (type in totais) {
      totais[type] += row.count;
    }
  }

  const totalPessoas = (peopleRows ?? []).length;

  const peopleConversions = (peopleRows ?? []).filter(
    (p) => p.conversion_decision === true,
  ).length;
  const activityConversions = (activityRows ?? []).filter(
    (a) => a.activity_type === "conversao",
  ).length;
  const totalConversoes = peopleConversions + activityConversions;

  const bairrosSet = new Set<string>();
  for (const p of peopleRows ?? []) {
    if (p.consent_level >= 1 && p.neighborhood) {
      bairrosSet.add(p.neighborhood);
    }
  }
  const bairrosAlcancados = Array.from(bairrosSet).sort();

  const dayMap = new Map<
    string,
    { activityTypeMap: Map<string, number>; teamMap: Map<string, number> }
  >();

  for (const row of activityRows ?? []) {
    const day = row.occurred_at.slice(0, 10);
    if (!dayMap.has(day)) {
      dayMap.set(day, {
        activityTypeMap: new Map(),
        teamMap: new Map(),
      });
    }
    const dayData = dayMap.get(day)!;

    dayData.activityTypeMap.set(
      row.activity_type,
      (dayData.activityTypeMap.get(row.activity_type) ?? 0) + row.count,
    );

    const teamName = teamNames.get(row.team_id) ?? row.team_id;
    dayData.teamMap.set(
      teamName,
      (dayData.teamMap.get(teamName) ?? 0) + row.count,
    );
  }

  const porDia: RelatorioReportData["porDia"] = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([data, { activityTypeMap, teamMap }]) => ({
      data,
      totais: Object.fromEntries(activityTypeMap),
      porEquipe: Array.from(teamMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([equipe, total]) => ({ equipe, total })),
    }));

  return {
    evento: {
      name: eventData.name,
      start_date: eventData.start_date,
      end_date: eventData.end_date,
      region: eventData.region,
    },
    totais,
    totalPessoas,
    totalConversoes,
    bairrosAlcancados,
    porDia,
  };
}

function escapeCell(value: string): string {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function escapeRow(row: string[]): string {
  return row.map(escapeCell).join(",");
}
