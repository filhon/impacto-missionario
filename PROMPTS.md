# PROMPTS.md — Impacto Missionário

15 prompts em ordem, cada um closed-scope pra Claude Code. Cole no Claude Code um por vez. Não pule. Antes de cada prompt, garanta que `BRAIN.md` está no contexto (Claude Code lê automaticamente se estiver na raiz).

Cada prompt termina com **critério de aceite** — não passe pro próximo enquanto o atual não bater.

---

## P0 — Bootstrap

```
Crie um novo projeto Next.js 15 chamado "impacto-missionario" com:
- App Router
- TypeScript strict + noUncheckedIndexedAccess no tsconfig
- Tailwind v4 configurado
- shadcn/ui inicializado (style: neutral, base color: zinc, com modo dark disponível)
- pnpm como package manager
- ESLint + Prettier configurados
- .env.local com as variáveis listadas em BRAIN.md §"Variáveis de ambiente", todas com valores vazios pra eu preencher
- Estrutura de pastas conforme BRAIN.md §"Estrutura de pastas"

Instale como dependências:
@supabase/supabase-js @supabase/ssr @tanstack/react-query dexie dexie-react-hooks
@react-pdf/renderer uuid date-fns lucide-react browser-image-compression

E adicione os componentes shadcn:
button input card dialog badge table tabs sheet sonner skeleton checkbox textarea select label

Crie um README.md mínimo em pt-BR com instruções de setup local.

NÃO escreva código de domínio ainda. Só o esqueleto.

Critério de aceite:
- `pnpm dev` sobe sem erro
- Página inicial mostra "Impacto Missionário" (placeholder simples)
- `pnpm typecheck` passa
```

---

## P1 — Schema + RLS + Storage

```
Crie a migration Supabase inicial em supabase/migrations/0001_init.sql contendo TODO o schema definido em BRAIN.md §"Schema Postgres" e §"RLS policies".

Não invente colunas, índices ou policies extras. Siga BRAIN.md exatamente.

Crie supabase/seed.sql com:
- 1 evento com id fixo (gere um UUID válido e me devolva pra eu colar em NEXT_PUBLIC_EVENT_ID), name 'Avanço Sertão 2026', start_date e end_date razoáveis (próxima semana, 10 dias), region 'Sertão de Pernambuco'
- 3 equipes ligadas a esse evento: Alpha (código 1234), Bravo (código 5678), Charlie (código 9012)

Crie supabase/storage.sql com a criação do bucket 'people-photos' privado, com policy que permite usuário autenticado fazer upload em pasta {auth.uid()}/ e ler suas próprias fotos. Coord pode ler tudo.

Documente em README.md como aplicar:
```

supabase db reset
psql < supabase/storage.sql # ou rodar via dashboard

```

Critério de aceite:
- `supabase db reset` aplica sem erro
- Vejo as tabelas no Supabase Studio
- Vejo o bucket 'people-photos' criado
- Me devolve o UUID do evento pra eu colar no .env.local
```

---

## P2 — Tipos + cliente Supabase

```
1. Gere types/database.ts via `supabase gen types typescript --local > types/database.ts`. Documente esse comando no README.

2. Crie lib/supabase/client.ts — browser client com createBrowserClient do @supabase/ssr, tipado com Database.

3. Crie lib/supabase/server.ts — server client com createServerClient + cookies do next/headers, tipado.

4. Crie lib/supabase/middleware.ts — helper pra middleware refresh de sessão (padrão Supabase SSR).

5. Crie types/domain.ts conforme BRAIN.md §"Activity types enum" e §"Consent levels".

6. Crie lib/uuid/v7.ts exportando função `uuidv7()` que gera UUID v7 (time-orderable). Use a lib `uuid` v10 (suporta v7 nativamente: `import { v7 as uuidv7 } from 'uuid'`).

7. Crie middleware.ts na raiz que chama o helper de refresh em todas as rotas exceto _next, api/health, login (config matcher).

Critério de aceite:
- `pnpm typecheck` passa
- Imports de Database, Tables<'users'>, etc funcionam
- `uuidv7()` retorna string UUID válida
```

---

## P3 — Login por código de equipe

````
Implemente a tela /login (rota em app/(public)/login/page.tsx).

UI:
- Mobile-first, single column, max-width 400px centralizado
- Logo placeholder no topo (texto "Impacto Missionário" grande)
- Subtítulo: "Entre com o código da sua equipe"
- 3 campos:
  - Código da equipe — input inputMode="numeric" maxLength=4 pattern="[0-9]{4}" text-3xl text-center, autofocus
  - Seu nome — input text required
  - WhatsApp — input tel opcional, com placeholder "(opcional)"
- Botão "Entrar" full-width, size lg
- Mensagem de erro abaixo do botão se aplicável

Fluxo (server action em app/(public)/login/actions.ts):

