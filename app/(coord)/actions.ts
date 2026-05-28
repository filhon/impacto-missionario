"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Helper: fetch the authenticated coordinator's record.
// Returns null when not authenticated or not a coordinator.
// ---------------------------------------------------------------------------
async function getCoordData(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userData } = await supabase
    .from("users")
    .select("id, role, event_id")
    .eq("id", user.id)
    .single();

  if (!userData || userData.role !== "coord") return null;
  return userData;
}

export async function createTeam(formData: FormData) {
  const supabase = await createClient();
  const coordData = await getCoordData(supabase);
  if (!coordData) return { error: "Não autorizado" };

  const name = formData.get("name") as string;
  const code = formData.get("code") as string;

  if (!name || name.trim().length < 2) {
    return { error: "Nome deve ter pelo menos 2 caracteres" };
  }

  if (!code || !/^\d{4}$/.test(code)) {
    return { error: "Código deve ter exatamente 4 dígitos numéricos" };
  }

  const { error } = await supabase.from("teams").insert({
    event_id: coordData.event_id,
    name: name.trim(),
    code_4dig: code,
    color: "#0ea5e9",
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Este código já está em uso. Gere outro." };
    }
    return { error: "Erro ao criar equipe" };
  }

  revalidatePath("/equipes");
  return { success: true };
}

export async function generateUniqueCode() {
  const supabase = await createClient();
  const coordData = await getCoordData(supabase);
  if (!coordData) return { error: "Não autorizado" };

  for (let attempt = 0; attempt < 20; attempt++) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const { data: existing } = await supabase
      .from("teams")
      .select("id")
      .eq("event_id", coordData.event_id)
      .eq("code_4dig", code)
      .maybeSingle();

    if (!existing) {
      return { code };
    }
  }

  return { error: "Não foi possível gerar código único" };
}

export async function updateTeamName(teamId: string, name: string) {
  const supabase = await createClient();
  const coordData = await getCoordData(supabase);
  if (!coordData) return { error: "Não autorizado" };

  if (!name || name.trim().length < 2) {
    return { error: "Nome deve ter pelo menos 2 caracteres" };
  }

  // Verify the team belongs to the coordinator's own event.
  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("id", teamId)
    .eq("event_id", coordData.event_id)
    .maybeSingle();

  if (!team) return { error: "Equipe não encontrada" };

  const { error } = await supabase
    .from("teams")
    .update({ name: name.trim() })
    .eq("id", teamId);

  if (error) return { error: "Erro ao atualizar nome" };

  revalidatePath("/equipes");
  return { success: true };
}

export async function setTeamLeader(teamId: string, leaderId: string) {
  const supabase = await createClient();
  const coordData = await getCoordData(supabase);
  if (!coordData) return { error: "Não autorizado" };

  // Verify team belongs to coordinator's event.
  const { data: team } = await supabase
    .from("teams")
    .select("id, leader_id")
    .eq("id", teamId)
    .eq("event_id", coordData.event_id)
    .maybeSingle();

  if (!team) return { error: "Equipe não encontrada" };

  // Verify the candidate leader belongs to the coordinator's event.
  const { data: leaderUser } = await supabase
    .from("users")
    .select("id")
    .eq("id", leaderId)
    .eq("event_id", coordData.event_id)
    .maybeSingle();

  if (!leaderUser) return { error: "Usuário não encontrado neste evento" };

  const oldLeaderId = team.leader_id;

  const { error: setLeaderErr } = await supabase
    .from("teams")
    .update({ leader_id: leaderId })
    .eq("id", teamId);

  if (setLeaderErr) return { error: "Erro ao definir líder" };

  // Demote previous leader (if different from new one).
  if (oldLeaderId && oldLeaderId !== leaderId) {
    await supabase
      .from("users")
      .update({ role: "voluntario" })
      .eq("id", oldLeaderId);
  }

  const { error: promoteErr } = await supabase
    .from("users")
    .update({ role: "lider" })
    .eq("id", leaderId);

  if (promoteErr) return { error: "Erro ao promover usuário" };

  revalidatePath("/equipes");
  return { success: true };
}

export async function resetTeamCode(teamId: string) {
  const supabase = await createClient();
  const coordData = await getCoordData(supabase);
  if (!coordData) return { error: "Não autorizado" };

  // Verify team belongs to coordinator's event.
  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("id", teamId)
    .eq("event_id", coordData.event_id)
    .maybeSingle();

  if (!team) return { error: "Equipe não encontrada" };

  for (let attempt = 0; attempt < 20; attempt++) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const { data: existing } = await supabase
      .from("teams")
      .select("id")
      .eq("event_id", coordData.event_id)
      .eq("code_4dig", code)
      .maybeSingle();

    if (!existing) {
      const { error } = await supabase
        .from("teams")
        .update({ code_4dig: code })
        .eq("id", teamId);

      if (error) return { error: "Erro ao resetar código" };

      revalidatePath("/equipes");
      return { success: true, code };
    }
  }

  return { error: "Não foi possível gerar código único" };
}

export async function removeTeamMember(userId: string) {
  const supabase = await createClient();
  const coordData = await getCoordData(supabase);
  if (!coordData) return { error: "Não autorizado" };

  // Verify the target user belongs to the coordinator's event.
  const { data: targetUser } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .eq("event_id", coordData.event_id)
    .maybeSingle();

  if (!targetUser) return { error: "Usuário não encontrado neste evento" };

  const { error } = await supabase
    .from("users")
    .update({ team_id: null, role: "voluntario" })
    .eq("id", userId);

  if (error) return { error: "Erro ao remover membro" };

  revalidatePath("/equipes");
  return { success: true };
}

export async function promoteToLeader(teamId: string, userId: string) {
  return setTeamLeader(teamId, userId);
}
