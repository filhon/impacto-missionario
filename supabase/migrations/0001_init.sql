-- Extensions
create extension if not exists "pgcrypto";

-- Events
create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  region text not null,
  created_at timestamptz default now()
);

-- Teams
create table teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  code_4dig text not null,
  color text default '#0ea5e9',
  leader_id uuid,
  created_at timestamptz default now(),
  unique (event_id, code_4dig)
);

-- Users
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  role text not null check (role in ('voluntario','lider','coord')),
  team_id uuid references teams(id),
  event_id uuid not null references events(id),
  created_at timestamptz default now()
);

-- People reached
create table people_reached (
  id uuid primary key default gen_random_uuid(),
  client_event_id uuid not null unique,
  event_id uuid not null references events(id),
  team_id uuid not null references teams(id),
  registered_by uuid not null references users(id),
  consent_level smallint not null check (consent_level between 0 and 3),
  name text,
  phone text,
  neighborhood text,
  city text,
  need_type text,
  prayer_request text,
  conversion_decision boolean default false,
  address text,
  photo_url text,
  consent_text_shown text,
  consent_proof_url text,
  consent_timestamp timestamptz,
  created_at timestamptz default now(),
  check (consent_level >= 2 or (name is null and phone is null and address is null)),
  check (consent_level >= 3 or (photo_url is null and consent_proof_url is null))
);

create index on people_reached (event_id, team_id);
create index on people_reached (consent_level);

-- Activity events (append-only)
create table activity_events (
  id uuid primary key default gen_random_uuid(),
  client_event_id uuid not null unique,
  event_id uuid not null references events(id),
  team_id uuid not null references teams(id),
  user_id uuid not null references users(id),
  activity_type text not null check (activity_type in
    ('biblia','joao','folheto','visita','oracao','conversao','medico','radio')),
  count integer not null default 1 check (count > 0),
  lat double precision,
  lng double precision,
  occurred_at timestamptz not null,
  person_id uuid references people_reached(id),
  notes text,
  created_at timestamptz default now()
);

create index on activity_events (event_id, team_id, occurred_at desc);
create index on activity_events (user_id, occurred_at desc);
create index on activity_events (activity_type, occurred_at desc);

-- Follow-ups
create table follow_ups (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people_reached(id) on delete cascade,
  assigned_to uuid references users(id),
  status text not null default 'pending' check (status in ('pending','contacted','done','opt_out')),
  notes text,
  last_contact_at timestamptz,
  created_at timestamptz default now()
);

-- Consent logs
create table consent_logs (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people_reached(id) on delete cascade,
  collected_by uuid not null references users(id),
  consent_level smallint not null,
  text_shown text not null,
  collected_at timestamptz not null default now()
);

-- Enable RLS
alter table events enable row level security;
alter table teams enable row level security;
alter table users enable row level security;
alter table activity_events enable row level security;
alter table people_reached enable row level security;
alter table follow_ups enable row level security;
alter table consent_logs enable row level security;

-- Helper functions
create or replace function current_user_role()
returns text language sql stable security definer as $$
  select role from users where id = auth.uid();
$$;

create or replace function current_user_team()
returns uuid language sql stable security definer as $$
  select team_id from users where id = auth.uid();
$$;

-- EVENTS
create policy "auth read events" on events for select using (auth.uid() is not null);
create policy "coord manage events" on events for all using (current_user_role() = 'coord');

-- TEAMS
create policy "auth read teams" on teams for select using (auth.uid() is not null);
create policy "coord manage teams" on teams for all using (current_user_role() = 'coord');

-- USERS
create policy "users read self" on users for select using (id = auth.uid());
create policy "lider read team" on users for select using (
  current_user_role() = 'lider' and team_id = current_user_team()
);
create policy "coord read all users" on users for select using (current_user_role() = 'coord');
create policy "users update self" on users for update using (id = auth.uid());

-- ACTIVITY_EVENTS
create policy "user insert own activity" on activity_events for insert
  with check (user_id = auth.uid());
create policy "user read own activity" on activity_events for select
  using (user_id = auth.uid());
create policy "lider read team activity" on activity_events for select using (
  current_user_role() = 'lider' and team_id = current_user_team()
);
create policy "coord read all activity" on activity_events for select
  using (current_user_role() = 'coord');
create policy "coord update activity" on activity_events for update
  using (current_user_role() = 'coord');
create policy "coord delete activity" on activity_events for delete
  using (current_user_role() = 'coord');

-- PEOPLE_REACHED
create policy "user insert own people" on people_reached for insert
  with check (registered_by = auth.uid());
create policy "user read own anon people" on people_reached for select using (
  registered_by = auth.uid() and consent_level <= 1
);
create policy "lider read team people" on people_reached for select using (
  current_user_role() = 'lider' and team_id = current_user_team()
);
create policy "coord read all people" on people_reached for select
  using (current_user_role() = 'coord');
create policy "coord update people" on people_reached for update
  using (current_user_role() = 'coord');

-- FOLLOW_UPS
create policy "lider manage team followups" on follow_ups for all using (
  current_user_role() in ('lider','coord')
);

-- CONSENT_LOGS
create policy "coord read logs" on consent_logs for select
  using (current_user_role() = 'coord');
create policy "user insert log" on consent_logs for insert
  with check (collected_by = auth.uid());