```ts
'use server'
export async function loginWithCode(code: string, name: string, phone?: string) {
  // 1. Valida formato (4 dígitos numéricos, nome >= 2 chars)
  // 2. Busca team por (event_id = process.env.NEXT_PUBLIC_EVENT_ID, code_4dig = code)
  //    Use service role pra essa query, pois usuário ainda não está autenticado
  // 3. Se não acha → return { error: 'Código inválido' }
  // 4. Gera email anônimo: `vol-${uuidv7()}@impacto.local` e password aleatória de 32 chars
  // 5. supabase.auth.admin.createUser({ email, password, email_confirm: true })
  // 6. Insert em users: id (do auth.user), name, phone, role='voluntario', team_id, event_id
  // 7. Faz signInWithPassword com as credenciais geradas pra criar a sessão (set cookie)
  // 8. revalidatePath('/'); redirect('/')
}
````

Se já tem sessão válida quando acessa /login, redireciona pra / direto (verificar no page.tsx via server component).

Use componentes shadcn (Card, Input, Button, Label). Toast de erro via sonner.

Critério de aceite:

- Acesso /login, digito 1234, nome "Filipe", sem telefone → entro
- Vejo na tabela `auth.users` o novo user
- Vejo na tabela `users` o perfil com role='voluntario' e team_id correto
- Acesso /login de novo → redireciona pra /
- Digito código errado → vejo mensagem "Código inválido", sessão não é criada

```

---

## P4 — Layout shell + nav + auth guard

```

1. Crie app/(app)/layout.tsx:
   - Server component
   - Busca sessão Supabase. Se não autenticado, `redirect('/login')`
   - Busca user do banco (com team join) — passa via context (use uma <SessionProvider> client-side com os dados)
   - Renderiza header + main + bottom nav

2. Componente Header (components/ui/app-header.tsx):
   - Esquerda: nome do avanço (vem do events table — busque via server component pai)
   - Centro: nome da equipe + badge da cor da equipe
   - Direita: badge com contagem de pendentes do Dexie (placeholder zero por ora, vamos plugar em P8)

3. Componente BottomNav (components/ui/bottom-nav.tsx):
   - 3 ícones grandes, fixed bottom: Home (/), Pessoas (/pessoa/novo), Perfil (/perfil)
   - Ativo destacado com cor primária
   - Safe-area-inset-bottom pra iOS

4. Crie /perfil page:
   - Mostra nome, telefone, equipe
   - Form pra editar nome e telefone
   - Botão "Sair" → server action que faz signOut e redirect /login

5. Crie app/providers.tsx (client component) com:
   - QueryClient + QueryClientProvider (staleTime 30s, refetchOnWindowFocus false)
   - Toaster (sonner)
   - SessionContext

6. Wrap app/layout.tsx (root) com Providers.

Critério de aceite:

- Após login vejo header com nome do avanço + minha equipe
- Bottom nav navega entre as 3 rotas
- /perfil mostra meus dados
- Botão "Sair" me desloga e leva pra /login
- Acessar /login depois de logado redireciona pra /
- `pnpm typecheck` passa

```

---

## P5 — Contadores rápidos

```

1. Home (app/(app)/page.tsx):
   - Grid 2x4 de botões grandes (responsive: 2 cols mobile, 4 cols desktop)
   - Cada botão é um Link pra /atividade/[tipo]
   - Mostra: ícone (lucide), label em pt-BR, cor de fundo conforme ACTIVITY_TYPES
   - Altura mínima 96px, padding generoso, border-radius lg
   - aspect-square, conteúdo centralizado

2. Página /atividade/[tipo] (app/(app)/atividade/[tipo]/page.tsx):
   - Server component valida que o tipo está em ACTIVITY_TYPES, senão notFound()
   - Renderiza <CounterScreen tipo={tipo} />

3. Componente CounterScreen (client):
   - Header local: ícone + label da atividade, botão voltar
   - Contador grande no centro: número da SESSÃO ATUAL local (estado React, não persiste entre logins)
   - 3 botões abaixo: +1 (primário, full width, h-20 text-2xl), +5, +10 (secundários lado a lado)
   - Botão secundário no fim: "Vincular a pessoa" → router.push(`/pessoa/novo?activity=${tipo}`)
   - Captura GPS no mount via navigator.geolocation.getCurrentPosition (one-shot, timeout 5s). Salva no state. Se falhar/negar, registra sem GPS.

4. Função handleIncrement(n):
   - Pra cada uma das N atividades, cria um registro com:
     - client_event_id = uuidv7()
     - activity_type = tipo
     - count = 1 (cada toque = N inserts de count=1, mais simples agregar)
     - lat, lng (se disponíveis)
     - occurred_at = new Date().toISOString()
     - user_id = session.user.id
     - team_id, event_id = da sessão
   - Por ora salva DIRETO no Supabase via client (vamos refatorar pra Dexie em P8)
   - Em sucesso, incrementa contador local
   - Em erro, toast "Erro ao salvar — tentando novamente" e fica em estado pending (vamos resolver com Dexie depois)

5. Use TanStack Query mutation pra os inserts.

Critério de aceite:

- Toco em "Folheto" na home, abre tela do contador
- Clico +1, vejo contador subir, vejo linha no Supabase Studio em activity_events
- Clico +5, vejo +5 linhas inseridas
- Permissão de GPS aparece no primeiro acesso. Se permito, lat/lng aparecem nas linhas.
- Voltar pra home e abrir Folheto de novo: contador zera (é só da sessão)

```

