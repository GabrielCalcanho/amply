/** Centralized date/time helpers — display BR (DD/MM/AAAA), storage ISO (YYYY-MM-DD). */

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** ISO YYYY-MM-DD from Date (local). */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Display DD/MM/AAAA from ISO YYYY-MM-DD or Date. */
export function formatDateBR(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return '';
  let d: Date;
  if (typeof isoOrDate === 'string') {
    const s = isoOrDate.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      d = new Date(s.slice(0, 10) + 'T12:00:00');
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      return s;
    } else {
      d = new Date(s);
    }
  } else {
    d = isoOrDate;
  }
  if (Number.isNaN(d.getTime())) return '';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Parse DD/MM/AAAA or YYYY-MM-DD → ISO YYYY-MM-DD or null. */
export function parseDateToISO(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return null;
    // Validate calendar date (reject 2026-02-31)
    if (toISODate(d) !== s) return null;
    return s;
  }

  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) return null;
  const d = new Date(year, month - 1, day, 12, 0, 0);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return toISODate(d);
}

export function isValidDateInput(input: string): boolean {
  return parseDateToISO(input) !== null;
}

/** HH:MM from time string (may include seconds). */
export function formatTime(time: string | null | undefined): string {
  if (!time) return '';
  const t = time.trim();
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return t;
  return `${pad2(parseInt(m[1], 10))}:${m[2]}`;
}

/** Normalize to HH:MM:SS for Postgres TIME. */
export function toPostgresTime(input: string | null | undefined): string | null {
  if (!input) return null;
  const t = input.trim();
  if (!t) return null;
  if (/^\d{1,2}:\d{2}$/.test(t)) {
    const [h, m] = t.split(':');
    return `${pad2(parseInt(h, 10))}:${m}:00`;
  }
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(t)) {
    const [h, m, s] = t.split(':');
    return `${pad2(parseInt(h, 10))}:${m}:${s}`;
  }
  return null;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Next Sunday from today (if today is Sunday, returns next week's Sunday). */
export function nextSundayISO(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = Sun
  const add = day === 0 ? 7 : 7 - day;
  d.setDate(d.getDate() + add);
  return toISODate(d);
}

/** Long weekday label for cards, e.g. "dom., 14 de set." */
export function formatDateLongBR(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso.slice(0, 10) + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/** Month/day for birthdays: "14/09" */
export function formatDayMonth(iso: string | null | undefined): string {
  if (!iso) return '';
  const s = iso.slice(0, 10);
  const parts = s.split('-');
  if (parts.length < 3) return '';
  return `${parts[2]}/${parts[1]}`;
}

/** Next occurrence of birth_date (MM-DD) from today, as ISO this year or next. */
export function nextBirthdayISO(birthDateISO: string): string | null {
  const iso = parseDateToISO(birthDateISO) ?? (birthDateISO.match(/^\d{4}-\d{2}-\d{2}/) ? birthDateISO.slice(0, 10) : null);
  if (!iso) return null;
  const [, mm, dd] = iso.split('-');
  const now = new Date();
  const year = now.getFullYear();
  let candidate = `${year}-${mm}-${dd}`;
  const today = todayISO();
  if (candidate < today) {
    candidate = `${year + 1}-${mm}-${dd}`;
  }
  return candidate;
}

export function isBirthdayToday(birthDateISO: string | null | undefined): boolean {
  if (!birthDateISO) return false;
  const iso = birthDateISO.slice(0, 10);
  const parts = iso.split('-');
  if (parts.length < 3) return false;
  const today = todayISO().split('-');
  return parts[1] === today[1] && parts[2] === today[2];
}
