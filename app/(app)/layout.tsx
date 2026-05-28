import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SessionProvider } from "@/lib/context/session";
import { AppHeader } from "@/components/ui/app-header";
import { BottomNav } from "@/components/ui/bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("id, name, phone, role, event_id, team_id")
    .eq("id", user.id)
    .single();

  if (!userData) {
    redirect("/login");
  }

  if (userData.role === "coord") {
    redirect("/coord");
  }

  let teamData: { id: string; name: string; color: string | null } | null =
    null;

  if (userData.team_id) {
    const { data } = await supabase
      .from("teams")
      .select("id, name, color")
      .eq("id", userData.team_id)
      .single();

    teamData = data;
  }

  const { data: eventData } = await supabase
    .from("events")
    .select("id, name")
    .eq("id", userData.event_id)
    .single();

  if (!eventData) {
    redirect("/login");
  }

  return (
    <SessionProvider
      value={{
        user: {
          id: userData.id,
          name: userData.name,
          phone: userData.phone,
          role: userData.role,
          event_id: userData.event_id,
          team_id: userData.team_id,
        },
        team: teamData,
        event: { id: eventData.id, name: eventData.name },
      }}
    >
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="flex-1 pb-20">{children}</main>
        <BottomNav />
      </div>
    </SessionProvider>
  );
}
