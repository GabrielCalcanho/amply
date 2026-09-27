/**
 * Design tokens do AMPLY (preto e branco, neutro, sem verde).
 * Valores derivados de src/styles.css do protótipo web (oklch neutro -> hex).
 * O tema escuro é neutro de propósito (o protótipo web herdava um azulado do shadcn).
 */
export type AmplyColors = {
  background: string;
  card: string;
  /** Superfície "tinta": card do próximo evento, segmento ativo, capa de música. */
  ink: string;
  /** Texto/ícone sobre `ink`. */
  onInk: string;
  foreground: string;
  mutedForeground: string;
  subtle: string;
  /** Fundo de campos de busca, segmentos e ícones em bloco. */
  soft: string;
  border: string;
  destructive: string;
};

export const lightColors: AmplyColors = {
  background: '#FAFAFA',
  card: '#FFFFFF',
  ink: '#060606',
  onInk: '#FAFAFA',
  foreground: '#070707',
  mutedForeground: '#5D5D5D',
  subtle: '#747474',
  soft: '#EEEEEE',
  border: '#DBDBDB',
  destructive: '#D4183D',
};

export const darkColors: AmplyColors = {
  background: '#070707',
  card: '#121212',
  ink: '#FAFAFA',
  onInk: '#060606',
  foreground: '#FAFAFA',
  mutedForeground: '#9E9E9E',
  subtle: '#868686',
  soft: '#1F1F1F',
  border: '#2E2E2E',
  destructive: '#F0616D',
};

export const radius = {
  tile: 8,
  segment: 9,
  segments: 11,
  field: 12,
  card: 12,
  pill: 999,
} as const;

export const spacing = {
  screenX: 20,
  section: 22,
  /** Respiro no fim das telas. */
  tabBarClearance: 24,
} as const;

/**
 * Escala tipográfica. Ligeiramente maior que o protótipo (que usava 9-12px):
 * em aparelho real esses tamanhos ficam pequenos demais.
 */
export const type = {
  wordmark: { fontSize: 23, fontWeight: '900' as const },
  screenTitle: { fontSize: 17, fontWeight: '700' as const },
  greeting: { fontSize: 22, fontWeight: '800' as const },
  sectionTitle: { fontSize: 15, fontWeight: '700' as const },
  rowTitle: { fontSize: 14, fontWeight: '700' as const },
  body: { fontSize: 13, fontWeight: '400' as const },
  caption: { fontSize: 11, fontWeight: '400' as const },
  eyebrow: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.8 },
  tab: { fontSize: 10, fontWeight: '600' as const },
} as const;