---

## P6 — Registro pessoa N0/N1

```

1. Crie app/(app)/pessoa/novo/page.tsx — server component que renderiza <NovaPessoa initialConsentLevel={query.consent} activityHint={query.activity} />.

2. Componente NovaPessoa (client):
   - State: `step` ('seletor' | 'form'), `consentLevel` (null | 0 | 1 | 2 | 3)
   - Step 'seletor':
     - 4 cards verticais grandes, um por nível:
       - N0 "Não, só contar" — texto explicativo curto: "Só uma contagem, sem dados"
       - N1 "Sim, sem identificar" — "Bairro e tipo de necessidade"
       - N2 "Sim, com nome e contato" — "Nome + WhatsApp + consentimento verbal"
       - N3 "Sim, cadastro completo" — "Tudo + endereço, foto e assinatura"
     - Click → seta consentLevel + step='form'
   - Step 'form': renderiza <FormN0 />, <FormN1 />, <FormN2 />, <FormN3 /> conforme nível

3. FormN0:
   - Card: "Confirmar registro de pessoa anônima"
   - Texto: "Será criado um registro anônimo sem dados pessoais."
   - Botão "Confirmar"
   - On confirm:
     - Insert people_reached com consent_level=0, registered_by, team_id, event_id, client_event_id=uuidv7()
     - Se activityHint presente, insert activity_event com activity_type=hint, count=1, person_id=people.id
     - Redireciona pra /pessoa/[id]/confirmacao

4. FormN1:
   - Bairro (Input + datalist com bairros já registrados no event — query distinct)
   - Cidade (Input)
   - Tipo de necessidade (Select: 'oração', 'financeiro', 'saúde', 'espiritual', 'outro')
   - Pedido de oração (Textarea opcional, max 500 chars)
   - Botão "Salvar"
   - On submit: idem N0 com consent_level=1 + os campos preenchidos

5. Página /pessoa/[id]/confirmacao:
   - Mensagem grande "Registrado!" com ícone check
   - 2 botões: "Registrar outra pessoa" (/pessoa/novo) e "Voltar pra home" (/)

Critério de aceite:

- Registro N0 anônimo aparece no Supabase com só consent_level=0, sem nome/phone
- Registro N1 aparece com bairro + city + need_type
- Se vier com ?activity=folheto, também vejo activity_event com person_id preenchido
- Datalist de bairros mostra bairros previamente registrados

```

---

## P7 — Registro N2/N3 + consentimento

```

1. Componente FormN2:
   - BLOCO de consentimento no TOPO (não em modal):
     - Card com border destacada, padding generoso
     - Título: "Leia em voz alta pra pessoa:"
     - Texto: CONSENT_TEXTS[2] em text-lg
     - Checkbox: "Li a frase em voz alta e a pessoa concordou em participar"
   - Form (todos disabled enquanto checkbox não marcado):
     - Nome (Input required, min 2 chars)
     - WhatsApp (Input tel required, com máscara BR via input handler simples: (XX) XXXXX-XXXX)
     - Bairro, Cidade
     - Tipo de necessidade (Select)
     - Pedido de oração (Textarea)
     - Checkbox "Aceitou a Cristo hoje" (conversion_decision)
   - Botão "Salvar" disabled enquanto checkbox de consentimento não marcado e form inválido
   - On submit:
     - Insert people_reached com consent_level=2, todos os campos, consent_text_shown=CONSENT_TEXTS[2], consent_timestamp=now()
     - Insert consent_logs (person_id, collected_by, consent_level=2, text_shown=CONSENT_TEXTS[2])
     - Idem N0/N1 pra activity_event vinculado
     - Redireciona pra confirmacao

2. Componente FormN3:
   - Mesmo bloco de consentimento mas com CONSENT_TEXTS[3]
   - Form com tudo de N2 mais:
     - Endereço (Textarea)
     - Foto da pessoa (Input file accept="image/\*" capture="environment")
     - Foto da assinatura de consentimento (Input file accept="image/\*" capture="environment") — exige papel impresso com consentimento que a pessoa assina, pode ser uma simples linha "Eu, \_\_\_, autorizo..."
   - Pra cada foto:
     - Comprimir via browser-image-compression (maxSizeMB: 0.2, maxWidthOrHeight: 1280, useWebWorker: true)
     - Upload pro bucket 'people-photos' em path `${userId}/${client_event_id}/photo.jpg` e `/consent.jpg`
     - Salva URL pública (signed URL com expiração longa ou path-only se decidir tornar bucket público) em photo_url/consent_proof_url
   - On submit similar ao N2 com consent_level=3 + photo_url + consent_proof_url

3. Helper lib/image/compress.ts:

```ts
import imageCompression from "browser-image-compression";
export async function compressImage(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 0.2,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    fileType: "image/jpeg",
  });
}
```

Critério de aceite:

- N2 salva sem foto, com consent_logs criado, phone com máscara visível na UI
- N3 salva com 2 fotos comprimidas no Storage, URLs corretas nas colunas
- Botão Salvar fica desabilitado até checkbox marcado
- Tentativa de salvar N2 sem nome ou phone mostra erro

```

