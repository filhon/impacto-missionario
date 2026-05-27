import { db, type LocalActivityEvent, type LocalPerson } from "./db";

export async function saveActivityEventLocal(
  data: Omit<LocalActivityEvent, "status" | "attempts" | "created_at">,
): Promise<void> {
  const now = new Date().toISOString();
  await db.activity_events.put({
    ...data,
    status: "pending",
    attempts: 0,
    created_at: now,
  });
}

export async function savePersonLocal(
  data: Omit<LocalPerson, "status" | "attempts" | "created_at">,
): Promise<void> {
  const now = new Date().toISOString();
  await db.people.put({
    ...data,
    status: "pending",
    attempts: 0,
    created_at: now,
  });
}

export async function getPendingActivityEvents(
  limit = 20,
): Promise<LocalActivityEvent[]> {
  return db.activity_events
    .where("status")
    .equals("pending")
    .limit(limit)
    .toArray();
}

export async function getPendingPeople(limit = 20): Promise<LocalPerson[]> {
  return db.people.where("status").equals("pending").limit(limit).toArray();
}

export async function markActivitySynced(ids: string[]): Promise<void> {
  await db.activity_events
    .where("client_event_id")
    .anyOf(ids)
    .modify({ status: "synced" });
}

export async function markPersonSynced(ids: string[]): Promise<void> {
  await db.people
    .where("client_event_id")
    .anyOf(ids)
    .modify({ status: "synced" });
}

export async function markActivityFailed(
  id: string,
  error: string,
): Promise<void> {
  const item = await db.activity_events.get(id);
  if (item) {
    await db.activity_events.put({
      ...item,
      status: "failed",
      last_error: error,
      attempts: item.attempts + 1,
    });
  }
}

export async function markPersonFailed(
  id: string,
  error: string,
): Promise<void> {
  const item = await db.people.get(id);
  if (item) {
    await db.people.put({
      ...item,
      status: "failed",
      last_error: error,
      attempts: item.attempts + 1,
    });
  }
}

export async function countPending(): Promise<{
  activities: number;
  people: number;
}> {
  const [activities, people] = await Promise.all([
    db.activity_events.where("status").equals("pending").count(),
    db.people.where("status").equals("pending").count(),
  ]);
  return { activities, people };
}
