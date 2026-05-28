"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function undoActivityEvent(
  clientEventId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const service = createServiceClient();

  const { error } = await service
    .from("activity_events")
    .delete()
    .eq("client_event_id", clientEventId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Erro ao desfazer activity_event:", error);
    return { error: error.message };
  }

  return {};
}