---

## P8 — Dexie + persistência local

```

Refatore os fluxos de insert pra passar PRIMEIRO por Dexie.

1. Crie lib/dexie/db.ts:

```ts
import Dexie, { Table } from "dexie";

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

class ImpactoDB extends Dexie {
  activity_events!: Table<LocalActivityEvent, string>;
  people!: Table<LocalPerson, string>;
  session!: Table<LocalSession, string>;

  constructor() {
    super("impacto-missionario");
    this.version(1).stores({
      activity_events: "client_event_id, status, next_retry_at, created_at",
      people:
        "client_event_id, status, next_retry_at, consent_level, created_at",
      session: "id",
    });
  }
}

export const db = new ImpactoDB();
```

2. Crie lib/dexie/repos.ts:

```ts
export async function saveActivityEventLocal(
  data: Omit<LocalActivityEvent, "status" | "attempts" | "created_at">,
): Promise<void>;
export async function savePersonLocal(
  data: Omit<LocalPerson, "status" | "attempts" | "created_at">,
): Promise<void>;
export async function getPendingActivityEvents(
  limit = 20,
): Promise<LocalActivityEvent[]>;
export async function getPendingPeople(limit = 20): Promise<LocalPerson[]>;
export async function markActivitySynced(ids: string[]): Promise<void>;
export async function markPersonSynced(ids: string[]): Promise<void>;
export async function markActivityFailed(
  id: string,
  error: string,
): Promise<void>;
export async function markPersonFailed(
  id: string,
  error: string,
): Promise<void>;
export async function countPending(): Promise<{
  activities: number;
  people: number;
}>;
```

3. Refatore P5 (CounterScreen): no handleIncrement, chame saveActivityEventLocal em vez do insert direto. Remove a chamada Supabase.

4. Refatore P6/P7 (FormN0/N1/N2/N3): chame savePersonLocal. Pra upload de fotos N3, mantenha upload direto pro Storage (com retry simples) e só salve no local com photo_url já preenchido. Se upload falhar, salva sem foto e marca pra retry manual depois.

5. No header (P4), use `useLiveQuery(() => countPending(), [])` pra mostrar o badge real.

Critério de aceite:

- Abro DevTools → Application → IndexedDB → vejo o banco `impacto-missionario`
- Clico +1 em Folheto, vejo linha em activity_events com status='pending'
- Badge no header mostra "1"
- Mato a internet (DevTools → Network → Offline), clico +5, vejo 5 linhas pending, badge mostra "6"
- Recarrego a página offline → badge continua 6, contadores começam zerados de novo (esperado, é da sessão)
- Nenhuma chamada direta a supabase.from('activity_events').insert() acontece no client agora

```

---

## P9 — Worker de sync + retry

```

1. Crie /api/sync (route handler em app/api/sync/route.ts):

```ts
// POST /api/sync
// Body: { events: LocalActivityEvent[], people: LocalPerson[] }
// Response: { accepted: string[], duplicates: string[], errors: { client_event_id, message }[] }

export async function POST(req: Request) {
  const supabase = createServerClient(...);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const body = await req.json();
  // valida com zod (people array + events array)

  const accepted: string[] = [];
  const duplicates: string[] = [];
  const errors: any[] = [];

  // 1. Insere people primeiro (events podem referenciar)
  // Mapa: client_event_id local → person_id do servidor (incluindo duplicatas)
  const personIdMap = new Map<string, string>();

  for (const p of body.people) {
    try {
      const { data, error } = await supabase
        .from('people_reached')
        .upsert({
          client_event_id: p.client_event_id,
          event_id: process.env.NEXT_PUBLIC_EVENT_ID,
          team_id: userTeam,
          registered_by: user.id,
          consent_level: p.consent_level,
          // ...resto dos campos
        }, { onConflict: 'client_event_id', ignoreDuplicates: false })
        .select('id, client_event_id')
        .single();

      if (error) throw error;
      personIdMap.set(p.client_event_id, data.id);
      accepted.push(p.client_event_id);

      // Insert consent_log se N2/N3 (idempotência: check existing antes)
      if (p.consent_level >= 2 && p.consent_text_shown) {
        await supabase.from('consent_logs').insert({
          person_id: data.id,
          collected_by: user.id,
          consent_level: p.consent_level,
          text_shown: p.consent_text_shown,
          collected_at: p.consent_timestamp ?? new Date().toISOString()
        }).select(); // ignora erro de duplicata via constraint composta se você adicionar
      }
    } catch (e: any) {
      // Se erro for "duplicate key", busca o id existente
      if (e.code === '23505') {
        const { data } = await supabase.from('people_reached')
          .select('id').eq('client_event_id', p.client_event_id).single();
        if (data) {
          personIdMap.set(p.client_event_id, data.id);
          duplicates.push(p.client_event_id);
          continue;
        }
      }
      errors.push({ client_event_id: p.client_event_id, message: e.message });
    }
  }

  // 2. Insere events resolvendo person_id via map
  for (const ev of body.events) {
    try {
      const personId = ev.person_client_event_id
        ? personIdMap.get(ev.person_client_event_id) ?? null
        : null;

      const { error } = await supabase.from('activity_events').insert({
        client_event_id: ev.client_event_id,
        event_id: process.env.NEXT_PUBLIC_EVENT_ID,
        team_id: userTeam,
        user_id: user.id,
        activity_type: ev.activity_type,
        count: ev.count,
        lat: ev.lat,
        lng: ev.lng,
        occurred_at: ev.occurred_at,
        person_id: personId,
        notes: ev.notes
      });

      if (error) {
        if (error.code === '23505') {
          duplicates.push(ev.client_event_id);
        } else {
          throw error;
        }
      } else {
        accepted.push(ev.client_event_id);
      }
    } catch (e: any) {
      errors.push({ client_event_id: ev.client_event_id, message: e.message });
    }
  }

  return Response.json({ accepted, duplicates, errors });
}
```

2. Crie lib/sync/worker.ts:

```ts
const RETRY_DELAYS = [15, 30, 60, 120, 300, 600, 1800]; // segundos

