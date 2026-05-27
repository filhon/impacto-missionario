import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { uuidv7 } from "@/lib/uuid/v7";
import type { ActivityType } from "@/types/domain";

interface InsertActivityEventsParams {
  activityType: ActivityType;
  count: number;
  lat: number | null;
  lng: number | null;
  userId: string;
  teamId: string;
  eventId: string;
}

export function useInsertActivityEvents() {
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      activityType,
      count,
      lat,
      lng,
      userId,
      teamId,
      eventId,
    }: InsertActivityEventsParams) => {
      const now = new Date().toISOString();

      const records = Array.from({ length: count }, () => ({
        client_event_id: uuidv7(),
        activity_type: activityType,
        count: 1,
        lat,
        lng,
        occurred_at: now,
        user_id: userId,
        team_id: teamId,
        event_id: eventId,
      }));

      const { error } = await supabase.from("activity_events").insert(records);

      if (error) throw error;
    },
  });
}
