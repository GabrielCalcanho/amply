import React from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Icon, IconName } from './Icon';
import { useAmplyTheme } from './theme';
import { radius, type } from './tokens';

/* ───────────── Avatar ───────────── */

export function Avatar({
  source,
  name,
  size = 48,
  ringColor,
}: {
  /** `{ uri }` do Supabase/Storage ou `require(...)`. Sem imagem, mostra as iniciais. */
  source?: ImageSourcePropType | null;
  name: string;
  size?: number;
  ringColor?: string;
}) {
  const { colors } = useAmplyTheme();
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  const box = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: ringColor ? 2 : 0,
    borderColor: ringColor,
  };
  if (source) {
    return <Image accessibilityLabel={name} source={source} style={[box, { backgroundColor: colors.soft }]} />;
  }
  return (
    <View style={[box, styles.center, { backgroundColor: colors.soft }]} accessibilityLabel={name}>
      <Text style={{ color: colors.mutedForeground, fontWeight: '700', fontSize: size * 0.34 }}>{initials}</Text>
    </View>
  );
}

/* ───────────── Ícone em bloco / círculo ───────────── */

export function IconTile({
  icon,
  size = 32,
  round = false,
  inverted = false,
}: {
  icon: IconName;
  size?: number;
  round?: boolean;
  inverted?: boolean;
}) {
  const { colors } = useAmplyTheme();
  return (
    <View
      style={[
        styles.center,
        {
          width: size,
          height: size,
          borderRadius: round ? size / 2 : radius.tile,
          backgroundColor: inverted ? colors.ink : colors.soft,
        },
      ]}
    >
      <Icon name={icon} size={Math.round(size * 0.5)} color={inverted ? colors.onInk : colors.foreground} />
    </View>
  );
}

/* ───────────── Card com borda fina ───────────── */

