/**
 * Importador de la exportación oficial de datos de LinkedIn.
 *
 * En LinkedIn: Configuración → Privacidad de los datos → Obtener una copia de
 * tus datos. Llega un ZIP con un CSV por sección. Es la vía más fiel que hay,
 * porque son los datos tal como los tiene LinkedIn, no un texto adivinado.
 */
import type { Certification, Education, Experience, LanguageItem, Project, SkillGroup } from '../../types';
import { uid } from '../utils';
import { parseCsv } from './files';
import { emptyParsed, toMonthValue } from './parseCv';
import type { ParsedCv } from './parseCv';

/** Los nombres de archivo cambian según el idioma de la cuenta. */
const FILES: Record<string, string[]> = {
  profile: ['profile.csv', 'perfil.csv'],
  positions: ['positions.csv', 'puestos.csv', 'experiencia.csv'],
  education: ['education.csv', 'educacion.csv', 'educación.csv'],
  skills: ['skills.csv', 'aptitudes.csv', 'habilidades.csv'],
  languages: ['languages.csv', 'idiomas.csv'],
  projects: ['projects.csv', 'proyectos.csv'],
  certifications: ['certifications.csv', 'certificaciones.csv'],
  emails: ['email addresses.csv', 'emails.csv'],
  phones: ['phonenumbers.csv', 'phone numbers.csv', 'telefonos.csv'],
};

function pick(csvs: Record<string, string>, group: string): Array<Record<string, string>> {
  for (const name of FILES[group] ?? []) {
    const raw = csvs[name];
    if (raw) return parseCsv(raw);
  }
  return [];
}

/** Lee un campo probando varios nombres de columna (inglés y español). */
function field(row: Record<string, string>, ...names: string[]): string {
  for (const name of names) {
    const hit = Object.keys(row).find((k) => k.toLowerCase() === name.toLowerCase());
    if (hit && row[hit]) return row[hit].trim();
  }
  return '';
}

function bulletsFrom(description: string): string[] {
  if (!description.trim()) return [];
  return description
    .split(/\n+/)
    .map((line) => line.replace(/^\s*[•▪‣◦·*\-–—]\s*/, '').trim())
    .filter((line) => line.length > 12);
}

