import React, {useState, useEffect, useMemo} from 'react';
import {
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabase';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { spacing, typography, ColorTokens } from '../constants/theme';
import { emptyToNull, formatSupabaseError } from '../utils/payload';

export function SongFormScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { church, user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const songId = route.params?.songId as string | undefined;

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [key, setKey] = useState('');
  const [bpm, setBpm] = useState('');
  const [capo, setCapo] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!songId) return;
    let cancelled = false;
    (async () => {
      const { data, error: err } = await supabase
        .from('songs')
        .select('*')
        .eq('id', songId)
        .single();
      if (cancelled) return;
      if (err) {
        Alert.alert('Erro', formatSupabaseError(err));
        return;
      }
      if (data) {
        setTitle(data.title ?? '');
        setArtist(data.artist ?? '');
        setAlbum(data.album ?? '');
        setKey(data.key ?? '');
        setBpm(data.bpm?.toString() ?? '');
        setCapo(data.capo?.toString() ?? '');
        setNotes(data.notes ?? '');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [songId]);

  const handleSave = async () => {
    setError('');
    if (!title.trim()) {
      setError('Título é obrigatório');
      return;
    }
    if (!church || !user) {
      Alert.alert('Erro', 'Sessão ou ministério não carregados.');
      return;
    }

    let bpmValue: number | null = null;
    if (bpm.trim()) {
      const parsed = parseInt(bpm.trim(), 10);
      if (Number.isNaN(parsed) || parsed < 1 || parsed > 400) {
        setError('BPM deve ser um número entre 1 e 400');
        return;
      }
      bpmValue = parsed;
    }

    let capoValue: number | null = null;
    if (capo.trim()) {
      const parsed = parseInt(capo.trim(), 10);
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 12) {
        setError('Capotraste deve ser entre 0 e 12');
        return;
      }
      capoValue = parsed;
    }

    setLoading(true);

    const fields = {
      title: title.trim(),
      artist: emptyToNull(artist),
      album: emptyToNull(album),
      key: emptyToNull(key),
      bpm: bpmValue,
      capo: capoValue,
      notes: emptyToNull(notes),
    };

    let err: { message?: string; code?: string; details?: string } | null = null;
    if (songId) {
      const { error: updateError } = await supabase.from('songs').update(fields).eq('id', songId);
      err = updateError;
    } else {
      const { error: insertError } = await supabase.from('songs').insert({
        ...fields,
        church_id: church.id,
        created_by: user.id,
      });
      err = insertError;
    }

    setLoading(false);
    if (err) {
      const msg = formatSupabaseError(err);
      setError(msg);
      Alert.alert('Erro', msg);
      return;
    }

    Alert.alert('Sucesso', songId ? 'Música atualizada.' : 'Música adicionada ao repertório.');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title={songId ? 'Editar música' : 'Nova música'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Input
            label="Título *"
            value={title}
            onChangeText={setTitle}
            placeholder="Nome da música"
            autoCapitalize="words"
          />
          <Input
            label="Artista"
            value={artist}
            onChangeText={setArtist}
            placeholder="Artista ou banda"
            autoCapitalize="words"
          />
          <Input label="Álbum" value={album} onChangeText={setAlbum} placeholder="Álbum" />
          <Input
            label="Tom"
            value={key}
            onChangeText={setKey}
            placeholder="Ex: G, Am, C#"
            autoCapitalize="characters"
          />
          <Input
            label="BPM"
            value={bpm}
            onChangeText={setBpm}
            placeholder="Ex: 72"
            keyboardType="number-pad"
          />
          <Input
            label="Capotraste"
            value={capo}
            onChangeText={setCapo}
            placeholder="0–12"
            keyboardType="number-pad"
          />
          <Input
            label="Observações"
            value={notes}
            onChangeText={setNotes}
            placeholder="Notas da equipe"
            multiline
            style={{ height: 80, textAlignVertical: 'top' }}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button title="Salvar" onPress={handleSave} loading={loading} style={styles.btn} />
          <Button title="Cancelar" onPress={() => navigation.goBack()} variant="ghost" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  error: { ...typography.caption, color: colors.danger, marginBottom: spacing.sm },
  btn: { marginTop: spacing.md },
})
}

