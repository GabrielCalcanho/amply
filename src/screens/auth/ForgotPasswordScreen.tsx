import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, typography, ColorTokens } from '../../constants/theme';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export function ForgotPasswordScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setError('');
    if (!email.trim()) {
      setError('Informe o email');
      return;
    }
    setLoading(true);
    const { error: err } = await resetPassword(email.trim());
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setSent(true);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.container}>
          <Text style={styles.title}>Recuperar senha</Text>
          <Text style={styles.subtitle}>
            {sent
              ? 'Enviamos um link para o seu email. Verifique sua caixa de entrada.'
              : 'Informe seu email para receber o link de recuperação.'}
          </Text>

          {!sent && (
            <>
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                placeholder="seu@email.com"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button title="Enviar link" onPress={handleReset} loading={loading} />
            </>
          )}

          <Button
            title="Voltar"
            onPress={() => navigation.goBack()}
            variant="ghost"
            style={styles.back}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  back: {
    marginTop: spacing.md,
  },
});
}
