/**
 * Normalización defensiva de lo que devuelve un modelo.
 *
 * Existe porque los modelos pequeños que corren en local cumplen el esquema
 * "casi siempre": mandan un número donde va texto, omiten un campo opcional o
 * escriben «enero 2020» donde se pidió 2020-01. Validar y rechazar sería
 * correcto y también inútil; es mejor arreglar lo arreglable y seguir.
 */
import type {
  Certification,
  Education,
  Experience,
  LanguageItem,
  LanguageLevel,
  Project,
  SkillGroup,
} from '../../types';
import { uid } from '../utils';
import { emptyParsed, toMonthValue } from '../import/parseCv';
import type { ParsedCv } from '../import/parseCv';
import type { ParsedJob } from '../import/parseJob';
import type { BulletRewrite, LetterDraft } from './types';

type Raw = Record<string, unknown>;

function asObject(value: unknown): Raw {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Raw) : {};
}

function str(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function bool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return /^(true|si|sí|yes|1)$/i.test(value.trim());
  return false;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function strings(value: unknown): string[] {
  return list(value).map(str).filter(Boolean);
}

/**
 * Las fechas vuelven en cualquier formato pese a lo que diga el esquema, así
 * que pasan por el mismo normalizador que usa el lector sin IA.
 */
function month(value: unknown): string {
  const raw = str(value);
  if (!raw || /^\d{4}$/.test(raw)) return '';
  if (/^\d{4}-\d{2}$/.test(raw)) return raw;
  const normalized = toMonthValue(raw);
  if (normalized) return normalized;
  return ''; // Do not invent January when only a year was provided.
}

const LEVELS: LanguageLevel[] = ['Básico', 'Intermedio', 'Avanzado', 'Nativo'];

function level(value: unknown): LanguageLevel {
  const raw = str(value).toLowerCase();
  const exact = LEVELS.find((l) => l.toLowerCase() === raw);
  if (exact) return exact;
  if (/nativ|bilin|materna/.test(raw)) return 'Nativo';
  if (/avanz|advanc|c1|c2|fluid/.test(raw)) return 'Avanzado';
  if (/bas|elem|princip|a1|a2/.test(raw)) return 'Básico';
  return 'Intermedio';
}

export function coerceCv(raw: unknown): ParsedCv {
  const data = asObject(raw);
  const result = emptyParsed();

  result.personal = {
    fullName: str(data.fullName),
    headline: str(data.headline),
    email: str(data.email),
    phone: str(data.phone),
    city: str(data.city),
    country: str(data.country),
    linkedin: str(data.linkedin).replace(/^https?:\/\//, ''),
    github: str(data.github).replace(/^https?:\/\//, ''),
    website: str(data.website).replace(/^https?:\/\//, ''),
    summary: str(data.summary),
  };

  result.experience = list(data.experience).map((item) => {
    const e = asObject(item);
    const endDate = month(e.endDate);
    return {
      id: uid('exp'),
      role: str(e.role),
      company: str(e.company),
      location: str(e.location),
      startDate: month(e.startDate),
      endDate,
      // A missing end date does not mean the person still has this job.
      current: bool(e.current),
      bullets: strings(e.bullets),
      tech: strings(e.tech),
    } satisfies Experience;
  });

  result.education = list(data.education).map((item) => {
    const e = asObject(item);
    return {
      id: uid('edu'),
      degree: str(e.degree),
      institution: str(e.institution),
      location: str(e.location),
      startDate: month(e.startDate),
      endDate: month(e.endDate),
      current: bool(e.current),
      detail: str(e.detail),
    } satisfies Education;
  });

  result.skills = list(data.skillGroups)
    .map((item) => {
      const g = asObject(item);
      return {
        id: uid('sk'),
        name: str(g.name) || 'Habilidades',
        items: strings(g.items),
      } satisfies SkillGroup;
    })
    .filter((g) => g.items.length);

  result.languages = list(data.languages)
    .map((item) => {
      const l = asObject(item);
      return { id: uid('lang'), name: str(l.name), level: level(l.level) } satisfies LanguageItem;
    })
    .filter((l) => l.name);

  result.projects = list(data.projects)
    .map((item) => {
      const p = asObject(item);
      return {
        id: uid('prj'),
        name: str(p.name),
        url: str(p.url).replace(/^https?:\/\//, ''),
        description: str(p.description),
        tech: strings(p.tech),
      } satisfies Project;
    })
    .filter((p) => p.name);

  result.certifications = list(data.certifications)
    .map((item) => {
      const c = asObject(item);
      return {
        id: uid('cert'),
        name: str(c.name),
        issuer: str(c.issuer),
        date: month(c.date),
        url: str(c.url).replace(/^https?:\/\//, ''),
      } satisfies Certification;
    })
    .filter((c) => c.name);

  result.notes = strings(data.warnings);
  return result;
}

export function coerceJob(raw: unknown): ParsedJob & { contact: string } {
  const data = asObject(raw);
  // Los campos van en español en el esquema; se acepta el nombre en inglés por
  // si el modelo decide traducirlos.
  const contact = str(data.contacto ?? data.contact);
  return {
    role: str(data.cargo ?? data.role),
    company: str(data.empresa ?? data.company),
    location: str(data.ubicacion ?? data.location),
    salary: str(data.sueldo ?? data.salary),
    // Algunos modelos ponen ahí la dirección del propio aviso, que no es un contacto.
    contact: /^https?:\/\//i.test(contact) ? '' : contact,
    source: '',
    /*
     * Tope deliberado. Un modelo chico entiende «avisos» como «cuéntame el
     * aviso» y devuelve la publicación entera troceada: se vio pasar con 40
     * entradas. Los avisos útiles son cortos y son pocos.
     */
    notes: strings(data.observaciones ?? data.notes)
      .filter((n) => n.length <= 160)
      .slice(0, 3),
  };
}

export function coerceRewrite(raw: unknown): BulletRewrite {
  const data = asObject(raw);
  const options = list(data.options)
    .map((item) => {
      const o = asObject(item);
      return { text: str(o.text), note: str(o.note) };
    })
    .filter((o) => o.text);
  return { options, missing: strings(data.missing) };
}

export function coerceLetter(raw: unknown): LetterDraft {
  const data = asObject(raw);
  return { body: str(data.body), gaps: strings(data.gaps) };
}
