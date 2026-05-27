import { db } from "@/lib/dexie/db";
import {
  getPendingActivityEvents,
  getPendingPeople,
  markActivitySynced,
  markPersonSynced,
  markItemFailed,
} from "@/lib/dexie/repos";

const RETRY_DELAYS = [15, 30, 60, 120, 300, 600, 1800];

export async function syncOnce(): Promise<{ ok: number; failed: number }> {
  if (!navigator.onLine) return { ok: 0, failed: 0 };

  const events = await getPendingActivityEvents(20);
  const people = await getPendingPeople(20);
  if (events.length === 0 && people.length === 0) return { ok: 0, failed: 0 };

  const now = Date.now();
  const eventsToSend = events.filter(
    (e) => !e.next_retry_at || new Date(e.next_retry_at).getTime() <= now,
  );
  const peopleToSend = people.filter(
    (p) => !p.next_retry_at || new Date(p.next_retry_at).getTime() <= now,
  );

  if (eventsToSend.length === 0 && peopleToSend.length === 0) {
    return { ok: 0, failed: 0 };
  }

  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: eventsToSend, people: peopleToSend }),
    });

    if (!res.ok) {
      for (const e of eventsToSend) await scheduleRetry("activity_events", e);
      for (const p of peopleToSend) await scheduleRetry("people", p);
      return { ok: 0, failed: eventsToSend.length + peopleToSend.length };
    }

    const { accepted, duplicates, errors } = await res.json();
    const okIds: string[] = [...(accepted ?? []), ...(duplicates ?? [])];

    const okEventIds = eventsToSend
      .filter((e) => okIds.includes(e.client_event_id))
      .map((e) => e.client_event_id);
    const okPeopleIds = peopleToSend
      .filter((p) => okIds.includes(p.client_event_id))
      .map((p) => p.client_event_id);
    await markActivitySynced(okEventIds);
    await markPersonSynced(okPeopleIds);

    for (const err of errors ?? []) {
      await markItemFailed(err.client_event_id, err.message);
    }

    return { ok: okIds.length, failed: (errors ?? []).length };
  } catch {
    for (const e of eventsToSend) await scheduleRetry("activity_events", e);
    for (const p of peopleToSend) await scheduleRetry("people", p);
    return { ok: 0, failed: eventsToSend.length + peopleToSend.length };
  }
}

async function scheduleRetry(
  table: "activity_events" | "people",
  item: { client_event_id: string; attempts: number },
) {
  const nextAttempt = item.attempts + 1;
  const delaySeconds =
    RETRY_DELAYS[Math.min(nextAttempt - 1, RETRY_DELAYS.length - 1)]!;
  const nextRetryAt = new Date(Date.now() + delaySeconds * 1000).toISOString();

  if (table === "activity_events") {
    await db.activity_events.update(item.client_event_id, {
      attempts: nextAttempt,
      next_retry_at: nextRetryAt,
    });
  } else {
    await db.people.update(item.client_event_id, {
      attempts: nextAttempt,
      next_retry_at: nextRetryAt,
    });
  }
}

let workerInterval: ReturnType<typeof setInterval> | undefined;

export function startSyncWorker() {
  if (workerInterval) return;
  syncOnce();
  workerInterval = setInterval(() => {
    syncOnce();
  }, 15000);
}

export function stopSyncWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = undefined;
  }
}
