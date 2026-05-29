import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(null, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("id, name, phone, role, event_id, team_id")
      .eq("id", user.id)
      .single();

    if (!userData) {
      return NextResponse.json(null, { status: 401 });
    }

    let teamData: {
      id: string;
      name: string;
      color: string | null;
      code_4dig?: string;
    } | null = null;

    if (userData.team_id) {
      const { data } = await supabase
        .from("teams")
        .select("id, name, color, code_4dig")
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
      return NextResponse.json(null, { status: 401 });
    }

    return NextResponse.json({
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
    });
  } catch {
    return NextResponse.json(null, { status: 500 });
  }
}
