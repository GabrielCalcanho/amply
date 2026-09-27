import { Ionicons } from '@expo/vector-icons';

/** Grupos de ministério mapeados a partir do instrumento/função do membro. */
export type MinistryGroupDef = {
  key: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  match: (instrument: string | null | undefined) => boolean;
};

const norm = (v: string | null | undefined) =>
  (v ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const MINISTRY_DEFS: MinistryGroupDef[] = [
  {
    key: 'louvor',
    name: 'Louvor',
    icon: 'musical-notes',
    match: (i) => {
      const v = norm(i);
      return !v || v.includes('louvor') || v.includes('lider') || v.includes('regencia');
    },
  },
  {
    key: 'banda',
    name: 'Banda',
    icon: 'people',
    match: (i) => {
      const v = norm(i);
      return v.includes('banda');
    },
  },
  {
    key: 'vocal',
    name: 'Vocal',
    icon: 'mic',
    match: (i) => {
      const v = norm(i);
      return v.includes('vocal') || v.includes('voz') || v.includes('canto');
    },
  },
  {
    key: 'violao',
    name: 'Violão',
    icon: 'musical-note',
    match: (i) => {
      const v = norm(i);
      return v.includes('violao') || v.includes('guitarra acustica');
    },
  },
  {
    key: 'bateria',
    name: 'Bateria',
    icon: 'radio',
    match: (i) => {
      const v = norm(i);
      return v.includes('bateria') || v.includes('cajon') || v.includes('percuss');
    },
  },
  {
    key: 'teclado',
    name: 'Teclado',
    icon: 'grid',
    match: (i) => {
      const v = norm(i);
      return v.includes('teclado') || v.includes('piano') || v.includes('keys');
    },
  },
  {
    key: 'baixo',
    name: 'Baixo',
    icon: 'pulse',
    match: (i) => {
      const v = norm(i);
      return v.includes('baixo') || v.includes('bass');
    },
  },
  {
    key: 'guitarra',
    name: 'Guitarra',
    icon: 'flash',
    match: (i) => {
      const v = norm(i);
      return v.includes('guitarra') && !v.includes('acustica');
    },
  },
  {
    key: 'outros',
    name: 'Outros',
    icon: 'ellipsis-horizontal',
    match: () => false, // preenchido como restante
  },
];

export function matchMinistryGroup(
  instrument: string | null | undefined,
  groupKey: string
): boolean {
  const def = MINISTRY_DEFS.find((d) => d.key === groupKey);
  if (!def) return false;
  if (groupKey === 'outros') {
    return !MINISTRY_DEFS.some((d) => d.key !== 'outros' && d.match(instrument));
  }
  return def.match(instrument);
}
