"use client";

import { createContext, useContext } from "react";

export interface SessionUser {
  id: string;
  name: string;
  phone: string | null;
  role: string;
  event_id: string;
  team_id: string | null;
}

export interface SessionTeam {
  id: string;
  name: string;
  color: string | null;
}

export interface SessionEvent {
  id: string;
  name: string;
}

export interface SessionData {
  user: SessionUser;
  team: SessionTeam | null;
  event: SessionEvent;
}

const SessionContext = createContext<SessionData | null>(null);

export function SessionProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: SessionData;
}) {
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionData {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return ctx;
}
