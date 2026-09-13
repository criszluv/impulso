import { z } from 'zod';
import { initialState } from './defaults';
import type { AppState } from '../types';

export const STORAGE_KEY = 'impulso.state.v1';
export const RECOVERY_KEY = 'impulso.recovery.v1';
const text = z.string().default('');
const experience = z.object({
  id: z.string(),
  role: text,
  company: text,
  location: text,
  startDate: text,
  endDate: text,
  current: z.boolean().default(false),
  bullets: z.array(z.string()).default([]),
  tech: z.array(z.string()).default([]),
});
const education = z.object({
  id: z.string(),
  degree: text,
  institution: text,
  location: text,
  startDate: text,
  endDate: text,
  current: z.boolean().default(false),
  detail: text,
});
const schema = z.object({
  version: z.literal(1).default(1),
  profile: z.object({
    personal: z.object({
      fullName: text,
      headline: text,
      email: text,
      phone: text,
      city: text,
      country: z.string().default('Chile'),
      linkedin: text,
      github: text,
      website: text,
      summary: text,
      photo: text,
    }),
    experience: z.array(experience).default([]),
    education: z.array(education).default([]),
    skills: z
      .array(z.object({ id: z.string(), name: text, items: z.array(z.string()) }))
      .default([]),
    languages: z
      .array(
        z.object({
          id: z.string(),
          name: text,
          level: z.enum(['Básico', 'Intermedio', 'Avanzado', 'Nativo']),
        }),
      )
      .default([]),
    projects: z
      .array(
        z.object({
          id: z.string(),
          name: text,
          url: text,
          description: text,
          tech: z.array(z.string()).default([]),
        }),
      )
      .default([]),
    certifications: z
      .array(z.object({ id: z.string(), name: text, issuer: text, date: text, url: text }))
      .default([]),
  }),
  applications: z
    .array(
      z.object({
        id: z.string(),
        company: text,
        role: text,
        location: text,
        url: text,
        source: text,
        salary: text,
        status: z.enum(['guardada', 'postulada', 'entrevista', 'oferta', 'rechazada']),
        appliedAt: text,
        nextStep: text,
        nextStepDate: text,
        contact: text,
        notes: text,
        jobDescription: text,
        createdAt: text,
        updatedAt: text,
      }),
    )
    .default([]),
  cv: z
    .object({
      template: z.enum(['ats', 'clasico', 'compacto', 'moderno']).default('ats'),
      font: z.enum(['calibri', 'arial', 'georgia', 'times']).default('arial'),
      accent: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .default('#087f5b'),
      fontScale: z.number().min(0.7).max(1.5).default(1),
      showPhoto: z.boolean().default(false),
      showSummary: z.boolean().default(true),
      showProjects: z.boolean().default(true),
      showCertifications: z.boolean().default(true),
      showLanguages: z.boolean().default(true),
      targetJobId: z.string().nullable().default(null),
    })
    .default(initialState.cv),
  letters: z
    .array(
      z.object({
        motivation: text,
        tone: z.enum(['directo', 'formal', 'cercano', 'breve']).default('directo'),
        id: z.string(),
        title: text,
        company: text,
        role: text,
        recipient: text,
        body: text,
        jobDescription: text,
        applicationId: z.string().nullable().default(null),
        createdAt: text,
        updatedAt: text,
      }),
    )
    .default([]),
  answers: z
    .array(
      z.object({
        id: z.string(),
        question: text,
        situation: text,
        task: text,
        action: text,
        result: text,
      }),
    )
    .default([]),
  theme: z.enum(['dark', 'light']).default('light'),
  preferences: z
    .object({
      country: text,
      role: text,
      city: text,
      travel: text,
      schedule: text,
      experience: z.enum(['si', 'no', '']).default(''),
      step: z.number().int().min(0).max(5).default(0),
      completed: z.boolean().default(false),
    })
    .default({
      country: '',
      role: '',
      city: '',
      travel: '',
      schedule: '',
      experience: '',
      step: 0,
      completed: false,
    }),
});
export function parseBackup(raw: string): AppState {
  return schema.parse(JSON.parse(raw));
}
export function loadState(): { state: AppState; error: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return { state: raw ? parseBackup(raw) : structuredClone(initialState), error: '' };
  } catch {
    return {
      state: structuredClone(initialState),
      error:
        'No pudimos abrir tus datos guardados. La copia original sigue en este navegador. Puedes recuperarla en Ayuda y mis datos.',
    };
  }
}
export function persistState(state: AppState): string {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return '';
  } catch {
    return 'No se pudieron guardar los cambios en este navegador. Descarga una copia antes de cerrar esta página.';
  }
}
export function checkpoint(state: AppState) {
  try {
    localStorage.setItem(RECOVERY_KEY, JSON.stringify(state));
  } catch {
    /* The main save error is reported by the provider. */
  }
}
