import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { supabase } from './supabase';
import { formatAuthError } from '../utils/payload';

export type OAuthProvider = 'google' | 'apple';

/** Where Supabase should send the user back after the provider authenticates. */
export const oauthRedirectUri = makeRedirectUri();

/** Turns an OAuth callback URL (hash or query) into a Supabase session. */
export async function createSessionFromUrl(url: string) {
  const { params } = QueryParams.getQueryParams(url);
  try {
    const { access_token, refresh_token } = params;
    if (!access_token || !refresh_token) {
      return { error: new Error('Resposta de autenticação incompleta') };
    }
    return await supabase.auth.setSession({ access_token, refresh_token });
  } catch (error) {
    return { error: error as Error };
  }
}

type OAuthResult = { error: string | null; cancelled?: boolean };

/**
 * Web only: after the provider redirects back, Supabase puts the tokens in the
 * URL. Because the client runs with detectSessionInUrl:false we parse them here
 * once on app load and clear the URL so a refresh doesn't re-trigger it.
 */
export async function handleWebOAuthCallback(): Promise<boolean> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const url = window.location.href;
  if (!url.includes('access_token') && !url.includes('refresh_token')) return false;
  await createSessionFromUrl(url);
  try {
    window.history.replaceState({}, document.title, window.location.pathname);
  } catch {
    /* ignore */
  }
  return true;
}

export async function signInWithProvider(provider: OAuthProvider): Promise<OAuthResult> {
  // Web: let Supabase redirect the whole page; the callback is handled on load.
  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: oauthRedirectUri, skipBrowserRedirect: false },
    });
    return { error: error ? formatAuthError(error.message) : null };
  }

  // Native: open an in-app browser, capture the deep-link redirect, set session.
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: oauthRedirectUri, skipBrowserRedirect: true },
  });
  if (error || !data?.url) {
    return { error: formatAuthError(error?.message) };
  }

  const res = await WebBrowser.openAuthSessionAsync(data.url, oauthRedirectUri);
  if (res.type !== 'success') {
    return { error: null, cancelled: true };
  }

  const { error: sessionError } = await createSessionFromUrl(res.url);
  if (sessionError) {
    return { error: formatAuthError((sessionError as Error).message) };
  }
  return { error: null };
}
