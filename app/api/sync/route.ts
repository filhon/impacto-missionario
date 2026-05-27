import { createClient } from "@/lib/supabase/server";
import { type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: userData } = await supabase
    .from("users")
    .select("id, event_id, team_id")
    .eq("id", user.id)
    .single();

  if (!userData) {
    return new Response("User not found", { status: 404 });
  }
  if (!userData.team_id) {
    return new Response("No team assigned", { status: 400 });
  }

  const body = await req.json();
  const events: any[] = Array.isArray(body.events) ? body.events : [];
  const people: any[] = Array.isArray(body.people) ? body.people : [];

  const accepted: string[] = [];
  const duplicates: string[] = [];
  const errors: { client_event_id: string; message: string }[] = [];

  const personIdMap = new Map<string, string>();

  for (const p of people) {
    try {
      const { data, error } = await supabase
        .from("people_reached")
        .upsert(
          {
            client_event_id: p.client_event_id,
            event_id: userData.event_id,
            team_id: userData.team_id,
            registered_by: userData.id,
            consent_level: p.consent_level,
            name: p.name ?? null,
            phone: p.phone ?? null,
            neighborhood: p.neighborhood ?? null,
            city: p.city ?? null,
            need_type: p.need_type ?? null,
            prayer_request: p.prayer_request ?? null,
            conversion_decision: p.conversion_decision ?? null,
            address: p.address ?? null,
            photo_url: p.photo_url ?? null,
            consent_text_shown: p.consent_text_shown ?? null,
            consent_proof_url: p.consent_proof_url ?? null,
            consent_timestamp: p.consent_timestamp ?? null,
          },
          { onConflict: "client_event_id", ignoreDuplicates: false },
        )
        .select("id, client_event_id")
        .single();

      if (error) throw error;

      personIdMap.set(p.client_event_id, data.id);
      accepted.push(p.client_event_id);

      if (p.consent_level >= 2 && p.consent_text_shown) {
        const { data: existing } = await supabase
          .from("consent_logs")
          .select("id")
          .eq("person_id", data.id)
          .maybeSingle();

        if (!existing) {
          await supabase.from("consent_logs").insert({
            person_id: data.id,
            collected_by: userData.id,
            consent_level: p.consent_level,
            text_shown: p.consent_text_shown,
            collected_at: p.consent_timestamp ?? new Date().toISOString(),
          });
        }
      }
    } catch (e: any) {
      if (e?.code === "23505") {
        const { data } = await supabase
          .from("people_reached")
          .select("id")
          .eq("client_event_id", p.client_event_id)
          .single();

        if (data) {
          personIdMap.set(p.client_event_id, data.id);
          duplicates.push(p.client_event_id);
          continue;
        }
      }
      errors.push({
        client_event_id: p.client_event_id,
        message: e?.message ?? "Unknown error",
      });
    }
  }

  for (const ev of events) {
    try {
      const personId = ev.person_client_event_id
        ? (personIdMap.get(ev.person_client_event_id) ?? null)
        : null;

      const { error } = await supabase.from("activity_events").insert({
        client_event_id: ev.client_event_id,
        event_id: userData.event_id,
        team_id: userData.team_id,
        user_id: userData.id,
        activity_type: ev.activity_type,
        count: ev.count ?? 1,
        lat: ev.lat ?? null,
        lng: ev.lng ?? null,
        occurred_at: ev.occurred_at,
        person_id: personId,
        notes: ev.notes ?? null,
      });

      if (error) {
        if (error.code === "23505") {
          duplicates.push(ev.client_event_id);
        } else {
          throw error;
        }
      } else {
        accepted.push(ev.client_event_id);
      }
    } catch (e: any) {
      errors.push({
        client_event_id: ev.client_event_id,
        message: e?.message ?? "Unknown error",
      });
    }
  }

  return Response.json({ accepted, duplicates, errors });
}
