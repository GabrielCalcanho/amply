/**
 * Supabase Edge Function: spotify-search
 *
 * Secrets (Dashboard → Edge Functions → Secrets, ou CLI):
 *   SPOTIFY_CLIENT_ID
 *   SPOTIFY_CLIENT_SECRET
 *
 * Never return secrets in the response body.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type TokenCache = { accessToken: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getSpotifyAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60_000) {
    return tokenCache.accessToken;
  }

  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID")?.trim();
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET")?.trim();

  if (!clientId || !clientSecret) {
    throw new Error("MISSING_CREDENTIALS");
  }

  const basic = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("spotify_token_error", res.status, text.slice(0, 200));
    if (res.status === 401) throw new Error("INVALID_CREDENTIALS");
    throw new Error("TOKEN_FAILED");
  }

  const data = await res.json();
  const accessToken = data.access_token as string;
  const expiresIn = Number(data.expires_in ?? 3600);
  tokenCache = {
    accessToken,
    expiresAt: now + expiresIn * 1000,
  };
  return accessToken;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed", code: "METHOD" }, 405);
  }

  try {
    // Require Authorization header (Supabase JWT from logged-in user)
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return json({ error: "Não autenticado", code: "UNAUTHORIZED" }, 401);
    }

    let body: { q?: string; query?: string } = {};
    try {
      body = await req.json();
    } catch {
      return json({ error: "Corpo inválido", code: "BAD_BODY" }, 400);
    }

    const q = String(body.q ?? body.query ?? "").trim();
    if (q.length < 2) {
      return json({ tracks: [] });
    }

    let accessToken: string;
    try {
      accessToken = await getSpotifyAccessToken();
    } catch (e) {
      const code = (e as Error).message;
      if (code === "MISSING_CREDENTIALS") {
        return json(
          {
            error:
              "Credenciais Spotify não configuradas no servidor. Defina SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET nos secrets da Edge Function.",
            code: "MISSING_CREDENTIALS",
          },
          503
        );
      }
      if (code === "INVALID_CREDENTIALS") {
        return json(
          {
            error: "Credenciais Spotify inválidas no servidor.",
            code: "INVALID_CREDENTIALS",
          },
          503
        );
      }
      return json(
        { error: "Falha ao autenticar no Spotify.", code: "TOKEN_FAILED" },
        502
      );
    }

    const url = new URL("https://api.spotify.com/v1/search");
    url.searchParams.set("q", q);
    url.searchParams.set("type", "track");
    url.searchParams.set("limit", "12");
    url.searchParams.set("market", "BR");

    const searchRes = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (searchRes.status === 429) {
      return json(
        {
          error: "Limite de buscas do Spotify atingido. Tente novamente em instantes.",
          code: "RATE_LIMIT",
        },
        429
      );
    }

    if (!searchRes.ok) {
      const text = await searchRes.text();
      console.error("spotify_search_error", searchRes.status, text.slice(0, 200));
      return json(
        {
          error: "A API do Spotify retornou um erro. Tente novamente.",
          code: "SPOTIFY_ERROR",
        },
        502
      );
    }

    const data = await searchRes.json();
    const items = data?.tracks?.items ?? [];

    const tracks = items.map((t: {
      id: string;
      name: string;
      artists?: { name: string }[];
      album?: {
        name?: string;
        images?: { url: string; height?: number; width?: number }[];
      };
      external_urls?: { spotify?: string };
      duration_ms?: number;
    }) => {
      // Prefer medium image; do not transform artwork
      const images = t.album?.images ?? [];
      const artworkUrl =
        images.find((i) => (i.height ?? 0) >= 200 && (i.height ?? 0) <= 400)?.url ||
        images[1]?.url ||
        images[0]?.url ||
        null;

      return {
        id: t.id,
        name: t.name,
        artists: (t.artists ?? []).map((a) => a.name).join(", "),
        album: t.album?.name ?? "",
        artworkUrl,
        spotifyUrl:
          t.external_urls?.spotify ?? `https://open.spotify.com/track/${t.id}`,
        durationMs: t.duration_ms,
      };
    });

    return json({ tracks });
  } catch (e) {
    console.error("spotify_search_unhandled", (e as Error).message);
    return json(
      { error: "Erro interno na busca.", code: "INTERNAL" },
      500
    );
  }
});
