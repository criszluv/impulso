export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Formatea "2023-04" como "abr 2023". Devuelve '' si el valor no sirve. */
export function formatMonth(value: string): string {
  if (!value) return '';
  const [y, m] = value.split('-');
  const monthIndex = Number(m) - 1;
  if (!y || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) return value;
  return `${MONTHS[monthIndex]} ${y}`;
}

export function formatRange(start: string, end: string, current: boolean): string {
  const from = formatMonth(start);
  const to = current ? 'Actualidad' : formatMonth(end);
  if (!from && !to) return '';
  if (!from) return to;
  if (!to) return from;
  return `${from} — ${to}`;
}

export function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Meses entre dos fechas "YYYY-MM". */
export function monthsBetween(start: string, end: string): number {
  if (!start) return 0;
  const [sy, sm] = start.split('-').map(Number);
  const endValue = end || new Date().toISOString().slice(0, 7);
  const [ey, em] = endValue.split('-').map(Number);
  if (!sy || !sm || !ey || !em) return 0;
  return Math.max(0, (ey - sy) * 12 + (em - sm));
}

export function humanDuration(months: number): string {
  if (months <= 0) return '';
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts: string[] = [];
  if (years) parts.push(`${years} ${years === 1 ? 'año' : 'años'}`);
  if (rest) parts.push(`${rest} ${rest === 1 ? 'mes' : 'meses'}`);
  return parts.join(' y ');
}

export function daysSince(iso: string): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function splitList(value: string): string[] {
  return value
    .split(/[,\n;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function download(filename: string, content: string, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
