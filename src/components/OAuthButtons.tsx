import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './Button';
import { spacing, typography } from '../constants/theme';
import { OAuthProvider } from '../services/oauth';

/**
 * Login social (Google/Apple) está implementado, mas DESATIVADO até os
 * provedores serem configurados no Supabase. Para reativar, troque para true.
 */
const OAUTH_ENABLED = false;

const PROVIDERS: { key: OAuthProvider; label: string; icon: 'logo-google' | 'logo-apple' }[] = [
  { key: 'google', label: 'Continuar com Google', icon: 'logo-google' },
  { key: 'apple', label: 'Continuar com Apple', icon: 'logo-apple' },
];

interface OAuthButtonsProps {
  /** Optional divider label rendered above the buttons. Pass null to hide. */
  dividerLabel?: string | null;
}

export function OAuthButtons({ dividerLabel = 'ou' }: OAuthButtonsProps) {
  const { signInWithOAuth, loading } = useAuth();
  const { colors } = useTheme();
  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState('');

  const handle = async (provider: OAuthProvider) => {
    setError('');
    setPending(provider);
    const { error: err } = await signInWithOAuth(provider);
    setPending(null);
    if (err) setError(err);
  };

  if (!OAUTH_ENABLED) return null;

  return (
    <View style={styles.wrap}>
      {dividerLabel ? (
        <View style={styles.divider}>
          <View style={[styles.line, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.textMuted }]}>
            {dividerLabel}
          </Text>
          <View style={[styles.line, { backgroundColor: colors.border }]} />
        </View>
      ) : null}

      {PROVIDERS.map((p) => (
        <Button
          key={p.key}
          title={p.label}
          variant="ghost"
          fullWidth
          loading={loading && pending === p.key}
          disabled={loading && pending !== p.key}
          onPress={() => handle(p.key)}
          leftIcon={<Ionicons name={p.icon} size={20} color={colors.text} />}
          style={styles.btn}
          textStyle={styles.btnText}
        />
      ))}

      {error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    ...typography.small,
    marginHorizontal: spacing.sm,
  },
  btn: {
    minHeight: 48,
  },
  btnText: {
    ...typography.label,
    fontWeight: '600',
  },
  error: {
    ...typography.caption,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
