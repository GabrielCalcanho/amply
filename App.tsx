import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AMPLY] render crash', error, info?.componentStack);
  }

  render() {
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

export default function App() {
  if (__DEV__) console.log('[AMPLY] REFORM_2026_09_15 v2.0.1 — boot');

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <AuthProvider>
              <StatusBar style="auto" />
              <RootNavigator />
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
    backgroundColor: '#F7F6F3',
  },
  crashTitle: { fontSize: 18, fontWeight: '700', color: '#1A1C19', marginBottom: 8 },
  crashMsg: { fontSize: 14, color: '#B91C1C', textAlign: 'center', marginBottom: 12 },
  crashHint: { fontSize: 13, color: '#8B8E86', textAlign: 'center' },
});
