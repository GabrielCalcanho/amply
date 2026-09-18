import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, typography, ColorTokens } from '../../constants/theme';

export function ChurchSetupScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { createChurch, joinChurch, loading, signOut } = useAuth();
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setError('');
    if (!name.trim()) {
      setError('Informe o nome da igreja/ministério');
      return;
    }
    const { error: err } = await createChurch(name.trim());
    if (err) setError(err);
  };

  const handleJoin = async () => {
    setError('');
    if (!code.trim()) {
      setError('Informe o código de convite');
      return;
    }
    const { error: err } = await joinChurch(code.trim());
    if (err) setError(err);
  };

  if (mode === 'choose') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.logo}>AMPLY</Text>
          <Text style={styles.title}>Bem-vindo</Text>
          <Text style={styles.subtitle}>
            Para começar, crie um ministério ou entre em um existente.
          </Text>

          <Button title="Criar ministério" onPress={() => setMode('create')} style={styles.btn} />
          <Button
            title="Entrar com código"
            onPress={() => setMode('join')}
            variant="secondary"
            style={styles.btn}
          />
          <Button title="Sair" onPress={signOut} variant="ghost" style={styles.btn} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>
            {mode === 'create' ? 'Criar ministério' : 'Entrar em ministério'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'create'
              ? 'Você será o administrador deste ministério.'
              : 'Peça o código de convite ao líder.'}
          </Text>

          {mode === 'create' ? (
            <Input
              label="Nome do ministério"
              value={name}
              onChangeText={setName}
              placeholder="Ex: Igreja Central - Louvor"
              autoCapitalize="words"
            />
          ) : (
            <Input
              label="Código de convite"
              value={code}
              onChangeText={setCode}
              placeholder="Ex: AB12CD34"
              autoCapitalize="characters"
            />
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title={mode === 'create' ? 'Criar' : 'Entrar'}
            onPress={mode === 'create' ? handleCreate : handleJoin}
            loading={loading}
            style={styles.btn}
          />
          <Button title="Voltar" onPress={() => setMode('choose')} variant="ghost" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  logo: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  btn: {
    marginBottom: spacing.sm,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
});
}