export function Card({
  children,
  onPress,
  style,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const { colors } = useAmplyTheme();
  const base: StyleProp<ViewStyle> = [
    styles.card,
    { backgroundColor: colors.card, borderColor: colors.border },
    style,
  ];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [base, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

/* ───────────── Título de seção ───────────── */

export function SectionTitle({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useAmplyTheme();
  return (
    <View style={styles.sectionTitle}>
      <Text style={[type.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <Text style={[type.caption, { color: colors.mutedForeground }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ───────────── Segmentos (Todas / Favoritas / Recentes) ───────────── */

export function Segments({
  items,
  activeIndex,
  onChange,
}: {
  items: string[];
  activeIndex: number;
  onChange: (index: number) => void;
}) {
  const { colors } = useAmplyTheme();
  return (
    <View style={[styles.segments, { backgroundColor: colors.soft }]}>
      {items.map((label, index) => {
        const active = index === activeIndex;
        return (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(index)}
            style={[styles.segment, active && { backgroundColor: colors.ink }]}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: active ? '700' : '500',
                color: active ? colors.onInk : colors.mutedForeground,
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ───────────── Campo de busca ───────────── */

export function SearchField({
  trailing,
  ...inputProps
}: TextInputProps & { trailing?: React.ReactNode }) {
  const { colors } = useAmplyTheme();
  return (
    <View style={[styles.search, { backgroundColor: colors.soft }]}>
      <Icon name="search" size={16} color={colors.mutedForeground} />
      <TextInput
        placeholderTextColor={colors.mutedForeground}
        {...inputProps}
        style={[styles.searchInput, { color: colors.foreground }, inputProps.style]}
      />
      {trailing}
    </View>
  );
}

/* ───────────── Linha de lista (músicas, membros, ministérios, ajustes) ───────────── */

export function ListRow({
  leading,
  title,
  subtitle,
  meta,
  showChevron = true,
  onPress,
  minHeight = 64,
}: {
  leading?: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Conteúdo à direita (tom/bpm, papel do membro, etc.). */
  meta?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  minHeight?: number;
}) {
  const { colors } = useAmplyTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { minHeight, borderBottomColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      {leading}
      <View style={styles.rowCopy}>
        <Text numberOfLines={1} style={[type.rowTitle, { color: colors.foreground }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[type.caption, { color: colors.mutedForeground, marginTop: 3 }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {meta}
      {showChevron ? <Icon name="chevron-right" size={16} color={colors.subtle} /> : null}
    </Pressable>
  );
}

/** Lista com linha fina no topo, como no protótipo. */
export function ListGroup({ children }: { children: React.ReactNode }) {
  const { colors } = useAmplyTheme();
  return <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>{children}</View>;
}

/* ───────────── Atalho (Ministérios, Avisos, Escalas, Aniversariantes) ───────────── */

export function ShortcutTile({
  icon,
  label,
  sublabel,
  onPress,
}: {
  icon: IconName;
  label: string;
  sublabel?: string;
  onPress: () => void;
}) {
  const { colors } = useAmplyTheme();
  return (
    <Card onPress={onPress} accessibilityLabel={label} style={styles.shortcut}>
      <IconTile icon={icon} />
      <Text style={[type.rowTitle, { color: colors.foreground, marginTop: 10 }]}>{label}</Text>
      {sublabel ? (
        <Text numberOfLines={2} style={[type.caption, { color: colors.mutedForeground, marginTop: 2 }]}>
          {sublabel}
        </Text>
      ) : null}
    </Card>
  );
}

/* ───────────── Card escuro do próximo evento ───────────── */

export function NextEventCard({
  eyebrow,
  title,
  lines,
  countValue,
  countLabel,
  onPress,
}: {
  eyebrow: string;
  title: string;
  lines: { icon: IconName; text: string }[];
  countValue?: string | number;
  countLabel?: string;
  onPress?: () => void;
}) {
  const { colors } = useAmplyTheme();
  const body = (
    <>
      <View style={{ flex: 1 }}>
        <Text style={[type.eyebrow, { color: colors.onInk, opacity: 0.7 }]}>{eyebrow}</Text>
        <Text style={{ color: colors.onInk, fontSize: 18, fontWeight: '800', marginTop: 5, marginBottom: 8 }}>
          {title}
        </Text>
        {lines.map((line) => (
          <View key={line.text} style={styles.eventLine}>
            <Icon name={line.icon} size={12} color={colors.onInk} />
            <Text style={{ color: colors.onInk, opacity: 0.75, fontSize: 12 }}>{line.text}</Text>
          </View>
        ))}
      </View>
      {countValue !== undefined ? (
        <View style={[styles.eventCount, { borderLeftColor: colors.onInk }]}>
          <Text style={{ color: colors.onInk, fontSize: 26, fontWeight: '800' }}>{countValue}</Text>
          {countLabel ? <Text style={{ color: colors.onInk, opacity: 0.7, fontSize: 11 }}>{countLabel}</Text> : null}
        </View>
      ) : null}
    </>
  );
  const style: StyleProp<ViewStyle> = [styles.eventCard, { backgroundColor: colors.ink }];
  if (!onPress) return <View style={style}>{body}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [style, pressed && styles.pressed]}>
      {body}
    </Pressable>
  );
}

/* ───────────── Estatísticas do perfil ───────────── */

export function StatsRow({ items }: { items: { value: string | number; label: string }[] }) {
  const { colors } = useAmplyTheme();
  return (
    <View
      style={[
        styles.stats,
        { borderTopColor: colors.border, borderBottomColor: colors.border },
      ]}
    >
      {items.map((item, index) => (
        <View
          key={item.label}
          style={[
            styles.stat,
            index < items.length - 1 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.border },
          ]}
        >
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '800' }}>{item.value}</Text>
          <Text style={[type.caption, { color: colors.mutedForeground }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

/* ───────────── Estilos ───────────── */

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: 12 },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 12,
  },
  segments: { flexDirection: 'row', padding: 3, borderRadius: radius.segments, marginBottom: 18 },
  segment: { flex: 1, height: 30, borderRadius: radius.segment, alignItems: 'center', justifyContent: 'center' },
  search: {
    height: 44,
    borderRadius: radius.field,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  rowCopy: { flex: 1, minWidth: 0 },
  shortcut: { flex: 1, minHeight: 104, alignItems: 'flex-start' },
  eventCard: { borderRadius: radius.card, padding: 16, flexDirection: 'row', marginTop: 22 },
  eventLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 3 },
  eventCount: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 15,
    marginLeft: 12,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  stats: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 14 },
  stat: { flex: 1, alignItems: 'center' },
});
