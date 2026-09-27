import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { OAuthButtons } from '../../components/OAuthButtons';
import { typography, spacing, radius, type ThemeColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export function SignUpScreen({ navigation }: Props) {
  const { signUp, loading } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSignUp = async () => {
    setError('');
    if (!name.trim() || !email.trim() || !password) {
      setError('Preencha todos os campos');
      return;
    }
    if (password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (password !== confirm) {
      setError('Senhas não coincidem');
      return;
    }
    const { error: err, needsConfirmation } = await signUp(email.trim(), password, name.trim());
    if (err) {
      setError(err);
      return;
    }
    if (needsConfirmation) {
      setSent(true);
    }
    // If a session was created, RootNavigator auto-switches to ChurchSetup.
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.sentWrap}>
          <View style={styles.sentIcon}>
            <Ionicons name="mail-open-outline" size={32} color={colors.text} />
          </View>
          <Text style={styles.sentTitle}>Conta criada!</Text>
          <Text style={styles.sentText}>
            Enviamos um link de confirmação para{' '}
            <Text style={styles.sentEmail}>{email}</Text>. Abra o e-mail e toque no link
            para ativar sua conta.
          </Text>
          <Text style={styles.sentHint}>
            Não recebeu? Confira a pasta de spam. O envio gratuito do Supabase permite
            poucos e-mails por hora — se demorar, tente novamente mais tarde.
          </Text>
          <Button
            title="Voltar para o login"
            variant="secondary"
            onPress={() => navigation.navigate('Login')}
            style={styles.sentBtn}
          />
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
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.logo}>AMPLY</Text>
            <Text style={styles.subtitle}>Crie sua conta</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Nome"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              placeholder="Seu nome"
            />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              placeholder="seu@email.com"
            />
            <Input
              label="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Mínimo 6 caracteres"
            />
            <Input
              label="Confirmar senha"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              placeholder="Repita a senha"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button title="Criar conta" onPress={handleSignUp} loading={loading} fullWidth style={styles.btn} />

            <View style={styles.oauth}>
              <OAuthButtons />
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Já tem conta?</Text>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
              <Text style={styles.link}>Entrar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    sentWrap: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sentIcon: {
      width: 72,
      height: 72,
      borderRadius: radius.full,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    sentTitle: {
      ...typography.h1,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    sentText: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    sentEmail: {
      ...typography.bodyMedium,
      color: colors.text,
    },
    sentHint: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.md,
      lineHeight: 18,
    },
    sentBtn: { marginTop: spacing.xl, alignSelf: 'stretch' },
    container: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
      justifyContent: 'center',
    },
    header: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    logo: {
      fontSize: 36,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: 4,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
    form: {
      marginBottom: spacing.xl,
    },
    btn: {
      marginTop: spacing.md,
    },
    oauth: {
      marginTop: spacing.lg,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
      marginBottom: spacing.sm,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.xs,
    },
    footerText: {
      ...typography.body,
      color: colors.textSecondary,
    },
    link: {
      ...typography.bodyMedium,
      color: colors.primary,
    },
  });
