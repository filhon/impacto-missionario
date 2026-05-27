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
date-fns             v4 (locale pt-BR)
recharts             v2
```

Sem Capacitor. Sem Stripe. Sem Resend. Sem Upstash. Sem Framer Motion (cortado pra v2).

## Estrutura de pastas

```
/app
  /(public)
    /login                # entrada por código
  /(app)
    layout.tsx            # auth guard + nav
    page.tsx              # home grid 2x4 de contadores
    /atividade/[tipo]
    /pessoa/novo
    /pessoa/[id]
    /sync
    /perfil
      page.tsx            # editar perfil + sair
      actions.ts          # updateProfile, signOut
  providers.tsx           # QueryClient + Toaster
  /(lider)
    layout.tsx            # role guard (lider/coord) + SessionProvider
    /equipe
      page.tsx            # dashboard líder (KPIs, tabelas, Tabs)
  /(coord)
    /coord
    /coord/equipes
    /coord/export
  /api
    /health
    /sync
/components
  /ui                     # shadcn + app custom (app-header, bottom-nav)
  /counters
  /forms
  /dashboards
/lib
  /context
    session.tsx           # SessionProvider + useSession
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
export const ACTIVITY_TYPES = {
  biblia: { label: "Bíblia completa", color: "#7c3aed", icon: "Book" },
  joao: { label: "Evangelho de João", color: "#0ea5e9", icon: "BookOpenText" },
  folheto: { label: "Folheto", color: "#10b981", icon: "FileText" },
  visita: { label: "Visita porta a porta", color: "#f59e0b", icon: "DoorOpen" },
  oracao: { label: "Pedido de oração", color: "#ec4899", icon: "HandHeart" },
  conversao: { label: "Conversão", color: "#ef4444", icon: "Heart" },
  medico: {
    label: "Atendimento médico",
    color: "#06b6d4",
    icon: "Stethoscope",
  },
  radio: { label: "Rádio áudio Bíblia", color: "#8b5cf6", icon: "Radio" },
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
- `@types/uuid`
- `date-fns`
- `lucide-react`
- `browser-image-compression`
- `recharts`
- shadcn components: `button`, `input`, `card`, `dialog`, `badge`, `table`, `tabs`, `sheet`, `sonner`, `skeleton`, `checkbox`, `textarea`, `select`, `label`

## Checklist de sessão

Marque conforme avança. Não pule etapas.

- [x] P0 — Bootstrap (Next.js, deps, Tailwind, shadcn)
- [x] P1 — Schema + RLS no Supabase + Storage bucket
- [x] P2 — Tipos gerados + cliente Supabase
- [x] P3 — Login por código de equipe
- [x] P4 — Layout shell + nav + auth guard
- [x] P5 — Tela contadores rápidos
- [x] P6 — Registro pessoa N0/N1
- [x] P7 — Registro pessoa N2/N3 + consentimento
- [x] P8 — Dexie + persistência local
- [x] P9 — Worker de sync + retry
- [x] P10 — Dashboard líder
- [x] P11 — Dashboard coordenador
- [ ] P12 — Export CSV
- [ ] P13 — Export PDF
- [ ] P14 — PWA manifest + offline shell + install prompt
- [ ] P15 — Deploy Vercel + smoke tests + onboarding

## Log de sessão

### 2026-05-27 — P11 Dashboard coordenador

- **Nova dependência:** `recharts@2.15.4` (gráficos de barra e linha)
- Criado `app/(coord)/layout.tsx` — server component que valida role `coord` (redireciona `/` se não for), busca user/team/event, fornece `SessionProvider` + `AppHeader` + `CoordBottomNav`
- Criado `components/ui/coord-bottom-nav.tsx` — bottom nav específica do coord com links Dashboard (`/coord`) e Equipes (`/equipes`)
- Criado `app/(coord)/actions.ts` — 7 server actions:
  - `createTeam(formData)` — insere team com `event_id`, `name` e `code_4dig` único; trata erro `23505` (duplicate code)
  - `generateUniqueCode()` — loop até 20 tentativas gerando `Math.floor(1000 + Math.random() * 9000)`, checa unicidade via `maybeSingle()`
  - `updateTeamName(teamId, name)` — valida nome ≥ 2 chars, atualiza `teams.name`
  - `setTeamLeader(teamId, leaderId)` — atualiza `teams.leader_id` + rebaixa líder anterior (`role → voluntario`) + promove novo (`role → lider`)
  - `resetTeamCode(teamId)` — gera novo código único (mesmo loop de `generateUniqueCode`), atualiza `teams.code_4dig`
  - `removeTeamMember(userId)` — zera `team_id` e `role` do usuário
  - `promoteToLeader(teamId, userId)` — delegada a `setTeamLeader`
  - Todas autenticam via `supabase.auth.getUser()` + validam role coord
  - Todas chamam `revalidatePath("/equipes")` após sucesso
- Criado `app/(coord)/coord/page.tsx` — client component dashboard:
  - **4 KPIs** em grid 2×2 (md:4×1): Total de atividades (`SUM(count)`), Pessoas alcançadas (`count`), Conversões (people com `conversion_decision=true` + activities `conversao`), Bairros únicos (distinct `neighborhood` onde `consent_level >= 1`)
  - **Gráfico de barras** (Recharts `BarChart`): eixo X = nome da equipe, eixo Y = total de `count`, ordenado decrescente
  - **Gráfico de linha** (Recharts `LineChart`): eixo X = data (`dd/MM`), eixo Y = total, agrupado por `date_trunc('day')` via client-side `format(occurred_at, "yyyy-MM-dd")`
  - **Tabela "Equipes"**: 6 colunas — Nome, Código (`font-mono tracking-wider`), Líder (join `users` por `leader_id`, "—" se null), Voluntários ativos (24h via `lastActivityPerUser`), Total registros, Última atividade (`formatDistanceToNow` com locale `ptBR`)
  - **Filtros sticky** (`position: sticky top-12`): date range (inputs `type="date"` com fallback para `events.start_date/end_date`), Select equipe (base-ui `Select` com "Todas as equipes" default), Select tipo (todos `ACTIVITY_TYPES`)
  - Queries TanStack Query com dependência de filtros nas queryKeys para re-fetch automático
  - Bar/Line chart mostram "Nenhum dado disponível" quando array vazio
- Criado `app/(coord)/equipes/page.tsx` — client component gestão de equipes:
  - **Lista de cards** em grid 1×1 (md:2×1), cada card com: bolinha colorida, nome, botão editar nome (dialog com input + salvar), código grande (`text-lg font-mono tracking-widest`), contagem de membros, botão "Resetar código" (com `window.confirm`), linha do líder com "—" se null + botão "Definir líder" (dialog com `Select` de membros da equipe)
  - **Modal "Nova equipe"** (`Dialog`): input nome + input código 4 dígitos com botão "Gerar" que chama `generateUniqueCode()` server action com loading spinner + botão "Criar equipe" (disabled enquanto criando ou vazio)
  - **Lista expansível de membros**: toggle chevron, exibe cada membro com badge de role (`lider`/`coord` em amarelo/roxo), botão "Promover a líder" (se `voluntario`) e botão remover (ícone `Trash2` vermelho, não disponível para coord)
  - Todas as mutações chamam `queryClient.invalidateQueries({ queryKey: ["coord", event?.id] })` após sucesso
  - Usa TanStack Query para buscar teams, users e memberCounts
- `pnpm typecheck` passa sem erros

**Decisões:**

- `CoordBottomNav` separado do `BottomNav` genérico porque coord precisa de links diferentes (Dashboard, Equipes) — route groups não compartilham layout então componente separado é mais limpo que prop-drilling
- Filtros usam estado local `useState` em vez de search params porque são específicos da página e não precisam de URL compartilhável
- `formatDistanceToNow` (date-fns v4) com `locale: ptBR` e `addSuffix: true` gera "há 5 minutos" / "há 2 horas" na coluna última atividade
- Gráficos Recharts usam `ResponsiveContainer` com altura fixa 240px + fallback textual quando sem dados
- Dialog de reset de código usa `window.confirm` nativo (simples, sem dependência extra de estado) — pode ser refinado com Dialog de confirmação customizado em versão futura

**Pendente:** Nada — P11 completo.

---

### 2026-05-27 — P10 Dashboard líder

- Modificado `lib/context/session.tsx` — adicionado `code_4dig?: string` opcional ao tipo `SessionTeam` para disponibilizar código da equipe no contexto
- Criado `app/(lider)/layout.tsx` — server component que valida role do usuário:
  - Busca user via `createClient()` Supabase SSR
  - Redireciona para `/login` se não autenticado
  - Redireciona para `/` se role não for `lider` nem `coord`
  - Busca dados da equipe (`name`, `color`, `code_4dig`) e do evento (`name`)
  - Renderiza `SessionProvider` + `AppHeader` + `main` + `BottomNav`
- Criado `app/(lider)/equipe/page.tsx` — client component dashboard líder:
  - **Header**: nome da equipe, código 4 dígitos (com botão copiar via `navigator.clipboard` + toast), total geral de atividades (soma de `count`), total de pessoas (`count` com `head: true`)
  - **Grid 4×2 KPI cards**: 8 cards via `Card size="sm"`, um por `activity_type`, com ícone Lucide colorido, label e contagem agregada via `useMemo`
  - **Tabs** (`@base-ui/react/tabs` com `variant="line"`): "Atividades recentes" | "Pessoas registradas"
  - **Tab Atividades**: tabela das últimas 50 entradas com colunas Voluntário (join `users!activity_events_user_id_fkey`), Atividade (label + ícone), Qtd, Data/Hora (formatada via `date-fns` com locale pt-BR `dd/MM HH:mm`), GPS (link `maps.google.com?q=lat,lng` em nova aba se existir, senão "—")
  - **Tab Pessoas**: tabela das últimas 50 pessoas com colunas Nome ("Anônimo" itálico se N0/N1), Consentimento (badge com estilo próprio: N0 cinza `bg-muted`, N1 azul, N2 amarelo, N3 verde), Registrado por (join `users!people_reached_registered_by_fkey`), Bairro, Data; click na linha (apenas N2+) → `router.push('/pessoa/[id]')`
  - **TanStack Query**: 4 queries com `queryKey: ['equipe', teamId, ...]`, `staleTime: 30s` (herdado do provider), `refetchInterval: 60s` para auto-refresh
  - **Invalidação**: listener `window.addEventListener('sync-complete', ...)` invalida todas as queries `['equipe']` após sync bem-sucedido
- Modificado `lib/sync/worker.ts` — dispatch de `CustomEvent('sync-complete')` no `window` após `markActivitySynced`/`markPersonSynced` quando `okIds.length > 0`
- `tsc --noEmit` passa sem erros

**Decisões:**

- Lider layout replica o padrão do `(app)/layout.tsx` (SessionProvider + AppHeader + BottomNav) porque route groups são independentes — não há herança de layout entre `(app)` e `(lider)`
- Queries TanStack Query com `refetchInterval: 60s` garantem atualização automática com delay máximo aceitável; o evento `sync-complete` acelera a invalidação imediatamente após sync
- Join de nomes usa alias do Supabase (`volunteer:users!activity_events_user_id_fkey(name)`) para evitar conflito com colunas da tabela principal e manter o resultado legível
- Badges de consent_level usam classes Tailwind diretas em vez de `Badge` component com variantes porque as cores N0-N3 não mapeiam para as variantes semânticas do badge (default/secondary/destructive)

**Pendente:** Nada — P10 completo.

---

### 2026-05-27 — P9 Worker de sync + retry

- Criado `app/api/sync/route.ts` — `POST /api/sync` endpoint:
  - Autentica via `createClient()` do Supabase SSR, busca `event_id` + `team_id` do usuário
  - Valida body com arrays `events` e `people`
  - People: `upsert({ onConflict: 'client_event_id', ignoreDuplicates: false })` — insere ou atualiza, mapeia `client_event_id` local → `person_id` do servidor
  - Consent_logs: insere apenas se não existir registro para `person_id` (idempotência via `maybeSingle()`)
  - Events: `insert` com tratamento de `23505` (duplicate key → adiciona a `duplicates`)
  - Retorna `{ accepted: string[], duplicates: string[], errors: Array<{ client_event_id, message }> }`
- Criado `lib/sync/worker.ts` — sync worker client-side:
  - `syncOnce()`: verifica `navigator.onLine`, busca pending items (limit 20 cada), filtra por `next_retry_at`, envia POST `/api/sync`, marca synced/failed, agenda retry em erro
  - `scheduleRetry(table, item)`: incrementa `attempts`, calcula delay via `RETRY_DELAYS = [15, 30, 60, 120, 300, 600, 1800]` segundos, seta `next_retry_at` via `db[table].update()`
  - `startSyncWorker()`: executa `syncOnce()` imediatamente + `setInterval` a cada 15s
  - `stopSyncWorker()`: `clearInterval`
  - 5xx/fetch fail → retry; 4xx semântico (erros no JSON) → marca como `failed`
- Modificado `app/providers.tsx` — `useEffect(() => { startSyncWorker() }, [])` para iniciar worker ao montar
- Modificado `lib/dexie/repos.ts` — 4 novos helpers:
  - `markItemFailed(clientEventId, error)` — busca em ambas tabelas e marca como failed
  - `countSynced()` — conta items com status `synced` criados nas últimas 24h
  - `getFailedItems()` — retorna array flat de failed items (tipo, label, error, attempts) de ambas tabelas
  - `resetItemRetry(clientEventId)` — reseta `status → pending`, `attempts → 0`, limpa `next_retry_at` e `last_error` para re-tentar
- Criado `app/(app)/sync/page.tsx` — página de status de sincronização:
  - Badge Online (verde) / Offline (amarelo) com listener `online`/`offline` do window
  - 3 cards em grid: Pendentes, Sincronizados (últimas 24h), Falhas — todos via `useLiveQuery`
  - Botão "Sincronizar agora" com spinner e toast de resultado
  - Lista expansível "Itens com falha": label, tipo, mensagem de erro + botão "Tentar de novo" que chama `resetItemRetry`
- `tsc --noEmit` passa sem erros

**Decisões:**

- `activity_events` usa `insert` (não upsert) por ser append-only — duplicatas são capturadas via `23505` e tratadas como `duplicates` (não erro)
- Consent_logs usa `maybeSingle()` para checar existência antes de inserir, evitando duplicatas sem necessidade de constraint composta no banco
- Worker usa `scheduleRetry` separada para cada tabela (`if/else`) em vez de `db[table]` dinâmico para preservar type safety sem `any`
- `resetItemRetry` usa `Promise.all` com updates em ambas tabelas — Dexie ignora keys que não existem (affect count = 0)

**Pendente:** Nada — P9 completo.

---

### 2026-05-27 — P8 Dexie + persistência local

- Criado `lib/dexie/db.ts` — `ImpactoDB` estende Dexie com 3 tables (`activity_events`, `people`, `session`), schema de índice `client_event_id, status, next_retry_at, created_at`, banco nomeado `impacto-missionario`
- Criado `lib/dexie/repos.ts` — 9 funções repositório:
  - `saveActivityEventLocal` / `savePersonLocal` — inserem registro com `status: "pending"`, `attempts: 0`, `created_at: now`
  - `getPendingActivityEvents` / `getPendingPeople` — query por `status === "pending"` com limit
  - `markActivitySynced` / `markPersonSynced` — batch atualiza status para `"synced"` via `anyOf()`
  - `markActivityFailed` / `markPersonFailed` — atualiza para `"failed"` + incrementa `attempts` + seta `last_error`
  - `countPending` — retorna contagem de pending activities + people (paralelo via `Promise.all`)
- Modificado `components/counter-screen.tsx` (P5):
  - Remove `useInsertActivityEvents` (TanStack mutation → Supabase direto)
  - `handleIncrement` agora cria N registros com UUID v7, gera lat/lng, chama `saveActivityEventLocal` em paralelo via `Promise.all`
  - Estado `saving` substitui `mutation.isPending` para desabilitar botões durante save
- Modificado `app/(app)/pessoa/novo/form-n0.tsx` (P6) — antes de chamar `registerPerson`, gera `clientEventId` e chama `savePersonLocal`; aborta se local save falhar
- Modificado `app/(app)/pessoa/novo/form-n1.tsx` (P6) — mesmo padrão, campos `neighborhood`, `city`, `need_type`, `prayer_request` mapeados para o schema Dexie
- Modificado `app/(app)/pessoa/novo/form-n2.tsx` (P7) — mesmo padrão + `name`, `phone`, `conversion_decision`, `consent_text_shown`, `consent_timestamp`
- Modificado `app/(app)/pessoa/novo/form-n3.tsx` (P7):
  - Upload de fotos ganhou loop de retry (3 tentativas com backoff 1s/2s)
  - Se upload falha, salva pessoa localmente sem `photo_url`/`consent_proof_url` e exibe warning toast (não bloqueia)
  - Save local antes de `registerPerson` com mesmas regras
- Modificado `components/ui/app-header.tsx` (P4):
  - Importa `useLiveQuery` do `dexie-react-hooks`
  - Usa `useLiveQuery(() => countPending(), [])` para badge de pendências ao vivo
  - Mostra badge `total` (activities + people) apenas quando > 0
- `tsc --noEmit` passa sem erros

**Decisões:**

- `use-insert-activity-events.ts` mantido (não removido) — pode ser reutilizado pelo sync worker em P9 para insert em lote no servidor
- Server action `registerPerson` continua sendo chamada após save local — a persistência local é o caminho primário, e o sync eventual para Supabase via worker será implementado em P9
- Badge no header soma `activities + people` — ambos pendentes são relevantes pro usuário saber quantos registros aguardam sync

**Pendente:** Nada — P8 completo.

---

### 2026-05-27 — P7 Registro pessoa N2/N3 + consentimento

- Criado `lib/consent/texts.ts` — `CONSENT_TEXTS` constante com as frases de consentimento para níveis 2 e 3 (conforme especificado no BRAIN.md)
- Criado `lib/image/compress.ts` — `compressImage` helper que usa `browser-image-compression` (maxSizeMB: 0.2, maxWidthOrHeight: 1280, useWebWorker: true, fileType: image/jpeg)
- Modificado `app/(app)/pessoa/novo/actions.ts` — estendida interface `RegisterPersonInput` com campos N2/N3: `name`, `phone`, `conversionDecision`, `consentTextShown`, `address`, `photoUrl`, `consentProofUrl`, `clientEventId` (para N3 gerar no client). Server action `registerPerson` agora:
  - Aceita `clientEventId` opcional (se não fornecido, gera via uuidv7 internamente como antes)
  - Insere `consent_text_shown`, `consent_timestamp` e demais campos em `people_reached`
  - Quando `consentTextShown` é fornecido, insere registro em `consent_logs` (person_id, collected_by, consent_level, text_shown, collected_at)
- Criado `app/(app)/pessoa/novo/form-n2.tsx` — componente FormN2:
  - Bloco de consentimento no topo (não modal): Card com `border-2 border-primary`, padding generoso, título "Leia em voz alta pra pessoa:", frase `CONSENT_TEXTS[2]` em `text-lg`, checkbox "Li a frase em voz alta e a pessoa concordou em participar"
  - Formulário com todos os campos desabilitados (`disabled`) enquanto checkbox de consentimento não marcado: Nome (input required min 2), WhatsApp (input tel required com máscara BR via handler `formatPhone`: (XX) XXXXX-XXXX), Bairro (com datalist), Cidade, Tipo de necessidade (select nativo), Pedido de oração (textarea), Checkbox "Aceitou a Cristo hoje"
  - Botão "Salvar" desabilitado até consentimento marcado
  - Validação client-side: nome < 2 chars ou phone inválido mostra toast de erro
  - Submit chama `registerPerson` com consent_level=2 + consentTextShown
- Criado `app/(app)/pessoa/novo/form-n3.tsx` — componente FormN3:
  - Mesmo bloco de consentimento com `CONSENT_TEXTS[3]`
  - Todos os campos de N2 + Endereço (textarea), Foto da pessoa (input file accept="image/\*" capture="environment"), Foto da assinatura (input file com hint explicativo)
  - Upload: comprime cada imagem via `compressImage`, faz upload para bucket `people-photos` em paralelo no path `${userId}/${clientEventId}/photo.jpg` e `/consent.jpg` usando o browser client do Supabase (autenticado), gera signed URL com expiração de 1 ano
  - Submit gera `clientEventId` (uuidv7) no client antes do upload, depois chama `registerPerson` com consent_level=3 + photoUrl + consentProofUrl
- Modificado `app/(app)/pessoa/novo/nova-pessoa.tsx` — substituídos placeholders "N2 — em breve" / "N3 — em breve" por `<FormN2>` e `<FormN3>`
- `pnpm next build` compila sem erros

**Decisões:**

- Upload de fotos é feito no client component (não na server action) porque requer File API + compressão client-side com `browser-image-compression` e upload direto ao Storage usando o browser client autenticado do Supabase
- `clientEventId` é gerado no client para N3 (antes do upload) e passado pra server action, garantindo que o path do storage coincida com o `client_event_id` da tabela
- Phone mask usa handler simples com `replace(/\D/g, "")` + formatação posicional em vez de biblioteca externa (mas-only input, sem dependência extra)
- Select de necessidade mantém elemento nativo `<select>` (mesmo padrão de FormN1) para consistência e compatibilidade com disabled state

**Pendente:** Nada — P7 completo.

---

### 2026-05-27 — P6 Registro pessoa N0/N1

- Criado `app/(app)/pessoa/novo/page.tsx` — server component que lê `?consent=N&activity=X` de searchParams, busca bairros já registrados no evento (distinct, até 200) para o datalist, renderiza `<NovaPessoa>`
- Criado `app/(app)/pessoa/novo/actions.ts` — server action `registerPerson`: valida auth, busca user/team/event do servidor, insere `people_reached` (com `client_event_id=uuidv7()`, consent_level e campos), se `activityHint` presente insere `activity_event` com `person_id` vinculado, redireciona para `/pessoa/[id]/confirmacao`
- Criado `app/(app)/pessoa/novo/nova-pessoa.tsx` — client component com dois steps:
  - `seletor`: 4 cards verticais (N0–N3) com badge, título, descrição e `ChevronRight` — click avança para o form
  - `form`: renderiza `<FormN0>` ou `<FormN1>` conforme nível (N2/N3 placeholder "em breve")
- Criado `app/(app)/pessoa/novo/form-n0.tsx` — Card "Confirmar registro de pessoa anônima" + texto + botão Confirmar que chama `registerPerson` via `useTransition`
- Criado `app/(app)/pessoa/novo/form-n1.tsx` — form com Bairro (input + datalist), Cidade, Tipo de necessidade (select nativo: oração/financeiro/saúde/espiritual/outro), Pedido de oração (textarea max 500), botão Salvar
- Criado `app/(app)/pessoa/[id]/confirmacao/page.tsx` — página client com `CircleCheck`, "Registrado!" e dois botões (Registrar outra pessoa, Voltar pra home)
- `pnpm typecheck` e `pnpm next build` passam sem erros

**Decisões:**

- Select de tipo de necessidade usa elemento nativo `<select>` em vez do componente shadcn `Select` (base-ui) para compatibilidade direta com FormData sem necessidade de estado controlado extra
- Confirmação de página usa `"use client"` com `useRouter().push()` porque o componente `Button` (base-ui) não expõe `asChild` para composição com `Link`
- Bairros para datalist são buscados no server component (`page.tsx`) e passados como prop, evitando waterfall cliente-servidor

**Pendente:** Nada — P6 completo.

---

### 2026-05-27 — P5 Contadores rápidos

- Modificado `types/domain.ts` — adicionado campo `icon` (string Lucide) a `ACTIVITY_TYPES`
- Removido `app/page.tsx` — home movida para dentro de `(app)/` para compartilhar `(app)/layout.tsx`
- Criado `app/(app)/page.tsx` — grid 2×4 (`grid-cols-2 md:grid-cols-4`) de Links para `/atividade/[tipo]`, cada um com ícone Lucide, label pt-BR, cor de fundo via `ACTIVITY_TYPES`, `min-h-[96px] aspect-square rounded-xl`
- Criado `app/(app)/atividade/[tipo]/page.tsx` — server component que valida `tipo` em `ACTIVITY_TYPES` (senão `notFound()`) e renderiza `<CounterScreen>`
- Criado `components/counter-screen.tsx` — client component:
  - Header local com ícone (bolinha colorida) + label + botão voltar
  - Contador central grande (`text-8xl font-bold tabular-nums`)
  - Botões +1 (primário, full-width, h-20 text-2xl), +5/+10 (secundários lado a lado)
  - Botão "Vincular a pessoa" → `/pessoa/novo?activity=${tipo}`
  - GPS one-shot no mount (`navigator.geolocation.getCurrentPosition`, timeout 5s), salva lat/lng em state; falha/negação segue sem coordenadas
  - `handleIncrement(n)` gera N inserts (`count=1`, `client_event_id` UUID v7, `occurred_at` now) via `useInsertActivityEvents` mutation
  - Sucesso → incrementa contador local; erro → toast "Erro ao salvar — tentando novamente"
- Criado `lib/hooks/use-insert-activity-events.ts` — mutation TanStack Query que insere N registros em `activity_events` via Supabase client
- `pnpm typecheck` passa

**Decisões:**

- `app/page.tsx` removido para evitar conflito de rota com `app/(app)/page.tsx`; `(app)/layout.tsx` já provê auth guard, SessionProvider, AppHeader e BottomNav para todas as rotas do grupo
- `icon` armazenado como string em vez de componente React para manter `ACTIVITY_TYPES` como constante pura e compatível com server components; mapeamento string → componente feito via `ICONS` record nos pontos de uso
- Contador é estado React local (`useState(0)`) — zera ao navegar para outra página e voltar, conforme critério de aceite

**Pendente:** Nada — P5 completo.

---

### 2026-05-27 — P4 Layout shell + nav + auth guard

- Criado `lib/context/session.tsx` — `SessionProvider` + `useSession` hook com tipos `SessionUser`, `SessionTeam`, `SessionEvent`
- Criado `app/providers.tsx` — client component com `QueryClientProvider` (staleTime 30s, refetchOnWindowFocus false) + `<Toaster />`
- Modificado `app/layout.tsx` — substituído `<Toaster />` direto por `<Providers>` wrapper (react-query + toast)
- Criado `app/(app)/layout.tsx` — server component: auth guard (`supabase.auth.getUser()` → redirect `/login`), fetch user com team/event join, `SessionProvider` envolvendo `AppHeader` + `main {children}` + `BottomNav`
- Criado `components/ui/app-header.tsx` — sticky header: nome do evento (esquerda), badge da equipe com cor via inline style (centro), badge pendentes placeholder "0" (direita)
- Criado `components/ui/bottom-nav.tsx` — fixed bottom nav com 3 ícones (lucide-react: `Home`, `Users`, `User`), active state `text-primary`, `safe-area-inset-bottom` para iOS
- Modificado `app/page.tsx` — root `/` vira home autenticada com auth guard + header + bottom nav (exibe "Impacto Missionário")
- Criado `app/(app)/perfil/page.tsx` — exibe equipe, formulário editar nome/telefone, botão "Sair"
- Criado `app/(app)/perfil/actions.ts` — server actions `updateProfile` (valida + update `users`) e `signOut` (signOut + redirect `/login`)
- `pnpm typecheck` passa

**Decisões:**

- `app/page.tsx` e `app/(app)/page.tsx` conflitariam (ambos mapeiam para `/`), então mantivemos o root page com auth guard + nav inline, e `(app)/layout.tsx` como layout separado para as demais rotas protegidas (`/perfil`, `/pessoa/novo`, etc.)
- Dados de sessão buscados via 3 queries separadas (user, team, event) em vez de JOIN para evitar complexidade de tipos com Supabase generics

**Pendente:** Nada — P4 completo.

---

### 2026-05-26 — P3 Login por código de equipe

- Criado `lib/supabase/service.ts` — cliente Supabase com service role key para operações admin (`createClient` do `@supabase/supabase-js`)
- Criado `app/(public)/login/actions.ts` — server action `loginWithCode`: valida formato (4 dígitos, nome ≥ 2), busca team por `(event_id, code_4dig)`, gera email `vol-{uuidv7()}@impacto.local` + senha aleatória, cria auth user via `auth.admin.createUser()`, insere perfil em `users` com `role='voluntario'`, faz `signInWithPassword` pra criar sessão, redirect pra `/`
- Criado `app/(public)/login/page.tsx` — server component que verifica sessão existente (`supabase.auth.getUser()`) e redireciona pra `/` se já logado, senão renderiza `LoginForm`
- Criado `app/(public)/login/login-form.tsx` — client component com Card (max-w-sm), logo placeholder "Impacto Missionário", subtítulo, inputs (código numérico autofocus text-3xl, nome, whatsapp opcional), botão "Entrar" full-width, mensagem de erro + sonner toast
- Modificado `app/layout.tsx` — adicionado `<Toaster />` do sonner
- `pnpm typecheck` passa

**Pendente:** Nada — P3 completo.

---

### 2026-05-26 — P2 Tipos + cliente Supabase

- Criado `types/database.ts` — tipos gerados do schema (7 tabelas: events, teams, users, people_reached, activity_events, follow_ups, consent_logs) com helpers `Tables<>`, `TablesInsert<>`, `TablesUpdate<>`, `Enums<>`
- Criado `lib/supabase/client.ts` — browser client com `createBrowserClient<Database>()`
- Criado `lib/supabase/server.ts` — server client com `createServerClient<Database>()` + `cookies()` (Next.js 15 async)
- Criado `lib/supabase/middleware.ts` — `updateSession()` helper para refresh de sessão em middleware (padrão Supabase SSR)
- Criado `types/domain.ts` — `ACTIVITY_TYPES` constant, `ActivityType`, `ConsentLevel`, `Role`
- Criado `lib/uuid/v7.ts` — `uuidv7()` re-exportando `v7` do `uuid` v10
- Criado `middleware.ts` na raiz — chama `updateSession()` em todas as rotas exceto `_next`, `api/health`, `login` (config matcher)
- README.md atualizado com comando `supabase gen types typescript --local > types/database.ts`
- `@types/uuid@10` adicionado como devDependency (uuid@10 não inclui types próprios)
- `pnpm typecheck` passa

**Notas:**

- `supabase gen types --local` requer Docker Desktop, que não estava disponível; tipos foram gerados manualmente do migration SQL (equivalente ao output do CLI)
- Checklist P2 marcado como concluído

**Pendente:** Nada — P2 completo.

---

### 2026-05-26 22:13 — P1 Schema + RLS + Storage

- Criado `supabase/migrations/0001_init.sql` com schema completo (events, teams, users, people_reached, activity_events, follow_ups, consent_logs), índices, funções helper, e RLS policies — exatamente conforme BRAIN.md
- Criado `supabase/seed.sql` com evento "Avanço Sertão 2026" (UUID `236dbf41-421c-4104-9eee-44ad1fba7d1b`) e 3 equipes (Alpha 1234, Bravo 5678, Charlie 9012)
- Criado `supabase/storage.sql` com bucket privado `people-photos` e policies de upload/pasta e leitura
- README.md atualizado com instruções de aplicação
- SQL aplicado via Supabase Dashboard

**UUID do evento:** `236dbf41-421c-4104-9eee-44ad1fba7d1b` → colocar em `NEXT_PUBLIC_EVENT_ID`

**Pendente:** Nada — P1 completo.

---

### 2026-05-26 21:44 — P0 Bootstrap

- Criado projeto Next.js 15 com App Router, TypeScript strict + `noUncheckedIndexedAccess`, Tailwind v4
- Inicializado shadcn/ui (estilo base-nova, zinc, dark mode) e adicionados 14 componentes
- Instaladas todas as dependências de domínio (Supabase, TanStack Query, Dexie, react-pdf, uuid, date-fns, lucide-react, browser-image-compression)
- Configurados ESLint (flat config), Prettier, .env.local com variáveis vazias
- Criada estrutura de pastas conforme BRAIN.md
- README.md em pt-BR com instruções de setup
- Página inicial exibe "Impacto Missionário"

**Decisões:**

- `create-next-app` gerou Next.js 16; resolvido especificando `next@^15` manualmente
- `tw-animate-css` com exports field incompatível com `@tailwindcss/postcss` no bundle Next.js; solução: remover plugin por enquanto

---
