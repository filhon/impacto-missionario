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

export async function markItemFailed(
  clientEventId: string,
  error: string,
): Promise<void> {
  const activity = await db.activity_events.get(clientEventId);
  if (activity) {
    return markActivityFailed(clientEventId, error);
  }
  const person = await db.people.get(clientEventId);
  if (person) {
    return markPersonFailed(clientEventId, error);
  }
}

export async function countSynced(): Promise<{
  activities: number;
  people: number;
}> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [activities, people] = await Promise.all([
    db.activity_events
      .where("status")
      .equals("synced")
      .filter((e) => e.created_at >= since)
      .count(),
    db.people
      .where("status")
      .equals("synced")
      .filter((p) => p.created_at >= since)
      .count(),
  ]);
  return { activities, people };
}

export async function getFailedItems() {
  const [activities, people] = await Promise.all([
    db.activity_events.where("status").equals("failed").toArray(),
    db.people.where("status").equals("failed").toArray(),
  ]);
  const mapped = activities.map((a) => ({
    client_event_id: a.client_event_id,
    type: "Atividade" as const,
    label: a.activity_type,
    error: a.last_error,
    attempts: a.attempts,
  }));
  const mappedPeople = people.map((p) => ({
    client_event_id: p.client_event_id,
    type: "Pessoa" as const,
    label: p.name ?? `N${p.consent_level}`,
    error: p.last_error,
    attempts: p.attempts,
  }));
  return [...mapped, ...mappedPeople];
}

export async function resetItemRetry(clientEventId: string) {
  await Promise.all([
    db.activity_events.update(clientEventId, {
      status: "pending",
      attempts: 0,
      next_retry_at: undefined,
      last_error: undefined,
    }),
    db.people.update(clientEventId, {
      status: "pending",
      attempts: 0,
      next_retry_at: undefined,
      last_error: undefined,
    }),
  ]);
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