export async function syncOnce(): Promise<{ ok: number; failed: number }> {
  if (!navigator.onLine) return { ok: 0, failed: 0 };

  const events = await getPendingActivityEvents(20);
  const people = await getPendingPeople(20);
  if (events.length === 0 && people.length === 0) return { ok: 0, failed: 0 };

  // Filtra os que ainda não chegou o next_retry_at
  const now = Date.now();
  const eventsToSend = events.filter(
    (e) => !e.next_retry_at || new Date(e.next_retry_at).getTime() <= now,
  );
  const peopleToSend = people.filter(
    (p) => !p.next_retry_at || new Date(p.next_retry_at).getTime() <= now,
  );

  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: eventsToSend, people: peopleToSend }),
    });

    if (!res.ok) {
      // 5xx → incrementa attempts em todos
      for (const e of eventsToSend) await scheduleRetry("activity_events", e);
      for (const p of peopleToSend) await scheduleRetry("people", p);
      return { ok: 0, failed: eventsToSend.length + peopleToSend.length };
    }

    const { accepted, duplicates, errors } = await res.json();
    const okIds = [...accepted, ...duplicates];

    const okEventIds = eventsToSend
      .filter((e) => okIds.includes(e.client_event_id))
      .map((e) => e.client_event_id);
    const okPeopleIds = peopleToSend
      .filter((p) => okIds.includes(p.client_event_id))
      .map((p) => p.client_event_id);
    await markActivitySynced(okEventIds);
    await markPersonSynced(okPeopleIds);

    for (const err of errors) {
      // 4xx semântico: marca failed (não retry)
      await markEitherFailed(err.client_event_id, err.message);
    }

    return { ok: okIds.length, failed: errors.length };
  } catch (e) {
    for (const ev of eventsToSend) await scheduleRetry("activity_events", ev);
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
    RETRY_DELAYS[Math.min(nextAttempt - 1, RETRY_DELAYS.length - 1)];
  const nextRetryAt = new Date(Date.now() + delaySeconds * 1000).toISOString();
  await db[table].update(item.client_event_id, {
    attempts: nextAttempt,
    next_retry_at: nextRetryAt,
  });
}

let workerInterval: number | undefined;
export function startSyncWorker() {
  if (workerInterval) return;
  workerInterval = window.setInterval(() => {
    syncOnce();
  }, 15000);
  // tenta uma vez logo de cara
  syncOnce();
}
export function stopSyncWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = undefined;
  }
}
```

3. Chame startSyncWorker() no providers.tsx (dentro de useEffect, só client).

4. Crie /sync page:
   - Status conexão (badge verde "Online" ou amarelo "Offline" via navigator.onLine + listener)
   - Cards: total pending, total synced (último 24h via useLiveQuery), total failed
   - Botão "Sincronizar agora" → chama syncOnce() manualmente, mostra toast com resultado
   - Lista expansível "Itens com falha" mostrando mensagem de erro e botão "Tentar de novo" (reset attempts e next_retry_at)

Critério de aceite:

- Offline: registro 10 atividades. Vejo 10 pending.
- Volto online. Em até 15s todos viram synced. Vejo no Supabase Studio.
- Registro N3 com fotos offline → ao ficar online, foto upload tenta (se Storage não funciona offline mesmo, o registro fica pending até upload conseguir; documentar isso no README)
- Forço erro 500 no /api/sync (return manual): vejo attempts subindo, next_retry_at preenchido
- 4xx: vejo o item na lista de failed em /sync

```

---

## P10 — Dashboard líder

