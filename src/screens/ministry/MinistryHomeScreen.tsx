import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { TabScreenShell } from '../../components/layout/TabScreenShell';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, typography, radius, ColorTokens } from '../../constants/theme';

const LINKS: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}[] = [
  { label: 'Equipes', icon: 'people-outline', route: 'Teams' },
  { label: 'Funções', icon: 'musical-notes-outline', route: 'Roles' },
  { label: 'Classificações', icon: 'pricetags-outline', route: 'Classifications' },
  { label: 'Membros', icon: 'person-outline', route: 'Team' },
];

export function MinistryHomeScreen() {
  const navigation = useNavigation<any>();
  const { church, membership } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const shadow = Platform.select({
    ios: {
      shadowColor: isDark ? '#000' : '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.06,
      shadowRadius: 6,
    },
    android: { elevation: 2 },
    default: {},
  });

  return (
    <TabScreenShell>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner / capa */}
        <View style={[styles.banner, shadow]}>
          {church?.logo_url ? (
            <Image source={{ uri: church.logo_url }} style={styles.bannerImage} />
          ) : (
            <View style={[styles.bannerImage, styles.bannerPlaceholder]}>
              <Ionicons name="business-outline" size={40} color={colors.primary} />
            </View>
          )}
          <View style={styles.bannerOverlay}>
            <Text style={styles.bannerLabel}>Ministério</Text>
            <Text style={styles.bannerName} numberOfLines={2}>
              {church?.name ?? 'Ministério'}
            </Text>
            {church?.invite_code ? (
              <Text style={styles.bannerInvite}>Convite · {church.invite_code}</Text>
            ) : null}
          </View>
        </View>

        <Text style={styles.section}>Estrutura</Text>
        <View style={styles.grid}>
          {LINKS.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={[styles.card, shadow]}
              onPress={() => navigation.navigate(item.route)}
              activeOpacity={0.85}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name={item.icon} size={22} color={colors.primary} />
              </View>
              <Text style={styles.cardLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {membership?.role === 'owner' || membership?.role === 'leader' ? (
          <Text style={styles.hint}>
            Você pode gerenciar equipes, funções e classificações. A imagem do ministério pode ser
            alterada na Home.
          </Text>
        ) : null}
      </ScrollView>
    </TabScreenShell>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
    banner: {
      borderRadius: radius.xl,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.xl,
    },
    bannerImage: {
      width: '100%',
      height: 140,
    },
    bannerPlaceholder: {
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bannerOverlay: {
      padding: spacing.md,
      backgroundColor: colors.surface,
    },
    bannerLabel: {
      ...typography.label,
      color: colors.textMuted,
      textTransform: 'uppercase',
      fontSize: 10,
    },
    bannerName: {
      ...typography.h2,
      color: colors.text,
      marginTop: 4,
    },
    bannerInvite: {
      ...typography.caption,
      color: colors.primary,
      marginTop: 6,
      fontWeight: '600',
    },
    section: {
      ...typography.label,
      color: colors.textMuted,
      textTransform: 'uppercase',
      marginBottom: spacing.sm,
    },
    grid: { gap: spacing.sm },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardLabel: { ...typography.bodyMedium, color: colors.text, flex: 1 },
    hint: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.xl,
      lineHeight: 18,
    },
  });
}
