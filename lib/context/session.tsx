"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import type { SessionData } from "./session-types";

export type {
  SessionUser,
  SessionTeam,
  SessionEvent,
  SessionData,
} from "./session-types";

type SessionState =
  | { status: "loading" }
  | { status: "ready"; data: SessionData }
  | { status: "unauthenticated" };

const SessionContext = createContext<SessionState>({ status: "loading" });

async function loadFromDexieCache(): Promise<SessionData | null> {
  try {
    const { db } = await import("@/lib/dexie/db");
    const stored = await db.sessionCache.get("current");
    return stored?.data ?? null;
  } catch {
    return null;
  }
}

async function fetchFromServer(): Promise<SessionData | null> {
  try {
    const res = await fetch("/api/session", { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function persistToCache(data: SessionData): Promise<void> {
  try {
    const { db } = await import("@/lib/dexie/db");
    await db.sessionCache.put({ id: "current", data });
  } catch {
    // non-fatal
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading" });
  const router = useRouter();

  const loadSession = useCallback(async () => {
    if (navigator.onLine) {
      const serverData = await fetchFromServer();
      if (serverData) {
        setState({ status: "ready", data: serverData });
        await persistToCache(serverData);
        return;
      }
      // online but server returned no session → unauthenticated
      router.replace("/login");
      setState({ status: "unauthenticated" });
      return;
    }

    // offline: use cached session
    const cached = await loadFromDexieCache();
    if (cached) {
      setState({ status: "ready", data: cached });
      return;
    }

    // offline with no cache
    router.replace("/login");
    setState({ status: "unauthenticated" });
  }, [router]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  if (state.status === "loading") return null;
  return (
    <SessionContext.Provider value={state}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionData {
  const ctx = useContext(SessionContext);
  if (ctx.status !== "ready") {
    throw new Error("useSession must be used within a ready SessionProvider");
  }
  return ctx.data;
}