```

Rota /(lider)/equipe — acessível só se role in ('lider','coord').

1. Criar layout em app/(lider)/layout.tsx:
   - Server component que valida role. Se não for líder/coord, redirect('/').

2. Página /equipe:
   - Header: nome da equipe, código de 4 dígitos (com botão copiar), total geral de atividades, total de pessoas
   - Grid 4x2 de KPI cards por activity_type (label, ícone, número grande, cor)
   - Tabs: "Atividades recentes" | "Pessoas registradas"

3. Tab "Atividades recentes":
   - Tabela das últimas 50 entradas da equipe
   - Colunas: voluntário (name), atividade (label + ícone), count, data/hora (date-fns format), GPS (link "ver" abrindo google maps em nova aba se lat/lng existe, senão "—")
   - Query: select \* from activity_events where team_id = currentUserTeam order by occurred_at desc limit 50, join com users pra nome

4. Tab "Pessoas registradas":
   - Tabela das últimas 50 pessoas
   - Colunas: nome (ou "Anônimo" se N0/N1), badge de consent_level (N0 cinza, N1 azul, N2 amarelo, N3 verde), registrado por, bairro, data
   - Click na linha (só se N2+) → /pessoa/[id]

5. Queries via TanStack Query, staleTime 30s. Adicione invalidação após sync bem-sucedido (use eventEmitter ou re-fetch via refetchInterval 60s).

Critério de aceite:

- Como líder vejo só atividades da minha equipe
- Coord acessa /equipe e vê sua própria equipe também
- Como voluntário acesso /equipe → redirect /
- Tabela atualiza sozinha após registrar nova atividade (max 60s de delay aceitável)

```

---

## P11 — Dashboard coordenador

```

Rota /(coord)/coord — só role='coord'.

1. Layout app/(coord)/layout.tsx valida role coord, redirect '/' senão.

2. /coord page:
   - 4 KPI cards no topo:
     - Total de atividades (sum count em activity_events)
     - Total de pessoas alcançadas (count people_reached)
     - Total de conversões (count people_reached where conversion_decision=true + count activity_events where activity_type='conversao')
     - Total de bairros únicos (count distinct neighborhood em people_reached where consent_level >= 1)
   - Gráfico de barras (Recharts): total por equipe (eixo x = team_name, eixo y = total)
   - Gráfico de linha (Recharts): total por dia (eixo x = data, eixo y = total) — agrupar por date_trunc('day', occurred_at)
   - Tabela "Equipes":
     - Colunas: nome, código, líder (nome ou "—"), voluntários ativos (count distinct users que registraram nas últimas 24h), total registros, última atividade (relative time)
   - Filtros (sticky no topo): date range (start_date e end_date do evento como default), select de equipe (all + cada team), select de activity_type

3. /coord/equipes page:
   - Lista de equipes em cards (nome, código grande, cor, contagem de membros)
   - Botão "Nova equipe" → modal com Input nome + botão "Gerar código" (gera 4 dígitos único no evento) + botão criar
   - Cada card tem:
     - Botão "Editar nome"
     - Botão "Definir líder" (select de usuários da equipe)
     - Botão "Resetar código" (gera novo código aleatório com confirmação) — útil se vazou
     - Lista expandível de membros (com role e link "promover a líder" / "remover do time")

4. Use server actions pra mutações. Invalida queries no client após cada ação.

Critério de aceite:

- Coord vê KPIs corretos
- Filtros funcionam
- Crio nova equipe com código único, vejo no banco
- Promovo um voluntário a líder, ele passa a acessar /equipe
- Reset de código gera novo código não usado, o velho não funciona mais no /login

```

---

## P12 — Export CSV

```

Crie /(coord)/coord/export page.

1. UI:
   - Card "Exportar CSV completo" com:
     - Filtro: date range (default = duração do evento)
     - Filtro: equipes (multi-select, default = todas)
     - Botão "Baixar CSV"
   - Card "Exportar PDF" (placeholder pra P13)

2. Server action `exportCsv(filters)`:
   - Query: SELECT join completo de activity_events + users + teams + people_reached (left join)
   - Aplica filtros de data e equipe
   - Verifica role='coord' antes de qualquer coisa
   - Gera CSV com colunas em pt-BR:
     event_id, equipe, voluntario, atividade, contagem, lat, lng, data_hora,
     pessoa_consentimento, pessoa_bairro, pessoa_cidade, notas
   - Pra cada linha, mascara phone se consent_level < 2 (defesa em profundidade)
   - Não inclui name, phone, address, photo_url no CSV (privacidade — esses ficam só no app)
   - Header em pt-BR
   - Encoding UTF-8 com BOM (pra Excel BR abrir bonito)
   - Filename: `impacto-missionario-${eventName}-${YYYY-MM-DD}.csv`
   - Return como Response com Content-Type: text/csv e Content-Disposition: attachment

3. Use papaparse ou implementação manual simples (CSV é fácil: escape aspas + vírgula).

Critério de aceite:

- Baixo o CSV, abro no LibreOffice/Excel, vejo dados corretos com acentuação
- Linhas com N0/N1 têm pessoa_bairro vazio ou só bairro, sem nome
- Linhas com N2/N3 têm bairro/cidade mas não nome/phone
- Filtros aplicados reduzem o dataset corretamente

```

---

## P13 — Export PDF

