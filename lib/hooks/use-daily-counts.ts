import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/dexie/db";
import { ACTIVITY_TYPES, type ActivityType } from "@/types/domain";

/** Returns today's date string in BRT (UTC-3) as "YYYY-MM-DD" */
function todayBRT(): string {
  const brt = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return brt.toISOString().slice(0, 10);
}

export type DailyCounts = Record<ActivityType, number>;

const ZERO_COUNTS: DailyCounts = Object.fromEntries(
  Object.keys(ACTIVITY_TYPES).map((k) => [k, 0]),
) as DailyCounts;

export function useDailyCounts(): DailyCounts {
  const counts = useLiveQuery(async () => {
    const today = todayBRT();
    // BRT = UTC-3: BRT midnight = 03:00 UTC; next BRT midnight = next day 03:00 UTC
    const startUTC = today + "T03:00:00.000Z";
    const [y, m, d] = today.split("-").map(Number);
    const nextDay = new Date(Date.UTC(y!, m! - 1, d! + 1));
    const endUTC = nextDay.toISOString().slice(0, 10) + "T02:59:59.999Z";

    const events = await db.activity_events
      .where("created_at")
      .between(startUTC, endUTC, true, true)
      .toArray();

    const result = { ...ZERO_COUNTS };
    for (const ev of events) {
      const t = ev.activity_type as ActivityType;
      if (t in result) {
        result[t] += ev.count;
      }
    }
    return result;
  }, []);

  return counts ?? ZERO_COUNTS;
}
