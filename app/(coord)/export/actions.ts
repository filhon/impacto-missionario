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
