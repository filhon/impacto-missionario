"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado" };
  }

  const name = formData.get("name") as string;
  const phone = (formData.get("phone") as string) || null;

  if (!name || name.trim().length < 2) {
    return { error: "Nome deve ter pelo menos 2 caracteres" };
  }

  const { error } = await supabase
    .from("users")
    .update({ name: name.trim(), phone })
    .eq("id", user.id);

  if (error) {
    return { error: "Erro ao atualizar perfil" };
  }

  revalidatePath("/perfil");
  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
