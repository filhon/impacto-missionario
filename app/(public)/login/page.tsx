import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (data?.user) {
    const { data: userData } = await supabase
      .from("users")
      .select("id")
      .eq("id", data.user.id)
      .single();

    if (userData) {
      redirect("/");
    }

    // Sessão órfã: autenticado mas sem perfil — faz logout e exibe login
    await supabase.auth.signOut();
  }

  return <LoginForm />;
}
