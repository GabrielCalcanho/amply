# AMPLY

App para organização de ministérios de música (Expo SDK 52 + Supabase).

## Setup

```bash
pnpm install
cp .env.example .env
# Preencha EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY
```

SQL no Supabase (ordem):

1. `supabase/schema.sql` (projeto novo)
2. `supabase/migrations/001_fix_church_members_insert_policy.sql`
3. `supabase/migrations/002_profile_birth_spotify_songs.sql`
4. `supabase/migrations/003_setlist_status_location.sql`

Bucket Storage: `avatars` (público).

```bash
pnpm start
# ou
pnpm web
```

## Funcionalidades

- Auth (cadastro, login, logout, reset)
- Ministério (criar / entrar por convite)
- Equipe (instrumentos, funções, convite)
- Repertório manual (CRUD)
- Escalas (criar/editar, status, local, músicas, equipe, presença)
- Calendário (lista + mês)
- Perfil (foto, nascimento, instrumento)
- Aniversários na Home
- Datas em DD/MM/AAAA com seletor

## Spotify

Não habilitado nesta versão. Código de Edge Function preservado para etapa futura.

## Segurança

- Multi-tenant + RLS
- Sem service_role no frontend
- Presença: usuário só atualiza o próprio status (policy RLS)