```

Implementa export PDF usando @react-pdf/renderer no client-side.

1. Crie lib/pdf/RelatorioPDF.tsx (client component):

```tsx
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image as PDFImage,
} from "@react-pdf/renderer";

interface Props {
  evento: {
    name: string;
    start_date: string;
    end_date: string;
    region: string;
  };
  totais: {
    biblia: number;
    joao: number;
    folheto: number;
    visita: number;
    oracao: number;
    conversao: number;
    medico: number;
    radio: number;
  };
  totalPessoas: number;
  totalConversoes: number;
  bairrosAlcancados: string[];
  porDia: Array<{
    data: string;
    totais: Record<string, number>;
    porEquipe: Array<{ equipe: string; total: number }>;
  }>;
}

export function RelatorioPDF({
  evento,
  totais,
  totalPessoas,
  totalConversoes,
  bairrosAlcancados,
  porDia,
}: Props) {
  return (
    <Document>
      {/* Capa */}
      <Page size="A4" style={styles.cover}>
        <Text style={styles.title}>Relatório de Impacto</Text>
        <Text style={styles.subtitle}>{evento.name}</Text>
        <Text style={styles.meta}>
          {evento.start_date} a {evento.end_date}
        </Text>
        <Text style={styles.meta}>{evento.region}</Text>
      </Page>

      {/* Sumário executivo */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Resumo</Text>
        <View style={styles.kpiGrid}>
          {/* KPI cards: Bíblias, João, Folhetos, Visitas, Orações, Conversões, Médicos, Rádios, Total pessoas, Total bairros */}
        </View>
      </Page>

      {/* Por dia */}
      {porDia.map((dia) => (
        <Page key={dia.data} size="A4" style={styles.page}>
          <Text style={styles.h1}>{dia.data}</Text>
          {/* tabela de totais por equipe */}
          {/* totais do dia por activity_type */}
        </Page>
      ))}

      {/* Lista de bairros */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Bairros alcançados</Text>
        {bairrosAlcancados.map((b) => (
          <Text key={b}>• {b}</Text>
        ))}
      </Page>

      {/* Página final LGPD */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Política de retenção de dados</Text>
        <Text style={styles.body}>
          Este relatório agrega dados coletados durante o avanço missionário com
          base nos seguintes níveis de consentimento:
          {"\n\n"}• N0 — Pessoas contadas anonimamente, sem dados pessoais
          retidos.
          {"\n"}• N1 — Bairro e tipo de necessidade, sem identificação pessoal.
          {"\n"}• N2 — Nome e contato com consentimento explícito, retenção de
          12 meses.
          {"\n"}• N3 — Cadastro completo com consentimento formal documentado,
          retenção de 24 meses.
          {"\n\n"}
          Pedidos de remoção de dados podem ser feitos a qualquer momento
          conforme LGPD art. 18.
        </Text>
      </Page>
    </Document>
  );
}

const styles = StyleSheet.create({
  cover: { padding: 60, textAlign: "center" },
  title: { fontSize: 32, marginBottom: 12 },
  subtitle: { fontSize: 22, marginBottom: 8 },
  meta: { fontSize: 14, color: "#666", marginBottom: 4 },
  page: { padding: 40 },
  h1: { fontSize: 22, marginBottom: 16 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  body: { fontSize: 12, lineHeight: 1.6 },
});
```

2. No /coord/export page, no card PDF:
   - Filtros (mesmos do CSV)
   - Botão "Gerar PDF" — usa <PDFDownloadLink document={<RelatorioPDF {...data} />} fileName={...}>
   - data vem de uma TanStack Query que agrega os dados via server action (aggregateForReport(filters))

3. server action aggregateForReport(filters):
   - Query agregada via Supabase: count, group by, etc
   - Não retorna PII
   - Retorna a estrutura Props do RelatorioPDF

Critério de aceite:

- PDF abre, está em pt-BR
- Números batem com o dashboard
- Não tem nome/phone/endereço de pessoa nenhuma no PDF
- Tem página com bairros, página LGPD, capa bonita

```

---

## P14 — PWA + offline shell

```

1. /public/manifest.webmanifest:

```json
{
  "name": "Impacto Missionário",
  "short_name": "Impacto",
  "description": "Registro de atividades de avanço missionário",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    {
      "src": "/icons/maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

Gere ícones placeholder (pode ser tela preta com texto "IM" branco grande) em /public/icons/ — usar uma ferramenta tipo realfavicongenerator ou pngcrush, ou gerar via canvas simples no setup.

2. /public/sw.js (Service Worker simples):

```js
const CACHE = "impacto-v1";
const SHELL = [
  "/",
  "/login",
  "/perfil",
  "/sync",
  "/pessoa/novo",
  "/atividade/biblia",
  "/atividade/joao",
  "/atividade/folheto",
  "/atividade/visita",
  "/atividade/oracao",
  "/atividade/conversao",
  "/atividade/medico",
  "/atividade/radio",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Nunca cacheia /api/*
  if (url.pathname.startsWith("/api/")) return;
  // Network-first pra navegação, fallback cache
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(
        () => caches.match(e.request) || caches.match("/"),
      ),
    );
    return;
  }
  // Cache-first pra assets
  e.respondWith(
    caches.match(e.request).then(
      (r) =>
        r ||
        fetch(e.request).then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return resp;
        }),
    ),
  );
});
```

3. Crie components/pwa/sw-register.tsx (client component):

```tsx
"use client";
import { useEffect } from "react";
export function SWRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }
  }, []);
  return null;
}
```

Inclua em providers.tsx.

4. Crie components/pwa/install-prompt.tsx:
   - Captura evento `beforeinstallprompt`, armazena
   - Mostra banner após 30s logado se ainda não instalado (usar localStorage flag)
   - Banner: "Instalar Impacto Missionário" + botão "Instalar"
   - Click → chama deferredPrompt.prompt()
   - Dismiss → flag de "não mostrar mais nessa sessão"

5. Banner de offline (components/ui/offline-banner.tsx):
   - Listener em window 'online'/'offline'
   - Quando offline: banner amarelo fixo no topo "Você está offline. Os registros serão sincronizados quando voltar a conexão."
   - Quando online de volta: some

6. Adicione link manifest e meta theme-color em app/layout.tsx.

Critério de aceite:

- Lighthouse PWA score >= 90
- Instalo no Chrome Android, app abre como standalone
- Mato wi-fi com o app aberto, navego entre rotas cacheadas, registro atividade
- Volto online, sync acontece
- Recarregar offline mostra a home corretamente

```

---

## P15 — Deploy + onboarding

```

1. Crie projeto na Vercel (CLI ou dashboard), conecte ao repo.

2. Configure variáveis no Vercel:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - NEXT_PUBLIC_EVENT_ID
   - NEXT_PUBLIC_APP_NAME

3. Smoke tests em produção (rode você mesmo, anote falhas):
   - [ ] /login com código 1234, novo voluntário criado
   - [ ] Registrar 5 atividades online de tipos variados → conferir no Supabase Studio
   - [ ] Mato Wi-Fi via DevTools, registro 5 offline, volto online, sync ocorre
   - [ ] Registrar pessoa N0, N1, N2, N3 (com fotos) — checar Storage
   - [ ] Promover usuário a líder via SQL, login, vê /equipe
   - [ ] Promover usuário a coord via SQL, login, vê /coord
   - [ ] Coord cria nova equipe, código funciona em /login
   - [ ] Coord exporta CSV, abre no Excel
   - [ ] Coord gera PDF, abre no leitor
   - [ ] Lighthouse PWA score >= 90 em produção

4. Crie /scripts/admin com 3 arquivos SQL:
   - promote_to_lider.sql: `UPDATE users SET role='lider' WHERE id = '<user_id>';`
   - promote_to_coord.sql: idem com 'coord'
   - reset_team_code.sql: `UPDATE teams SET code_4dig = '<novo>' WHERE id = '<team_id>';`

5. Crie /docs/onboarding-equipes.md em pt-BR, escrito de forma simples, com:
   - Como instalar o app no celular (passo a passo Android + iOS)
   - Como entrar com o código da equipe
   - Como registrar uma atividade
   - O que significa o badge de "N pendentes" e o que fazer
   - O que fazer se a internet cair
   - Como registrar uma pessoa com cada nível de consentimento
   - Como pedir remoção de dados pessoais (procedimento LGPD básico)

6. Crie /docs/onboarding-coordenador.md em pt-BR:
   - Como acessar o dashboard
   - Como criar equipes e distribuir códigos
   - Como promover líderes
   - Como exportar relatórios
   - Como purgar dados pessoais a pedido

7. Faça um smoke test final com 2-3 voluntários reais (idealmente no fim de semana antes do avanço) e ajuste os pontos de atrito que aparecerem.

Critério de aceite:

- App rodando em produção em https://impacto.<dominio>
- Equipes treinadas
- Primeira atividade de teste do campo aparece no dashboard do coord
- Backup do Supabase ativado nas settings
- Você dorme tranquilo na véspera do avanço

```

---

## Apêndice — ordem dos quebra-cabeças que vão surgir

Não está nos prompts mas você vai bater contra:

1. **iOS WebKit IndexedDB às vezes evicta sem aviso** — se um voluntário usar iPhone, alerta de "instale o PWA" é mais crítico (modo standalone protege melhor).
2. **WhatsApp WebView abre links no in-app browser** — copia o link de instalação numa mensagem e treina pra abrir no Chrome direto, longo press → "abrir no Chrome".
3. **Bateria do Android com GPS ligado** — se voluntários reclamarem, vire o GPS opcional via toggle no /perfil.
4. **Sincronização de pessoa N3 com foto** — se a foto não subir, o registro fica pending. Considera implementar fallback: salva sem foto + marca pra reupload manual no /sync.
5. **Service worker preso em versão antiga** — quando publicar update, força com `self.skipWaiting()` + `clients.claim()` (já tá no template). Mas se voluntários virem comportamento estranho, instrua a desinstalar e reinstalar o PWA.

Boa sorte no avanço.
```
