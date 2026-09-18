/**
 * Helpers to normalize payloads before sending to Supabase.
 * Never send undefined; convert empty strings to null for nullable fields.
 */

export function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = value.trim();
  return t === '' ? null : t;
}

/** Normalize HH:MM or HH:MM:SS to HH:MM:SS for PostgreSQL TIME, or null if empty/invalid. */
export function normalizeTime(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = value.trim();
  if (!t) return null;
  if (/^\d{1,2}:\d{2}$/.test(t)) {
    const [h, m] = t.split(':');
    return `${h.padStart(2, '0')}:${m}:00`;
  }
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(t)) {
    const [h, m, s] = t.split(':');
    return `${h.padStart(2, '0')}:${m}:${s}`;
  }
  return null;
}

export function isValidDateYYYYMMDD(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T12:00:00');
  return !Number.isNaN(d.getTime());
}

/** Human-readable message from Supabase/PostgREST errors. */
export function formatSupabaseError(
  error: { message?: string; code?: string; details?: string; hint?: string } | null | undefined
): string {
  if (!error) return 'Erro desconhecido';
  const msg = error.message ?? '';
  const details = error.details ?? '';
  const code = error.code ?? '';
  const lower = msg.toLowerCase();

  if (code === '23505') return 'Registro duplicado.';
  if (code === '23503') return 'Referência inválida (registro relacionado não existe).';
  if (code === '23502') return 'Campo obrigatório ausente.';
  if (code === '22P02') return 'Formato de dado inválido.';
  if (code === '42501' || lower.includes('policy') || lower.includes('permission') || lower.includes('row-level security')) {
    return 'Sem permissão para esta operação.';
  }
  if (lower.includes('jwt') || lower.includes('not authenticated') || lower.includes('invalid claim')) {
    return 'Sessão expirada. Faça login novamente.';
  }
  // Missing column / schema cache (common when migrations were not applied)
  if (
    lower.includes('column') &&
    (lower.includes('does not exist') || lower.includes('schema cache') || lower.includes('could not find'))
  ) {
    const colMatch = msg.match(/['"]([a-z_]+)['"]/i);
    const col = colMatch?.[1] ?? 'desconhecida';
    return (
      `Coluna "${col}" não existe no banco (ou cache do schema desatualizado). ` +
      `Execute as migrations em supabase/migrations/ no SQL Editor do Supabase e rode: NOTIFY pgrst, 'reload schema';`
    );
  }
  if (lower.includes('relation') && lower.includes('does not exist')) {
    return (
      'Tabela não encontrada no banco. ' +
      'Execute o schema.sql e as migrations em supabase/migrations/ no projeto Supabase.'
    );
  }
  if (details && details !== msg) return `${msg} (${details})`;
  return msg || 'Não foi possível concluir a operação.';
}
