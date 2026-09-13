import type { AppState, Profile } from '../../types';
import type { ParsedCv } from './parseCv';

export type ImportMode = 'reemplazar' | 'agregar';

export type SectionKey = 'personal' | 'experience' | 'education' | 'skills' | 'languages' | 'projects' | 'certifications';

export const SECTION_LABELS: Record<SectionKey, string> = {
  personal: 'Datos personales y resumen',
  experience: 'Experiencia',
  education: 'Formación',
  skills: 'Habilidades',
  languages: 'Idiomas',
  projects: 'Proyectos',
  certifications: 'Certificaciones',
};

/** Cuántos elementos trae cada sección de lo detectado. */
export function countOf(parsed: ParsedCv, key: SectionKey): number {
  if (key === 'personal') return Object.values(parsed.personal).filter((v) => String(v ?? '').trim()).length;
  return parsed[key].length;
}

/** Vuelca lo detectado sobre el perfil, reemplazando o sumando a lo que ya hay. */
export function applyParsed(
  state: AppState,
  parsed: ParsedCv,
  mode: ImportMode,
  include: Set<SectionKey>,
): AppState {
  const base: Profile = state.profile;
  const next: Profile = { ...base };

  if (include.has('personal')) {
    const detected = Object.fromEntries(
      Object.entries(parsed.personal).filter(([, v]) => String(v ?? '').trim()),
    );
    next.personal =
      mode === 'reemplazar'
        ? { ...base.personal, ...detected }
        : // Al agregar, lo que ya escribiste manda sobre lo detectado.
          { ...detected, ...Object.fromEntries(Object.entries(base.personal).filter(([, v]) => String(v).trim())) } as Profile['personal'];
  }

  if (include.has('experience') && parsed.experience.length) {
    next.experience = mode === 'reemplazar' ? parsed.experience : [...base.experience, ...parsed.experience];
  }
  if (include.has('education') && parsed.education.length) {
    next.education = mode === 'reemplazar' ? parsed.education : [...base.education, ...parsed.education];
  }
  if (include.has('skills') && parsed.skills.length) {
    next.skills = mode === 'reemplazar' ? parsed.skills : [...base.skills, ...parsed.skills];
  }
  if (include.has('languages') && parsed.languages.length) {
    next.languages = mode === 'reemplazar' ? parsed.languages : [...base.languages, ...parsed.languages];
  }
  if (include.has('projects') && parsed.projects.length) {
    next.projects = mode === 'reemplazar' ? parsed.projects : [...base.projects, ...parsed.projects];
  }
  if (include.has('certifications') && parsed.certifications.length) {
    next.certifications =
      mode === 'reemplazar' ? parsed.certifications : [...base.certifications, ...parsed.certifications];
  }

  return { ...state, profile: next };
}
