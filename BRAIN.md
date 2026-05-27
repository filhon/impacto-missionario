# BRAIN.md — Impacto Missionário

> Arquivo central de contexto pra Claude Code. Leia integralmente antes de qualquer sessão. Atualize o "Log de sessão" no fim do arquivo.

## Identidade

- **Projeto:** Impacto Missionário
- **Tipo:** PWA Next.js offline-first
- **Repo:** standalone, fora do monorepo Igreja.app
- **Idioma:** pt-BR (interface e código)
- **Deadline:** primeiro avanço em menos de 7 dias

## Regras invioláveis

1. **Nunca** use `UPDATE` em `activity_events`. Modelo é event-sourced e append-only. Totais saem de `count()`.
2. **Sempre** gere `client_event_id` (UUID v7) no client antes de qualquer INSERT.
3. **Sempre** salve localmente primeiro (Dexie) e depois sincronize. Cliente nunca espera resposta do servidor pra mostrar OK pro usuário.
4. **Nunca** confie em decisão de segurança no client. RLS no Supabase é a fonte da verdade.
5. **Nunca** quebre a regra LGPD: PII (N2/N3) só é mostrada pra papéis com permissão. Voluntário não vê PII de pessoas que outros voluntários registraram.
6. **Sempre** mostre a frase de consentimento padrão em N2/N3 antes do save.
7. **Nunca** delete registros via cliente. Coordenador faz via RPC com log.
8. **Sempre** use TypeScript strict. Sem `any`, exceto em utility wrappers de IndexedDB onde inevitável (e justifique com comentário).
9. **Nunca** introduza dependência nova sem registrar aqui em "Dependências".
10. **Nunca** mexa em RLS sem testar com os 3 papéis (voluntário, líder, coord).
11. **Sempre** comprima imagens client-side antes do upload (< 200kb, max 1280px no maior lado).
12. **Sempre** rode `pnpm typecheck` antes de marcar prompt como concluído.

## Stack lock

```
Next.js              15.x (App Router)
React                19.x
TypeScript           5.x (strict, noUncheckedIndexedAccess)
Tailwind             v4
shadcn/ui            latest
TanStack Query       v5
Dexie.js             v4
Supabase JS          v2
react-pdf            v3 (geração PDF no client)
uuid                 v10 (v7 namespace)
date-fns             v3 (locale pt-BR)
```

Sem Capacitor. Sem Stripe. Sem Resend. Sem Upstash. Sem Framer Motion (cortado pra v2).

## Estrutura de pastas

```
/app
  /(public)
    /login                # entrada por código
  /(app)
    layout.tsx            # auth guard + nav
    page.tsx              # home com botões de atividade
    /atividade/[tipo]
    /pessoa/novo
    /pessoa/[id]
    /sync
    /perfil
  /(lider)
    /equipe
  /(coord)
    /coord
    /coord/equipes
    /coord/export
  /api
    /health
    /sync
/components
  /ui                     # shadcn
  /counters
  /forms
  /dashboards
/lib
  /supabase               # client + server clients
  /dexie                  # schema + helpers
  /sync                   # worker + retry
  /consent                # frases padrão + log helpers
  /pdf                    # geração do relatório
  /uuid                   # wrapper v7
  /image                  # compressão
/types
/public
  manifest.webmanifest
  sw.js
  /icons
/supabase
  /migrations
  seed.sql
```

## Schema Postgres (Supabase)

```sql
-- Extensions
create extension if not exists "pgcrypto";

-- Events (no v1 contém 1 linha)
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

-- Users (perfil, vinculado ao auth.users do Supabase)
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
  -- enforcement de PII por nível
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

-- Consent logs (auditoria LGPD)
create table consent_logs (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people_reached(id) on delete cascade,
  collected_by uuid not null references users(id),
  consent_level smallint not null,
  text_shown text not null,
  collected_at timestamptz not null default now()
);

-- Storage buckets (rode via dashboard ou SQL helper):
-- create bucket 'people-photos' private, autenticado pra ler
```

## RLS policies

