import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { Profile, Church, ChurchMember } from '../types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  church: Church | null;
  membership: ChurchMember | null;
  loading: boolean;
  initializing: boolean;
}

interface AuthContextValue extends AuthState {
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  createChurch: (name: string) => Promise<{ error: string | null; church?: Church }>;
  joinChurch: (inviteCode: string) => Promise<{ error: string | null }>;
  refreshMembership: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    church: null,
    membership: null,
    loading: false,
    initializing: true,
  });

  const loadUserData = useCallback(async (userId: string) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.warn('loadUserData profile:', profileError.message);
      }

      const { data: membership, error: memberError } = await supabase
        .from('church_members')
        .select('*, church:churches(*)')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (memberError) {
        console.warn('loadUserData membership:', memberError.message);
      }

      const churchData = membership?.church ?? null;

      setState((prev) => ({
        ...prev,
        profile: profile ?? null,
        membership: membership
          ? {
              id: membership.id,
              church_id: membership.church_id,
              user_id: membership.user_id,
              role: membership.role,
              instrument: membership.instrument,
              created_at: membership.created_at,
            }
          : null,
        church: churchData,
        initializing: false,
        loading: false,
      }));
    } catch (e) {
      console.warn('loadUserData error', e);
      setState((prev) => ({ ...prev, initializing: false, loading: false }));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    const finishWithoutSession = () => {
      if (cancelled) return;
      setState((prev) => ({
        ...prev,
        session: null,
        user: null,
        profile: null,
        church: null,
        membership: null,
        initializing: false,
        loading: false,
      }));
    };

    (async () => {
      if (!isSupabaseConfigured) {
        console.warn('[AMPLY] Auth: Supabase não configurado — mostrando login.');
        finishWithoutSession();
        return;
      }
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.warn('[AMPLY] getSession:', error.message);
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          session,
          user: session?.user ?? null,
        }));
        if (session?.user) {
          await loadUserData(session.user.id);
        } else {
          setState((prev) => ({ ...prev, initializing: false, loading: false }));
        }
      } catch (e) {
        console.warn('[AMPLY] getSession failed', e);
        finishWithoutSession();
      }
    })();

    try {
      if (isSupabaseConfigured) {
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          setState((prev) => ({
            ...prev,
            session,
            user: session?.user ?? null,
          }));
          if (session?.user) {
            loadUserData(session.user.id);
          } else {
            setState((prev) => ({
              ...prev,
              profile: null,
              church: null,
              membership: null,
              initializing: false,
              loading: false,
            }));
          }
        });
        subscription = data.subscription;
      }
    } catch (e) {
      console.warn('[AMPLY] onAuthStateChange failed', e);
      finishWithoutSession();
    }

    return () => {
      cancelled = true;
      try {
        subscription?.unsubscribe();
      } catch {
        /* ignore */
      }
    };
  }, [loadUserData]);

  const signUp = async (email: string, password: string, name: string) => {
    setState((prev) => ({ ...prev, loading: true }));
    // Deep link back into the app (Expo Go / production). Must also be allowlisted
    // in Supabase Auth → URL Configuration → Redirect URLs.
    const emailRedirectTo = Linking.createURL('/');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo,
      },
    });
    setState((prev) => ({ ...prev, loading: false }));
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true }));
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setState((prev) => ({ ...prev, loading: false }));
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    setState((prev) => ({ ...prev, loading: true }));
    await supabase.auth.signOut();
    setState({
      session: null,
      user: null,
      profile: null,
      church: null,
      membership: null,
      loading: false,
      initializing: false,
    });
  };

  const resetPassword = async (email: string) => {
    const redirectTo = Linking.createURL('/');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return { error: error?.message ?? null };
  };

  const createChurch = async (name: string) => {
    if (!state.user) return { error: 'Não autenticado' };
    setState((prev) => ({ ...prev, loading: true }));

    const { data: church, error: churchError } = await supabase.rpc(
      'create_church_with_owner',
      { p_name: name }
    );

    if (churchError || !church) {
      setState((prev) => ({ ...prev, loading: false }));
      return { error: churchError?.message ?? 'Erro ao criar igreja' };
    }

    await loadUserData(state.user.id);
    return { error: null, church: church as Church };
  };

  const joinChurch = async (inviteCode: string) => {
    if (!state.user) return { error: 'Não autenticado' };
    setState((prev) => ({ ...prev, loading: true }));

    const { data: churchId, error } = await supabase.rpc('join_church_by_invite', {
      p_code: inviteCode.toUpperCase().trim(),
    });

    if (error || !churchId) {
      setState((prev) => ({ ...prev, loading: false }));
      const msg = error?.message ?? '';
      if (msg.toLowerCase().includes('invalid')) {
        return { error: 'Código inválido' };
      }
      return { error: msg || 'Não foi possível entrar' };
    }

    await loadUserData(state.user.id);
    return { error: null };
  };

  const refreshMembership = async () => {
    if (state.user) await loadUserData(state.user.id);
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!state.user) return { error: 'Não autenticado' };
    const { error } = await supabase.from('profiles').update(data).eq('id', state.user.id);
    if (!error) await loadUserData(state.user.id);
    return { error: error?.message ?? null };
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signUp,
        signIn,
        signOut,
        resetPassword,
        createChurch,
        joinChurch,
        refreshMembership,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
