"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { uuidv7 } from "@/lib/uuid/v7";

// ---------------------------------------------------------------------------
// In-process rate limiter: 5 login attempts per IP per 10 minutes.
// Resets on process restart (acceptable for this deployment scale).
// ---------------------------------------------------------------------------
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const ipAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipAttempts.get(ip);

  if (!entry || entry.resetAt <= now) {
    ipAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;

  entry.count += 1;
  return true;
}

export async function loginWithCode(formData: FormData) {
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return {
      error: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    };
  }

  const code = formData.get("code") as string;
  const name = formData.get("name") as string;
  const phone = (formData.get("phone") as string) || undefined;

  if (!code || !/^\d{4}$/.test(code)) {
    return { error: "Código inválido" };
  }

  if (!name || name.trim().length < 2) {
    return { error: "Nome deve ter pelo menos 2 caracteres" };
  }

  const serviceClient = createServiceClient();
  const eventId = process.env.NEXT_PUBLIC_EVENT_ID!;

  const { data: team, error: teamError } = await serviceClient
    .from("teams")
    .select("id")
    .eq("event_id", eventId)
    .eq("code_4dig", code)
    .maybeSingle();

  if (teamError || !team) {
    return { error: "Código inválido" };
  }

  const email = `vol-${uuidv7()}@impacto.local`;
  const password =
    crypto.randomUUID().replace(/-/g, "") +
    crypto.randomUUID().replace(/-/g, "");

  const { data: authData, error: authError } =
    await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    return { error: "Erro ao criar usuário" };
  }

  const { error: userError } = await serviceClient.from("users").insert({
    id: authData.user.id,
    name: name.trim(),
    phone: phone || null,
    role: "voluntario",
    team_id: team.id,
    event_id: eventId,
  });

  if (userError) {
    return { error: "Erro ao criar perfil" };
  }

  const serverClient = await createClient();

  const { error: signInError } = await serverClient.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return { error: "Erro ao criar sessão" };
  }

  revalidatePath("/");
  redirect("/");
}
