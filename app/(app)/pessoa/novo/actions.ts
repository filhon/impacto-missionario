"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uuidv7 } from "@/lib/uuid/v7";
import { ACTIVITY_TYPES } from "@/types/domain";

export async function checkDuplicatePerson(name: string, phone?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { duplicate: false };

  const { data: userData } = await supabase
    .from("users")
    .select("event_id")
    .eq("id", user.id)
    .single();

  if (!userData) return { duplicate: false };

  const nameNorm = name.trim().toLowerCase();
  const phoneDigits = phone?.replace(/\D/g, "") ?? "";

  // Check by phone (exact match)
  if (phoneDigits.length >= 10) {
    const { data: byPhone } = await supabase
      .from("people_reached")
      .select("id, name, phone")
      .eq("event_id", userData.event_id)
      .eq("phone", phoneDigits)
      .limit(1);

    if (byPhone && byPhone.length > 0) {
      return {
        duplicate: true,
        existingName:
          (byPhone[0] as { name?: string | null }).name ??
          "Pessoa já registrada",
      };
    }
  }

  // Check by name (case-insensitive, same event)
  const { data: byName } = await supabase
    .from("people_reached")
    .select("id, name")
    .eq("event_id", userData.event_id)
    .gte("consent_level", 2)
    .ilike("name", nameNorm)
    .limit(1);

  if (byName && byName.length > 0) {
    return {
      duplicate: true,
      existingName: (byName[0] as { name?: string | null }).name ?? name,
    };
  }

  return { duplicate: false };
}

export interface RegisterPersonInput {
  consentLevel: number;
  activityHint?: string;
  lat?: number;
  lng?: number;
  neighborhood?: string;
  city?: string;
  needType?: string;
  prayerRequest?: string;
  name?: string;
  phone?: string;
  conversionDecision?: boolean;
  consentTextShown?: string;
  address?: string;
  photoUrl?: string;
  consentProofUrl?: string;
  clientEventId?: string;
}

export async function registerPerson(input: RegisterPersonInput) {
  // --- Input validation ---
  if (![0, 1, 2, 3].includes(input.consentLevel)) {
    return { error: "Nível de consentimento inválido" };
  }

  if (input.activityHint && !(input.activityHint in ACTIVITY_TYPES)) {
    return { error: "Tipo de atividade inválido" };
  }
  // --- End validation ---

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data: userData } = await supabase
    .from("users")
    .select("id, event_id, team_id")
    .eq("id", user.id)
    .single();

  if (!userData) return { error: "Usuário não encontrado" };
  if (!userData.team_id) return { error: "Você não está alocado a uma equipe" };

  const clientEventId = input.clientEventId ?? uuidv7();
  const now = new Date().toISOString();

  const { data: person, error } = await supabase
    .from("people_reached")
    .insert({
      client_event_id: clientEventId,
      consent_level: input.consentLevel,
      registered_by: userData.id,
      team_id: userData.team_id,
      event_id: userData.event_id,
      neighborhood: input.neighborhood ?? null,
      city: input.city ?? null,
      need_type: input.needType ?? null,
      prayer_request: input.prayerRequest ?? null,
      name: input.name ?? null,
      phone: input.phone ?? null,
      conversion_decision: input.conversionDecision ?? null,
      consent_text_shown: input.consentTextShown ?? null,
      consent_timestamp: input.consentTextShown ? now : null,
      address: input.address ?? null,
      photo_url: input.photoUrl ?? null,
      consent_proof_url: input.consentProofUrl ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Erro ao inserir people_reached:", error);
    return { error: "Erro ao registrar pessoa" };
  }

  if (input.consentTextShown) {
    const { error: consentError } = await supabase.from("consent_logs").insert({
      person_id: person.id,
      collected_by: userData.id,
      consent_level: input.consentLevel,
      text_shown: input.consentTextShown,
      collected_at: now,
    });

    if (consentError) {
      console.error("Erro ao inserir consent_logs:", consentError);
    }
  }

  if (input.activityHint && person) {
    const { error: activityError } = await supabase
      .from("activity_events")
      .insert({
        client_event_id: uuidv7(),
        event_id: userData.event_id,
        team_id: userData.team_id,
        user_id: userData.id,
        activity_type: input.activityHint,
        count: 1,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        occurred_at: now,
        person_id: person.id,
      });

    if (activityError) {
      console.error("Erro ao inserir activity_event:", activityError);
    }
  }

  redirect(`/pessoa/${person.id}/confirmacao`);
}
