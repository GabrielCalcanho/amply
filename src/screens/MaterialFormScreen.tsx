import React, {useState, useMemo} from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { spacing, typography, ColorTokens } from '../constants/theme';
import { formatSupabaseError } from '../utils/payload';
import { MaterialType } from '../types';

const TYPES: { value: MaterialType; label: string }[] = [
  { value: 'chord', label: 'Cifra (texto)' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'spotify', label: 'Spotify' },
  { value: 'external_link', label: 'Link externo' },
  { value: 'pdf', label: 'PDF (link)' },
  { value: 'note', label: 'Nota' },
];

export function MaterialFormScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const songId = route.params?.songId as string;

  const [type, setType] = useState<MaterialType>('chord');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const needsUrl = ['youtube', 'spotify', 'external_link', 'pdf'].includes(type);
  const needsContent = ['chord', 'note'].includes(type);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Erro', 'Informe um título');
      return;
    }
    if (needsUrl && !url.trim()) {
      Alert.alert('Erro', 'Informe a URL');
      return;
    }
    if (needsContent && !content.trim()) {
      Alert.alert('Erro', 'Informe o conteúdo');
      return;
    }
    if (!user) return;

    setLoading(true);
    const { error } = await supabase.from('song_materials').insert({
      song_id: songId,
      type,
      title: title.trim(),
      url: needsUrl ? url.trim() : null,
      content: needsContent ? content.trim() : null,
      created_by: user.id,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Erro', formatSupabaseError(error));
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title="Novo material" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Tipo</Text>
        <View style={styles.typeRow}>
          {TYPES.map((t) => (
            <Button
              key={t.value}
              title={t.label}
              onPress={() => setType(t.value)}
              variant={type === t.value ? 'primary' : 'secondary'}
              style={styles.typeBtn}
              textStyle={{ fontSize: 13 }}
            />
          ))}
        </View>

        <Input label="Título" value={title} onChangeText={setTitle} placeholder="Ex: Cifra original" />
        {needsUrl && (
          <Input label="URL" value={url} onChangeText={setUrl} placeholder="https://..." autoCapitalize="none" />
        )}
        {needsContent && (
          <Input
            label="Conteúdo"
            value={content}
            onChangeText={setContent}
            placeholder={type === 'chord' ? 'Cole a cifra aqui...' : 'Texto...'}
            multiline
            style={{ height: 200, textAlignVertical: 'top' }}
          />
        )}

        <Button title="Salvar" onPress={handleSave} loading={loading} style={styles.btn} />
        <Button title="Cancelar" onPress={() => navigation.goBack()} variant="ghost" />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.lg },
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  typeBtn: { height: 36, paddingHorizontal: spacing.sm, marginBottom: spacing.xs },
  btn: { marginTop: spacing.md },
})
}

