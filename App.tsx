import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { ToastProvider } from './src/contexts/ToastContext';
import { RootNavigator } from './src/navigation/RootNavigator';

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  override state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AMPLY] render crash', error, info?.componentStack);
  }

  override render() {
    if (this.state.error) {
      return (
        <View style={styles.crash}>
          <Text style={styles.crashTitle}>Erro ao carregar o Amply</Text>
          <Text style={styles.crashMsg}>{this.state.error.message}</Text>
          <Text style={styles.crashHint}>
            Verifique o console (F12) e o arquivo .env com as chaves do Supabase.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function AppStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default function App() {
  if (__DEV__) console.log('[AMPLY] REDESIGN_2026_09_21 v2.1.0 — boot');

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <AuthProvider>
              <ToastProvider>
                <AppStatusBar />
                <RootNavigator />
              </ToastProvider>
            </AuthProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  crash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F5F5F5',
  },
  crashTitle: { fontSize: 18, fontWeight: '700', color: '#111111', marginBottom: 8 },
  crashMsg: { fontSize: 14, color: '#C41E3A', textAlign: 'center', marginBottom: 12 },
  crashHint: { fontSize: 13, color: '#6B6B6B', textAlign: 'center' },
});
