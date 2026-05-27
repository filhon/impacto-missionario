# Impacto Missionário

Aplicativo PWA offline-first para registro de atividades missionárias.

## Setup

```bash
pnpm install
pnpm dev
```

### Variáveis de ambiente

Copie `.env.local` e preencha as variáveis:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_EVENT_ID=
NEXT_PUBLIC_APP_NAME=Impacto Missionário
```

### Supabase

```bash
# Aplicar schema + RLS localmente
supabase db reset

# Criar bucket people-photos (via psql local ou dashboard remoto)
psql "$SUPABASE_DB_URL" < supabase/storage.sql

# Seed de desenvolvimento
supabase db reset  # já aplica seed.sql se configurado
```

> **UUID do evento padrão:** `236dbf41-421c-4104-9eee-44ad1fba7d1b`  
> Copie esse valor para `NEXT_PUBLIC_EVENT_ID` no `.env.local`.

### Comandos

| Comando          | Descrição            |
| ---------------- | -------------------- |
| `pnpm dev`       | Dev local            |
| `pnpm build`     | Build production     |
| `pnpm typecheck` | Validação TypeScript |
| `pnpm lint`      | ESLint               |
| `pnpm format`    | Prettier             |
