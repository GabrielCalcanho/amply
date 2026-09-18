# Integração Spotify — Amply

## Por que a mensagem "Busca Spotify indisponível"?

O app **nunca** fala com o Spotify diretamente com Client Secret.
A busca passa pela Edge Function `spotify-search` no **seu** projeto Supabase.

Se a function não estiver deployada ou os secrets não estiverem definidos, a busca falha e o app oferece cadastro manual.

## Passo a passo (obrigatório uma vez)

### 1. Criar app no Spotify Dashboard

1. Acesse https://developer.spotify.com/dashboard
2. Crie um app
3. Copie **Client ID** e **Client Secret**

Não coloque o Client Secret no `.env` do Expo nem em nenhum arquivo do repositório.

### 2. Secrets no Supabase

**Opção A — Dashboard**

1. Supabase → Project → **Edge Functions** → **Manage secrets** (ou Project Settings → Edge Functions)
2. Adicione:
   - `SPOTIFY_CLIENT_ID` = (seu Client ID)
   - `SPOTIFY_CLIENT_SECRET` = (seu Client Secret)

**Opção B — CLI**

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF

export SPOTIFY_CLIENT_ID='...'
export SPOTIFY_CLIENT_SECRET='...'
./scripts/deploy-spotify-function.sh
```

### 3. Deploy da Edge Function

Com o CLI (na raiz do projeto Amply):

```bash
supabase functions deploy spotify-search
```

Ou use o script:

```bash
export SPOTIFY_CLIENT_ID='...'
export SPOTIFY_CLIENT_SECRET='...'
./scripts/deploy-spotify-function.sh
```

### 4. App Expo

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Usuário **precisa estar logado** (JWT enviado automaticamente pelo `supabase.functions.invoke`).

### 5. Teste

1. Login no Amply
2. Músicas → Adicionar
3. Digite `Oceans Hillsong`
4. Deve listar tracks com capa, artista, álbum
5. Selecione → preencha tom/BPM se quiser → Salvar
6. Detalhe da música → **Abrir no Spotify**

## Arquitetura

```
Amply (Expo)
  → supabase.functions.invoke('spotify-search', { q })
    → Edge Function (secrets SPOTIFY_*)
      → POST accounts.spotify.com/api/token (Client Credentials)
      → GET api.spotify.com/v1/search
    ← { tracks: [...] }
  → salva no Postgres (spotify_track_id, spotify_url, artwork_url CDN, …)
```

## Políticas

- Apenas API oficial
- Artwork: URL CDN do Spotify (sem re-hospedar, sem editar)
- Link para abrir no Spotify
- Client Secret só no servidor
