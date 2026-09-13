import type { Application, ApplicationStatus, Profile } from '../types';

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  guardada: 'Me interesa',
  postulada: 'Ya postulé',
  entrevista: 'Me contactaron',
  oferta: 'Tengo una oferta',
  rechazada: 'Finalizada',
};
export function localDate(date = new Date()): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}
export function safeUrl(value: string): string | null {
  try {
    const u = new URL(value);
    return ['https:', 'http:'].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}
export function readyChecks(profile: Profile) {
  return [
    { label: 'Tu nombre', done: !!profile.personal.fullName.trim() },
    {
      label: 'Un teléfono o correo de contacto',
      done: !!(profile.personal.phone.trim() || profile.personal.email.trim()),
    },
    { label: 'El trabajo que buscas', done: !!profile.personal.headline.trim() },
    { label: 'Tu ciudad o comuna', done: !!profile.personal.city.trim() },
    {
      label: 'Algo que sabes hacer, estudiaste o trabajaste',
      done:
        profile.skills.some((s) => s.items.length > 0) ||
        profile.education.length > 0 ||
        profile.experience.length > 0,
    },
  ];
}
export function applicationMessage(a: Application, profile: Profile) {
  return (
    'Hola:\n\nMe interesa el trabajo de ' +
    a.role +
    (a.company ? ' en ' + a.company : '') +
    '. Adjunto mi currículum para su consideración.\n\n' +
    (profile.personal.summary ? profile.personal.summary + '\n\n' : '') +
    'Quedo disponible para conversar.\n\n' +
    profile.personal.fullName +
    '\n' +
    [profile.personal.phone, profile.personal.email].filter(Boolean).join(' · ')
  );
}
export function calendarFile(a: Application) {
  const escape = (s: string) =>
    s
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;')
      .replace(/\r/g, '');
  const date = a.nextStepDate.replace(/-/g, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Impulso//ES',
    'BEGIN:VEVENT',
    'UID:' + a.id + '@impulso.local',
    'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
    'DTSTART;VALUE=DATE:' + date,
    'SUMMARY:' + escape(a.nextStep || 'Revisar postulación'),
    'DESCRIPTION:' + escape(a.role + ' · ' + a.company),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
