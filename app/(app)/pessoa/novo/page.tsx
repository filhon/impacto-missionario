import { createClient } from "@/lib/supabase/server";
import { NovaPessoa } from "./nova-pessoa";

export default async function NovaPessoaPage({
  searchParams,
}: {
  searchParams: Promise<{ consent?: string; activity?: string }>;
}) {
  const { consent, activity } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let neighborhoods: string[] = [];

  if (user) {
    const { data: userData } = await supabase
      .from("users")
      .select("event_id")
      .eq("id", user.id)
      .single();

    if (userData) {
      const { data: raw } = await supabase
        .from("people_reached")
        .select("neighborhood")
        .eq("event_id", userData.event_id)
        .not("neighborhood", "is", null)
        .limit(200);

      const set = new Set<string>();
      for (const row of raw ?? []) {
        if (row.neighborhood) set.add(row.neighborhood);
      }
      neighborhoods = [...set];
    }
  }

  const initialConsentLevel = consent !== undefined ? Number(consent) : null;

  return (
    <NovaPessoa
      initialConsentLevel={initialConsentLevel}
      activityHint={activity ?? undefined}
      neighborhoods={neighborhoods}
    />
  );
}
