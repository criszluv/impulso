import type { AppState, Education, Experience } from '../types';
import { countryCode } from './jobs';
import { uid } from './utils';

export const newExperience = (): Experience => ({
  id: uid('exp'),
  role: '',
  company: '',
  location: '',
  startDate: '',
  endDate: '',
  current: false,
  bullets: [],
  tech: [],
});
export const newEducation = (): Education => ({
  id: uid('edu'),
  degree: '',
  institution: '',
  location: '',
  startDate: '',
  endDate: '',
  current: false,
  detail: '',
});
export const hasExperience = (e: Experience) =>
  [e.role, e.company, e.location, e.startDate, e.endDate, ...e.bullets, ...e.tech].some((v) =>
    v.trim(),
  ) || e.current;
export const hasEducation = (e: Education) =>
  [e.degree, e.institution, e.location, e.startDate, e.endDate, e.detail].some((v) => v.trim()) ||
  e.current;
export type GuidedError = { id: string; field: string; message: string };
export function historyError(records: Experience[] | Education[]): GuidedError | null {
  for (const [index, e] of records.entries()) {
    const work = 'role' in e,
      prefix = (work ? 'Experiencia ' : 'Estudio ') + (index + 1);
    if (!(work ? hasExperience(e) : hasEducation(e))) continue;
    if (!(work ? e.role : e.degree).trim())
      return {
        id: e.id,
        field: work ? 'role' : 'degree',
        message:
          prefix + ': escribe ' + (work ? 'el cargo o actividad.' : 'el título, estudio o curso.'),
      };
    for (const [key, label] of [
      ['startDate', 'inicio'],
      ['endDate', 'fin'],
    ] as const) {
      if (key === 'endDate' && e.current) continue;
      if (e[key] && !/^\d{4}-(0[1-9]|1[0-2])$/.test(e[key]))
        return {
          id: e.id,
          field: key,
          message:
            prefix +
            ': revisa el mes y el año de ' +
            label +
            '. Puedes dejar la fecha vacía si no la recuerdas.',
        };
    }
    if (!e.current && e.startDate && e.endDate && e.startDate > e.endDate)
      return {
        id: e.id,
        field: 'endDate',
        message: prefix + ': la fecha de fin no puede ser anterior al inicio.',
      };
  }
  return null;
}
export function newestFirst<T extends { startDate: string; endDate: string; current: boolean }>(
  records: T[],
): T[] {
  return [...records].sort(
    (a, b) =>
      Number(b.current) - Number(a.current) ||
      (b.endDate || b.startDate).localeCompare(a.endDate || a.startDate),
  );
}
/** Residence updates only follow through to a search that still uses the old residence. */
export function updateHomeLocation(
  s: AppState,
  patch: Partial<Pick<AppState['profile']['personal'], 'country' | 'city'>>,
): AppState {
  const home = s.profile.personal,
    next = { ...home, ...patch };
  const linkedCountry =
    !s.preferences.country || s.preferences.country === countryCode(home.country);
  const linkedCity = linkedCountry && (!s.preferences.city || s.preferences.city === home.city);
  return {
    ...s,
    profile: { ...s.profile, personal: next },
    preferences: {
      ...s.preferences,
      ...(linkedCountry ? { country: countryCode(next.country) } : {}),
      ...(linkedCity ? { city: next.city } : {}),
    },
  };
}
