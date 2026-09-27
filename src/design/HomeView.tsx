import React from 'react';
import { Image, ImageSourcePropType, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandHeader, IconButton } from './Headers';
import { Icon } from './Icon';
import { Avatar, NextEventCard, SectionTitle } from './primitives';
import { useAmplyTheme } from './theme';
import { type } from './tokens';

/**
 * Home apresentacional (sem dados, sem Supabase): recebe tudo por props.
 * Na HomeScreen real, mantenha os hooks/queries atuais e só converta o resultado
 * para estas props. Seções sem itens não são exibidas.
 */
export type HomeViewProps = {
  greetingName: string;
  greetingSubtitle?: string;
  userPhoto?: ImageSourcePropType | null;
  unreadNotices?: number;
  onMenu: () => void;
  onBell: () => void;
  onProfile?: () => void;

  ministry?: {
    churchName?: string;
    ministryName: string;
    cover?: ImageSourcePropType | null;
    onPress: () => void;
  };

  nextEvent?: {
    eyebrow: string;
    title: string;
    lines: { icon: 'calendar' | 'map-pin' | 'clock'; text: string }[];
    countValue?: string | number;
    countLabel?: string;
    onPress?: () => void;
  };

  schedules?: { id: string; day: string; month: string; title: string; subtitle?: string; onPress: () => void }[];
  onSeeSchedules?: () => void;

  notices?: { id: string; title: string; excerpt?: string; date?: string; important?: boolean; onPress: () => void }[];
  onSeeNotices?: () => void;

  birthdays?: { id: string; name: string; label: string; photo?: ImageSourcePropType | null }[];
  onSeeBirthdays?: () => void;
};

export function HomeView(props: HomeViewProps) {
  const { colors } = useAmplyTheme();
  const { ministry, nextEvent, schedules, notices, birthdays } = props;

  return (
    <View>
      <BrandHeader
        onMenu={props.onMenu}
        right={
          <>
            <IconButton label="Avisos" onPress={props.onBell}>
              <View>
                <Icon name="bell" size={21} />
                {props.unreadNotices ? (
                  <View style={[styles.badge, { backgroundColor: colors.ink, borderColor: colors.background }]} />
                ) : null}
              </View>
            </IconButton>
            <Pressable accessibilityRole="button" accessibilityLabel="Perfil" onPress={props.onProfile} hitSlop={6}>
              <Avatar source={props.userPhoto} name={props.greetingName} size={30} />
            </Pressable>
          </>
        }
      />

      <View style={styles.greeting}>
        <Text style={[type.greeting, { color: colors.foreground }]}>Olá, {props.greetingName}</Text>
        {props.greetingSubtitle ? (
          <Text style={[type.body, { color: colors.mutedForeground, marginTop: 4 }]}>{props.greetingSubtitle}</Text>
        ) : null}
      </View>

      {ministry ? <MinistryHero {...ministry} /> : null}

      {nextEvent ? <NextEventCard {...nextEvent} /> : null}

      {schedules && schedules.length > 0 ? (
        <View>
          <SectionTitle title="Minhas escalas" actionLabel="Ver todas" onAction={props.onSeeSchedules} />
          {schedules.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={item.onPress}
              style={({ pressed }) => [styles.scheduleRow, pressed && { opacity: 0.6 }]}
            >
              <View style={styles.dateBlock}>
                <Text style={{ color: colors.foreground, fontSize: 22, fontWeight: '800', lineHeight: 24 }}>{item.day}</Text>
                <Text style={[type.eyebrow, { color: colors.mutedForeground }]}>{item.month.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={[type.rowTitle, { color: colors.foreground }]}>{item.title}</Text>
                {item.subtitle ? (
                  <Text numberOfLines={1} style={[type.caption, { color: colors.mutedForeground, marginTop: 3 }]}>
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>
              <Icon name="chevron-right" size={16} color={colors.subtle} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {notices && notices.length > 0 ? (
        <View>
          <SectionTitle title="Avisos" actionLabel="Ver todos" onAction={props.onSeeNotices} />
          {notices.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={item.onPress}
              style={({ pressed }) => [styles.notice, pressed && { opacity: 0.6 }]}
            >
              <View
                style={[
                  styles.noticeDot,
                  { backgroundColor: item.important ? colors.ink : 'transparent', borderColor: colors.subtle },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={[type.rowTitle, { color: colors.foreground }]}>{item.title}</Text>
                {item.excerpt ? (
                  <Text numberOfLines={2} style={[type.body, { color: colors.mutedForeground, marginTop: 3 }]}>
                    {item.excerpt}
                  </Text>
                ) : null}
                {item.date ? (
                  <Text style={[type.caption, { color: colors.subtle, marginTop: 5 }]}>{item.date}</Text>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {birthdays && birthdays.length > 0 ? (
        <View>
          <SectionTitle title="Aniversariantes" actionLabel="Ver todos" onAction={props.onSeeBirthdays} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.birthdays}>
            {birthdays.map((person) => (
              <View key={person.id} style={styles.birthday}>
                <Avatar source={person.photo} name={person.name} size={58} />
                <Text numberOfLines={1} style={[styles.birthdayName, { color: colors.foreground }]}>
                  {person.name.split(' ')[0]}
                </Text>
                <Text style={[type.caption, { color: colors.mutedForeground }]}>{person.label}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

/** Bloco de destaque do ministério: capa em tela larga com o texto sobreposto. */
function MinistryHero({
  churchName,
  ministryName,
  cover,
  onPress,
}: NonNullable<HomeViewProps['ministry']>) {
  const { colors } = useAmplyTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ministério ${ministryName}`}
      onPress={onPress}
      style={({ pressed }) => [styles.hero, { backgroundColor: colors.ink }, pressed && { opacity: 0.85 }]}
    >
      {cover ? <Image source={cover} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      {/* Véu preto para garantir contraste do texto sobre qualquer foto. */}
      {cover ? <View style={[StyleSheet.absoluteFill, styles.veil]} /> : null}
      <View style={styles.heroCopy}>
        {churchName ? <Text style={[type.eyebrow, styles.heroEyebrow]}>{churchName.toUpperCase()}</Text> : null}
        <View style={styles.heroRow}>
          <Text numberOfLines={2} style={styles.heroTitle}>{ministryName}</Text>
          <Icon name="arrow-up-right" size={22} color={cover ? '#FFFFFF' : colors.onInk} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: { position: 'absolute', top: -1, right: -1, width: 9, height: 9, borderRadius: 5, borderWidth: 2 },
  greeting: { marginTop: 10, marginBottom: 20 },
  hero: { height: 176, borderRadius: 20, overflow: 'hidden', justifyContent: 'flex-end' },
  veil: { backgroundColor: 'rgba(0,0,0,0.42)' },
  heroCopy: { padding: 18 },
  heroEyebrow: { color: 'rgba(255,255,255,0.75)', marginBottom: 6 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  heroTitle: { flex: 1, color: '#FFFFFF', fontSize: 26, fontWeight: '800', lineHeight: 30 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 10 },
  dateBlock: { width: 44, alignItems: 'center' },
  notice: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  noticeDot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, marginTop: 5 },
  birthdays: { gap: 18, paddingRight: 8 },
  birthday: { alignItems: 'center', width: 64 },
  birthdayName: { fontSize: 12, fontWeight: '600', marginTop: 6, maxWidth: 64 },
});
