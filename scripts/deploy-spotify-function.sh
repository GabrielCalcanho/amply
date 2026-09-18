#!/usr/bin/env bash
# Deploy da Edge Function spotify-search e configuração de secrets.
# Uso:
#   export SPOTIFY_CLIENT_ID=...
#   export SPOTIFY_CLIENT_SECRET=...
#   ./scripts/deploy-spotify-function.sh
#
# Requer: supabase CLI logado e projeto linkado (supabase link)

set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v supabase >/dev/null 2>&1; then
  echo "Instale o Supabase CLI: https://supabase.com/docs/guides/cli"
  exit 1
fi

if [[ -z "${SPOTIFY_CLIENT_ID:-}" || -z "${SPOTIFY_CLIENT_SECRET:-}" ]]; then
  echo "Defina SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET no ambiente antes de rodar."
  echo "Obtenha em: https://developer.spotify.com/dashboard"
  exit 1
fi

echo "→ Configurando secrets (não serão gravados no código)..."
supabase secrets set \
  SPOTIFY_CLIENT_ID="$SPOTIFY_CLIENT_ID" \
  SPOTIFY_CLIENT_SECRET="$SPOTIFY_CLIENT_SECRET"

echo "→ Deploy de spotify-search..."
supabase functions deploy spotify-search

echo "→ OK. Teste no app (usuário logado) buscando uma música."
