import Dexie, { type Table } from "dexie";
import type { SessionData } from "@/lib/context/session-types";

export type SyncStatus = "pending" | "synced" | "failed";

export interface LocalActivityEvent {
  client_event_id: string;
  activity_type: string;
  count: number;
  lat?: number;
  lng?: number;
  occurred_at: string;
  person_client_event_id?: string;
  notes?: string;
  status: SyncStatus;
  attempts: number;
  last_error?: string;
  next_retry_at?: string;
  created_at: string;
}

export interface LocalPerson {
  client_event_id: string;
  consent_level: 0 | 1 | 2 | 3;
  name?: string;
  phone?: string;
  neighborhood?: string;
  city?: string;
  need_type?: string;
  prayer_request?: string;
  conversion_decision?: boolean;
  address?: string;
  photo_url?: string;
  consent_text_shown?: string;
  consent_proof_url?: string;
  consent_timestamp?: string;
  status: SyncStatus;
  attempts: number;
  last_error?: string;
  next_retry_at?: string;
  created_at: string;
}

export interface LocalSession {
  id: "current";
  user_id: string;
  team_id: string;
  event_id: string;
  role: string;
  jwt?: string;
}

export interface LocalSessionCache {
  id: "current";
  data: SessionData;
}

class ImpactoDB extends Dexie {
  activity_events!: Table<LocalActivityEvent, string>;
  people!: Table<LocalPerson, string>;
  session!: Table<LocalSession, string>;
  sessionCache!: Table<LocalSessionCache, string>;

  constructor() {
    super("impacto-missionario");
    this.version(1).stores({
      activity_events: "client_event_id, status, next_retry_at, created_at",
      people:
        "client_event_id, status, next_retry_at, consent_level, created_at",
      session: "id",
    });
    this.version(2).stores({
      activity_events: "client_event_id, status, next_retry_at, created_at",
      people:
        "client_event_id, status, next_retry_at, consent_level, created_at",
      session: "id",
      sessionCache: "id",
    });
  }
}

// Singleton — only instantiated in the browser; guard prevents SSR evaluation
export const db =
  typeof window !== "undefined"
    ? new ImpactoDB()
    : (null as unknown as ImpactoDB);