```sql
-- Enable RLS em tudo
alter table events enable row level security;
alter table teams enable row level security;
alter table users enable row level security;
alter table activity_events enable row level security;
alter table people_reached enable row level security;
alter table follow_ups enable row level security;
alter table consent_logs enable row level security;

-- Helper functions pra pegar role e team do usuário atual
create or replace function current_user_role()
returns text language sql stable security definer as $$
  select role from users where id = auth.uid();
$$;

create or replace function current_user_team()
returns uuid language sql stable security definer as $$
  select team_id from users where id = auth.uid();
$$;

-- EVENTS (todos autenticados leem)
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

-- CONSENT_LOGS (só coord lê; voluntário insere)
create policy "coord read logs" on consent_logs for select
  using (current_user_role() = 'coord');
create policy "user insert log" on consent_logs for insert
  with check (collected_by = auth.uid());
```

## Activity types enum

```ts
// types/domain.ts
import {
  BookMarked,
  BookOpen,
  FileText,
  DoorOpen,
  HeartHandshake,
  Stethoscope,
  Radio,
  HandHelping,
} from "lucide-react";

export const ACTIVITY_TYPES = {
  biblia: { label: "Bíblia completa", icon: BookMarked, color: "#7c3aed" },
  joao: { label: "Evangelho de João", icon: BookOpen, color: "#0ea5e9" },
  folheto: { label: "Folheto", icon: FileText, color: "#10b981" },
  visita: { label: "Visita porta a porta", icon: DoorOpen, color: "#f59e0b" },
  oracao: { label: "Pedido de oração", icon: HandHelping, color: "#ec4899" },
  conversao: { label: "Conversão", icon: HeartHandshake, color: "#ef4444" },
  medico: { label: "Atendimento médico", icon: Stethoscope, color: "#06b6d4" },
  radio: { label: "Rádio áudio Bíblia", icon: Radio, color: "#8b5cf6" },
} as const;

export type ActivityType = keyof typeof ACTIVITY_TYPES;
export type ConsentLevel = 0 | 1 | 2 | 3;
export type Role = "voluntario" | "lider" | "coord";
```

## Consent levels (frases padrão e UI)

```ts
// lib/consent/texts.ts
export const CONSENT_TEXTS: Record<2 | 3, string> = {
  2: "Você autoriza que eu registre seu nome e WhatsApp pra que nossa equipe entre em contato com você nos próximos meses pra orar e acompanhar você? Você pode pedir pra remover seus dados a qualquer momento.",
  3: "Você autoriza que eu registre seu nome, contato, endereço e foto pra que nossa equipe ofereça acompanhamento pastoral nos próximos 24 meses? Você pode pedir pra remover seus dados a qualquer momento.",
};
```

UI obrigatória em N2/N3:

- Frase em `text-lg md:text-xl` acima do form.
- Checkbox "Li a frase em voz alta e a pessoa concordou".
- Botão "Salvar" só habilita com o checkbox marcado.
- Após save, inserir linha em `consent_logs` na mesma RPC ou request.

## Protocolo de sync

**Endpoint:** `POST /api/sync`

**Request body:**

```ts
{
  events: Array<{
    client_event_id: string; // UUID v7
    activity_type: ActivityType;
    count: number;
    lat?: number;
    lng?: number;
    occurred_at: string; // ISO 8601
    person_client_event_id?: string; // se vinculado a pessoa local ainda não sincronizada
    notes?: string;
  }>;
  people: Array<{
    client_event_id: string;
    consent_level: ConsentLevel;
    // campos opcionais conforme nível
    name?;
    phone?;
    neighborhood?;
    city?;
    need_type?;
    prayer_request?;
    conversion_decision?;
    address?;
    photo_url?;
    consent_text_shown?;
    consent_proof_url?;
    consent_timestamp?;
  }>;
}
```

**Response:**

```ts
{
  accepted: string[];     // client_event_ids
  duplicates: string[];   // já existiam, tratar como sucesso
  errors: Array<{ client_event_id: string; message: string }>;
}
```

**Comportamento server-side:**

- Auth via cookie Supabase.
- People inseridos primeiro (porque events podem referenciar).
- INSERT ... ON CONFLICT (client_event_id) DO NOTHING.
- Pra people com consent_level >= 2, insere também em consent_logs (idempotente — checar por person_id + collected_at).
- Resolve `person_client_event_id` → `person_id` na hora do insert do event.

**Cliente:**

- Worker roda a cada 15s quando `navigator.onLine === true`.
- Batch máximo: 20 events + 20 people.
- Backoff: 15s, 30s, 60s, 2m, 5m, 10m, 30m (max).
- 5xx → retry. 4xx → marca failed pro usuário ver.

## RBAC matrix resumida

