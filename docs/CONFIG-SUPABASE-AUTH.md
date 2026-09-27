# Configuração obrigatória — Auth e-mail / Ministério

## 1) Migration Ministério (erro schema cache)

No Supabase → SQL Editor, execute o arquivo:
`supabase/migrations/007_ensure_ministry_tables.sql`

Isso cria (se não existirem):
- ministry_teams
- ministry_roles
- member_classifications
- member_unavailability
- announcements

Com RLS multi-tenant por church_id e `NOTIFY pgrst, 'reload schema'`.

## 2) Confirmação de e-mail apontando para localhost

Causa: Site URL do Supabase Auth costuma ser `http://localhost:3000` por padrão.
O app agora envia `emailRedirectTo` via `Linking.createURL('/')` (scheme `amply://`).

No painel Supabase:
Authentication → URL Configuration

**Site URL** (produção ou Expo):
- Desenvolvimento Expo Go: pode usar a URL do projeto ou manter e adicionar redirects
- Produção: URL do site ou deep link `amply://`

**Redirect URLs** — adicione TODAS:
```
amply://
amply://*
exp://*
https://*.expo.dev/*
```

Se usar Expo Go, após o login o link do e-mail deve abrir o app via scheme `amply`.

Não desative a confirmação de e-mail só para “funcionar”.
