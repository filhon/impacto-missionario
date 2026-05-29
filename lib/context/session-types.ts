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
  code_4dig?: string;
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
