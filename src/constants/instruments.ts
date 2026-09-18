/** Instrument catalog for AMPLY — multi-select, categorized. */

export type InstrumentCategoryId =
  | 'strings'
  | 'keys'
  | 'percussion'
  | 'brass'
  | 'woodwinds'
  | 'vocals'
  | 'production';

export type InstrumentDef = {
  id: string;
  label: string;
  category: InstrumentCategoryId;
  /** Ionicons glyph name */
  icon: string;
};

export const INSTRUMENT_CATEGORIES: {
  id: InstrumentCategoryId;
  label: string;
  icon: string;
}[] = [
  { id: 'strings', label: 'Cordas', icon: 'guitar-outline' },
  { id: 'keys', label: 'Teclas', icon: 'piano-outline' },
  { id: 'percussion', label: 'Percussão', icon: 'musical-notes-outline' },
  { id: 'brass', label: 'Metais', icon: 'radio-outline' },
  { id: 'woodwinds', label: 'Madeiras', icon: 'leaf-outline' },
  { id: 'vocals', label: 'Vocais', icon: 'mic-outline' },
  { id: 'production', label: 'Produção', icon: 'options-outline' },
];

export const INSTRUMENTS: InstrumentDef[] = [
  // Cordas
  { id: 'guitar_electric', label: 'Guitarra elétrica', category: 'strings', icon: 'flash-outline' },
  { id: 'acoustic_guitar', label: 'Violão', category: 'strings', icon: 'musical-note-outline' },
  { id: 'acoustic_guitar_steel', label: 'Violão acústico', category: 'strings', icon: 'musical-note-outline' },
  { id: 'electric_acoustic', label: 'Violão elétrico', category: 'strings', icon: 'flash-outline' },
  { id: 'bass_electric', label: 'Baixo elétrico', category: 'strings', icon: 'pulse-outline' },
  { id: 'bass_acoustic', label: 'Baixo acústico', category: 'strings', icon: 'pulse-outline' },
  { id: 'ukulele', label: 'Ukulele', category: 'strings', icon: 'happy-outline' },
  { id: 'cavaquinho', label: 'Cavaquinho', category: 'strings', icon: 'happy-outline' },
  { id: 'banjo', label: 'Banjo', category: 'strings', icon: 'ellipse-outline' },
  { id: 'mandolin', label: 'Bandolim', category: 'strings', icon: 'ellipse-outline' },
  { id: 'viola_caipira', label: 'Viola caipira', category: 'strings', icon: 'musical-note-outline' },
  { id: 'violin', label: 'Violino', category: 'strings', icon: 'disc-outline' },
  { id: 'viola', label: 'Viola', category: 'strings', icon: 'disc-outline' },
  { id: 'cello', label: 'Violoncelo', category: 'strings', icon: 'disc-outline' },
  { id: 'double_bass', label: 'Contrabaixo acústico', category: 'strings', icon: 'pulse-outline' },
  { id: 'harp', label: 'Harpa', category: 'strings', icon: 'flower-outline' },
  // Teclas
  { id: 'piano', label: 'Piano', category: 'keys', icon: 'grid-outline' },
  { id: 'piano_acoustic', label: 'Piano acústico', category: 'keys', icon: 'grid-outline' },
  { id: 'piano_digital', label: 'Piano digital', category: 'keys', icon: 'hardware-chip-outline' },
  { id: 'keyboard', label: 'Teclado', category: 'keys', icon: 'keypad-outline' },
  { id: 'organ', label: 'Órgão', category: 'keys', icon: 'business-outline' },
  { id: 'synth', label: 'Synth', category: 'keys', icon: 'hardware-chip-outline' },
  { id: 'midi_controller', label: 'Controlador MIDI', category: 'keys', icon: 'git-network-outline' },
  // Percussão
  { id: 'drums', label: 'Bateria', category: 'percussion', icon: 'ellipse-outline' },
  { id: 'cajon', label: 'Cajón', category: 'percussion', icon: 'cube-outline' },
  { id: 'congas', label: 'Congas', category: 'percussion', icon: 'ellipse-outline' },
  { id: 'bongos', label: 'Bongôs', category: 'percussion', icon: 'ellipse-outline' },
  { id: 'pandeiro', label: 'Pandeiro', category: 'percussion', icon: 'radio-button-on-outline' },
  { id: 'tamborim', label: 'Tamborim', category: 'percussion', icon: 'radio-button-on-outline' },
  { id: 'shaker', label: 'Shaker', category: 'percussion', icon: 'water-outline' },
  { id: 'chocalho', label: 'Chocalho', category: 'percussion', icon: 'water-outline' },
  { id: 'percussion', label: 'Percussão', category: 'percussion', icon: 'musical-notes-outline' },
  { id: 'electronic_pad', label: 'Pad eletrônico', category: 'percussion', icon: 'tablet-landscape-outline' },
  // Metais
  { id: 'trumpet', label: 'Trompete', category: 'brass', icon: 'megaphone-outline' },
  { id: 'trombone', label: 'Trombone', category: 'brass', icon: 'megaphone-outline' },
  { id: 'sax_alto', label: 'Saxofone alto', category: 'brass', icon: 'musical-note-outline' },
  { id: 'sax_tenor', label: 'Saxofone tenor', category: 'brass', icon: 'musical-note-outline' },
  { id: 'sax_bari', label: 'Saxofone barítono', category: 'brass', icon: 'musical-note-outline' },
  { id: 'sax_soprano', label: 'Saxofone soprano', category: 'brass', icon: 'musical-note-outline' },
  { id: 'tuba', label: 'Tuba', category: 'brass', icon: 'funnel-outline' },
  { id: 'euphonium', label: 'Euphonium', category: 'brass', icon: 'funnel-outline' },
  // Madeiras
  { id: 'flute', label: 'Flauta', category: 'woodwinds', icon: 'remove-outline' },
  { id: 'flute_transverse', label: 'Flauta transversal', category: 'woodwinds', icon: 'remove-outline' },
  { id: 'clarinet', label: 'Clarinete', category: 'woodwinds', icon: 'remove-outline' },
  { id: 'oboe', label: 'Oboé', category: 'woodwinds', icon: 'remove-outline' },
  { id: 'bassoon', label: 'Fagote', category: 'woodwinds', icon: 'remove-outline' },
  { id: 'recorder', label: 'Flauta doce', category: 'woodwinds', icon: 'remove-outline' },
  // Vocais
  { id: 'vocal', label: 'Vocal', category: 'vocals', icon: 'mic-outline' },
  { id: 'lead_vocal', label: 'Vocal principal', category: 'vocals', icon: 'mic' },
  { id: 'backing_vocal', label: 'Backing vocal', category: 'vocals', icon: 'people-outline' },
  { id: 'tenor', label: 'Tenor', category: 'vocals', icon: 'male-outline' },
  { id: 'baritone_voice', label: 'Barítono', category: 'vocals', icon: 'male-outline' },
  { id: 'soprano', label: 'Soprano', category: 'vocals', icon: 'female-outline' },
  { id: 'alto', label: 'Contralto', category: 'vocals', icon: 'female-outline' },
  // Produção
  { id: 'dj', label: 'DJ', category: 'production', icon: 'disc-outline' },
  { id: 'music_production', label: 'Produção musical', category: 'production', icon: 'construct-outline' },
  { id: 'audio_tech', label: 'Técnico de áudio', category: 'production', icon: 'recording-outline' },
  { id: 'sound_design', label: 'Sonoplasta', category: 'production', icon: 'volume-high-outline' },
  { id: 'monitor_tech', label: 'Técnico de monitor', category: 'production', icon: 'headset-outline' },
  { id: 'multimedia', label: 'Multimídia', category: 'production', icon: 'desktop-outline' },
  { id: 'stream_operator', label: 'Operador de transmissão', category: 'production', icon: 'videocam-outline' },
];

/** Parse stored instrument field (comma-separated labels or single label). */
export function parseInstruments(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Serialize selected instrument labels for DB `instrument` TEXT column. */
export function serializeInstruments(labels: string[]): string | null {
  const cleaned = labels.map((s) => s.trim()).filter(Boolean);
  return cleaned.length ? cleaned.join(', ') : null;
}

export function instrumentByLabel(label: string): InstrumentDef | undefined {
  return INSTRUMENTS.find((i) => i.label.toLowerCase() === label.toLowerCase());
}
