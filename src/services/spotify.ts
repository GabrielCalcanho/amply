import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { SpotifyTrackResult } from '../types';

export type SpotifySearchResult = {
  tracks: SpotifyTrackResult[];
  error: string | null;
  code?: string;
  unavailable?: boolean;
};

async function parseFunctionError(error: unknown): Promise<{ message: string; code?: string }> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body?.error) {
        return { message: String(body.error), code: body.code };
      }
    } catch {
      // ignore parse failure
    }
    return {
      message: 'A busca no Spotify falhou no servidor.',
      code: 'HTTP_ERROR',
    };
  }

  if (error instanceof FunctionsRelayError) {
    return {
      message:
        'Edge Function Spotify não encontrada ou não implantada. Faça o deploy de spotify-search no Supabase.',
      code: 'NOT_DEPLOYED',
    };
  }

  if (error instanceof FunctionsFetchError) {
    return {
      message: 'Sem conexão com o servidor. Verifique a internet e tente novamente.',
      code: 'NETWORK',
    };
  }

  const msg = (error as { message?: string })?.message ?? 'Falha na busca';
  const lower = msg.toLowerCase();

  if (
    lower.includes('failed to send') ||
    lower.includes('not found') ||
    lower.includes('404') ||
    lower.includes('relay')
  ) {
    return {
      message:
        'Edge Function Spotify não encontrada. Deploy: supabase functions deploy spotify-search',
      code: 'NOT_DEPLOYED',
    };
  }

  return { message: msg };
}

/**
 * Search tracks via Supabase Edge Function `spotify-search`.
 * Client Secret never leaves the Edge Function environment.
 */
export async function searchSpotifyTracks(query: string): Promise<SpotifySearchResult> {
  const q = query.trim();
  if (q.length < 2) return { tracks: [], error: null };

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        tracks: [],
        error: 'Faça login para buscar músicas no Spotify.',
        code: 'UNAUTHORIZED',
        unavailable: true,
      };
    }

    const { data, error } = await supabase.functions.invoke('spotify-search', {
      body: { q },
    });

    if (error) {
      const parsed = await parseFunctionError(error);
      return {
        tracks: [],
        error: parsed.message,
        code: parsed.code,
        unavailable: true,
      };
    }

    // Function may return 2xx with { error, code }
    if (data?.error) {
      return {
        tracks: [],
        error: String(data.error),
        code: data.code,
        unavailable: true,
      };
    }

    const tracks: SpotifyTrackResult[] = (data?.tracks || []).map((t: {
      id: string;
      name: string;
      artists: string;
      album: string;
      artworkUrl?: string | null;
      spotifyUrl: string;
      durationMs?: number;
    }) => ({
      id: t.id,
      name: t.name,
      artists: t.artists,
      album: t.album,
      artworkUrl: t.artworkUrl ?? null,
      spotifyUrl: t.spotifyUrl,
      durationMs: t.durationMs,
    }));

    return { tracks, error: null };
  } catch (e) {
    return {
      tracks: [],
      error: (e as Error).message || 'Erro de rede',
      code: 'EXCEPTION',
      unavailable: true,
    };
  }
}