| Ação                        | Voluntário | Líder    | Coord |
| --------------------------- | ---------- | -------- | ----- |
| Insert activity próprio     | ✅         | ✅       | ✅    |
| Read activity próprio       | ✅         | ✅       | ✅    |
| Read activity da equipe     | ❌         | ✅       | ✅    |
| Read activity de outras eq. | ❌         | ❌       | ✅    |
| Edit/delete activity        | ❌         | ❌       | ✅    |
| Register pessoa N0/N1       | ✅         | ✅       | ✅    |
| Register pessoa N2/N3       | ✅         | ✅       | ✅    |
| Read PII N2/N3              | ❌         | ✅ (eq.) | ✅    |
| Manage teams                | ❌         | ❌       | ✅    |
| Export CSV/PDF              | ❌         | ❌       | ✅    |

## Variáveis de ambiente

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_EVENT_ID=         # uuid do avanço atual (hardcoded no v1)
NEXT_PUBLIC_APP_NAME=Impacto Missionário
```

## Comandos úteis

```bash
pnpm dev                      # dev local
pnpm typecheck                # validação TS
pnpm lint
pnpm build && pnpm start      # smoke local

# Supabase
supabase db reset             # reset DB local
supabase db push              # aplica migrations no remoto
supabase gen types typescript --local > types/database.ts
```

## Dependências instaladas

(atualizar conforme cada prompt instala algo novo)

- `next`, `react`, `typescript`, `tailwindcss`
- `@supabase/supabase-js`, `@supabase/ssr`
- `@tanstack/react-query`
- `dexie`, `dexie-react-hooks`
- `@react-pdf/renderer`
- `uuid` (v7 namespace)
- `date-fns`
- `lucide-react`
- `browser-image-compression`
- shadcn components: `button`, `input`, `card`, `dialog`, `badge`, `table`, `tabs`, `sheet`, `sonner`, `skeleton`, `checkbox`, `textarea`, `select`, `label`

## Checklist de sessão

Marque conforme avança. Não pule etapas.

- [ ] P0 — Bootstrap (Next.js, deps, Tailwind, shadcn)
- [ ] P1 — Schema + RLS no Supabase + Storage bucket
- [ ] P2 — Tipos gerados + cliente Supabase
- [ ] P3 — Login por código de equipe
- [ ] P4 — Layout shell + nav + auth guard
- [ ] P5 — Tela contadores rápidos
- [ ] P6 — Registro pessoa N0/N1
- [ ] P7 — Registro pessoa N2/N3 + consentimento
- [ ] P8 — Dexie + persistência local
- [ ] P9 — Worker de sync + retry
- [ ] P10 — Dashboard líder
- [ ] P11 — Dashboard coordenador
- [ ] P12 — Export CSV
- [ ] P13 — Export PDF
- [ ] P14 — PWA manifest + offline shell + install prompt
- [ ] P15 — Deploy Vercel + smoke tests + onboarding

## Log de sessão

### 2026-05-26 21:44 — P0 Bootstrap

- Criado projeto Next.js 15 com App Router, TypeScript strict + `noUncheckedIndexedAccess`, Tailwind v4
- Inicializado shadcn/ui (estilo base-nova, zinc, dark mode) e adicionados 14 componentes
- Instaladas todas as dependências de domínio (Supabase, TanStack Query, Dexie, react-pdf, uuid, date-fns, lucide-react, browser-image-compression)
- Configurados ESLint (flat config), Prettier, .env.local com variáveis vazias
- Criada estrutura de pastas conforme BRAIN.md
- README.md em pt-BR com instruções de setup
- Página inicial exibe "Impacto Missionário"

**Decisões:**

- Usado `shadcn@latest` (base-nova + Base UI em vez de Radix) por ser a versão estável atual com suporte a Tailwind v4
- `tw-animate-css` removido por incompatibilidade de resolução com o bundle do Next.js — os componentes funcionam sem animações de entrada/saída
- `@react-pdf/renderer` atualizado para v4 para compatibilidade com React 19
- Estrutura de roteamento usa grupos `(public)`, `(app)`, `(lider)`, `(coord)` conforme BRAIN.md

**Pendente:** Nada — P0 completo.

**Quebra-cabeças:**

- `create-next-app` gerou Next.js 16; resolvido especificando `next@^15` manualmente
- `tw-animate-css` com exports field incompatível com `@tailwindcss/postcss` no bundle Next.js; solução: remover plugin por enquanto

---