export function parseLinkedInCsvs(csvs: Record<string, string>): ParsedCv {
  const result = emptyParsed();
  const found: string[] = [];

  const profile = pick(csvs, 'profile')[0];
  if (profile) {
    found.push('perfil');
    const first = field(profile, 'First Name', 'Nombre');
    const last = field(profile, 'Last Name', 'Apellido', 'Apellidos');
    const name = [first, last].filter(Boolean).join(' ');
    if (name) result.personal.fullName = name;
    const headline = field(profile, 'Headline', 'Titular');
    if (headline) result.personal.headline = headline;
    const summary = field(profile, 'Summary', 'Extracto', 'Acerca de');
    if (summary) result.personal.summary = summary.replace(/\s*\n\s*/g, ' ').trim();
    const geo = field(profile, 'Geo Location', 'Ubicación', 'Ubicacion', 'Location');
    if (geo) {
      const [city, ...rest] = geo.split(',');
      result.personal.city = city.trim();
      if (rest.length) result.personal.country = rest[rest.length - 1].trim();
    }
    const sites = field(profile, 'Websites', 'Sitios web');
    const url = sites.match(/https?:\/\/[^\s,\]]+/)?.[0];
    if (url) result.personal.website = url.replace(/^https?:\/\//, '');
  }

  const email = pick(csvs, 'emails').find((r) => field(r, 'Primary', 'Principal').toLowerCase() === 'yes')
    ?? pick(csvs, 'emails')[0];
  if (email) {
    const value = field(email, 'Email Address', 'Correo', 'Dirección de correo electrónico');
    if (value) result.personal.email = value;
  }

  const phone = pick(csvs, 'phones')[0];
  if (phone) {
    const value = field(phone, 'Number', 'Número', 'Numero', 'Teléfono');
    if (value) result.personal.phone = value;
  }

  const positions = pick(csvs, 'positions');
  if (positions.length) found.push(`${positions.length} cargos`);
  for (const row of positions) {
    const finished = field(row, 'Finished On', 'Fecha de finalización', 'Hasta');
    result.experience.push({
      id: uid('exp'),
      role: field(row, 'Title', 'Cargo', 'Puesto'),
      company: field(row, 'Company Name', 'Empresa', 'Nombre de la empresa'),
      location: field(row, 'Location', 'Ubicación', 'Ubicacion'),
      startDate: toMonthValue(field(row, 'Started On', 'Fecha de inicio', 'Desde')),
      endDate: toMonthValue(finished),
      current: !finished,
      bullets: bulletsFrom(field(row, 'Description', 'Descripción', 'Descripcion')),
      tech: [],
    } satisfies Experience);
  }
  result.experience.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));

  const education = pick(csvs, 'education');
  if (education.length) found.push(`${education.length} estudios`);
  for (const row of education) {
    const end = field(row, 'End Date', 'Fecha de finalización', 'Hasta');
    result.education.push({
      id: uid('edu'),
      degree: field(row, 'Degree Name', 'Título', 'Titulo', 'Degree'),
      institution: field(row, 'School Name', 'Institución', 'Institucion', 'Centro educativo'),
      location: '',
      startDate: toMonthValue(field(row, 'Start Date', 'Fecha de inicio', 'Desde')),
      endDate: toMonthValue(end),
      current: !end,
      detail: field(row, 'Notes', 'Notas', 'Activities', 'Actividades'),
    } satisfies Education);
  }

  const skills = pick(csvs, 'skills')
    .map((row) => field(row, 'Name', 'Nombre', 'Aptitud'))
    .filter(Boolean);
  if (skills.length) {
    found.push(`${skills.length} aptitudes`);
    result.skills.push({ id: uid('sk'), name: 'Habilidades', items: [...new Set(skills)] } satisfies SkillGroup);
  }

  for (const row of pick(csvs, 'languages')) {
    const name = field(row, 'Name', 'Nombre', 'Idioma');
    if (!name) continue;
    const proficiency = field(row, 'Proficiency', 'Nivel', 'Competencia').toLowerCase();
    const level: LanguageItem['level'] = /(native|nativ|bilingual|bilingüe)/.test(proficiency)
      ? 'Nativo'
      : /(full_professional|professional|profesional|avanzad)/.test(proficiency)
        ? 'Avanzado'
        : /(limited|intermedi)/.test(proficiency)
          ? 'Intermedio'
          : 'Básico';
    result.languages.push({ id: uid('lang'), name, level });
  }

  for (const row of pick(csvs, 'projects')) {
    const name = field(row, 'Title', 'Título', 'Titulo', 'Nombre');
    if (!name) continue;
    result.projects.push({
      id: uid('prj'),
      name,
      url: field(row, 'Url', 'URL', 'Enlace').replace(/^https?:\/\//, ''),
      description: field(row, 'Description', 'Descripción', 'Descripcion').replace(/\s*\n\s*/g, ' ').trim(),
      tech: [],
    } satisfies Project);
  }

  for (const row of pick(csvs, 'certifications')) {
    const name = field(row, 'Name', 'Nombre');
    if (!name) continue;
    result.certifications.push({
      id: uid('cert'),
      name,
      issuer: field(row, 'Authority', 'Entidad emisora', 'Emisor'),
      date: toMonthValue(field(row, 'Started On', 'Fecha de inicio', 'Desde')),
      url: field(row, 'Url', 'URL').replace(/^https?:\/\//, ''),
    } satisfies Certification);
  }

  if (!found.length) {
    result.notes.push(
      'El ZIP no traía los CSV esperados. Asegúrate de pedir la copia completa de tus datos, no solo las publicaciones.',
    );
  } else {
    result.notes.push(`Leído desde LinkedIn: ${found.join(', ')}.`);
    if (!result.experience.some((e) => e.bullets.length)) {
      result.notes.push(
        'LinkedIn no guarda descripciones para todos los cargos. Los que llegaron vacíos hay que escribirlos.',
      );
    }
  }

  return result;
}
