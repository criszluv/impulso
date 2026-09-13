/**
 * Lector heurístico de CV en texto plano. Sirve para un CV pegado desde Word,
 * extraído de un PDF o copiado de un perfil de LinkedIn.
 *
 * No adivina bien el 100% de los casos y no pretende hacerlo: la pantalla de
 * importación siempre muestra lo detectado para que la persona lo corrija
 * antes de guardarlo.
 */
import type {
  Certification,
  Education,
  Experience,
  LanguageItem,
  LanguageLevel,
  PersonalInfo,
  Project,
  SkillGroup,
} from '../../types';
import { normalize } from '../text';
import { uid } from '../utils';

export interface ParsedCv {
  personal: Partial<PersonalInfo>;
  experience: Experience[];
  education: Education[];
  skills: SkillGroup[];
  languages: LanguageItem[];
  projects: Project[];
  certifications: Certification[];
  notes: string[];
}

export function emptyParsed(): ParsedCv {
  return {
    personal: {},
    experience: [],
    education: [],
    skills: [],
    languages: [],
    projects: [],
    certifications: [],
    notes: [],
  };
}

const MONTHS: Record<string, number> = {
  ene: 1,
  enero: 1,
  jan: 1,
  january: 1,
  feb: 2,
  febrero: 2,
  february: 2,
  mar: 3,
  marzo: 3,
  march: 3,
  abr: 4,
  abril: 4,
  apr: 4,
  april: 4,
  may: 5,
  mayo: 5,
  jun: 6,
  junio: 6,
  june: 6,
  jul: 7,
  julio: 7,
  july: 7,
  ago: 8,
  agosto: 8,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  septiembre: 9,
  september: 9,
  oct: 10,
  octubre: 10,
  october: 10,
  nov: 11,
  noviembre: 11,
  november: 11,
  dic: 12,
  diciembre: 12,
  dec: 12,
  december: 12,
};

const PRESENT = /(actualidad|presente|actual|present|current|hoy|a la fecha)/i;
const MONTH_WORDS = Object.keys(MONTHS).join('|');
const DASH = '[-–—]|\\ba\\b|\\bhasta\\b|\\bto\\b';

/** "ene 2020", "enero de 2020", "01/2020", "2020" → "2020-01". */
export function toMonthValue(raw: string): string {
  const value = raw.trim().toLowerCase();
  const slash = value.match(/^(\d{1,2})[/.](\d{4})$/);
  if (slash) return `${slash[2]}-${String(Number(slash[1])).padStart(2, '0')}`;

  const named = normalize(value).match(new RegExp(`^(${MONTH_WORDS})\\.?\\s*(?:de\\s+)?(\\d{4})$`));
  if (named) return `${named[2]}-${String(MONTHS[named[1]]).padStart(2, '0')}`;

  const yearOnly = value.match(/^(\d{4})$/);
  if (yearOnly) return `${yearOnly[1]}-01`;

  return '';
}

const DATE_PART = `(?:(?:${MONTH_WORDS})\\.?\\s*(?:de\\s+)?\\d{4}|\\d{1,2}[/.]\\d{4}|\\d{4})`;
const RANGE_RE = new RegExp(
  `(${DATE_PART})\\s*(?:${DASH})\\s*(${DATE_PART}|actualidad|presente|actual|present|current|hoy)`,
  'i',
);

export interface DateRange {
  startDate: string;
  endDate: string;
  current: boolean;
  matched: string;
}

/** Busca un rango de fechas en una línea. */
export function findRange(line: string): DateRange | null {
  const flat = normalize(line);
  const m = flat.match(RANGE_RE);
  if (!m) return null;

  // La posición en el texto normalizado coincide con el original: normalize()
  // solo cambia mayúsculas y tildes, nunca la cantidad de caracteres.
  const matched = line.slice(m.index ?? 0, (m.index ?? 0) + m[0].length);
  const current = PRESENT.test(m[2]);
  return {
    startDate: toMonthValue(m[1]),
    endDate: current ? '' : toMonthValue(m[2]),
    current,
    matched,
  };
}

type SectionId =
  | 'resumen'
  | 'experiencia'
  | 'educacion'
  | 'habilidades'
  | 'idiomas'
  | 'proyectos'
  | 'certificaciones'
  | 'contacto'
  | 'otro';

const HEADINGS: Array<{ id: SectionId; words: string[] }> = [
  {
    id: 'resumen',
    words: [
      'perfil',
      'perfil profesional',
      'resumen',
      'resumen profesional',
      'extracto',
      'acerca de',
      'sobre mi',
      'objetivo',
      'summary',
      'about',
      'profile',
      'objective',
    ],
  },
  {
    id: 'experiencia',
    words: [
      'experiencia',
      'experiencia laboral',
      'experiencia profesional',
      'trayectoria',
      'trayectoria laboral',
      'historial laboral',
      'empleo',
      'work experience',
      'experience',
      'employment',
    ],
  },
  {
    id: 'educacion',
    words: [
      'educacion',
      'formacion',
      'formacion academica',
      'estudios',
      'antecedentes academicos',
      'education',
      'academic background',
    ],
  },
  {
    id: 'habilidades',
    words: [
      'habilidades',
      'competencias',
      'conocimientos',
      'aptitudes',
      'aptitudes principales',
      'skills',
      'technical skills',
      'competencies',
      'herramientas',
      'stack',
    ],
  },
  { id: 'idiomas', words: ['idiomas', 'languages'] },
  { id: 'proyectos', words: ['proyectos', 'projects', 'portafolio', 'portfolio'] },
  {
    id: 'certificaciones',
    words: [
      'certificaciones',
      'certificados',
      'cursos',
      'licencias y certificaciones',
      'capacitaciones',
      'certifications',
      'courses',
      'licenses',
    ],
  },
  { id: 'contacto', words: ['contacto', 'datos personales', 'datos de contacto', 'contact'] },
];

function headingFor(line: string): SectionId | null {
  const flat = normalize(line)
    .replace(/[:·|•\-–—_]+$/g, '')
    .replace(/^[:·|•\-–—_]+/g, '')
    .trim();
  if (!flat || flat.length > 42) return null;
  if (/\d{4}/.test(flat)) return null;
  for (const h of HEADINGS) {
    if (h.words.includes(flat)) return h.id;
  }
  return null;
}

const BULLET_RE = /^\s*([•▪‣◦·*•o]|[-–—]|\d{1,2}[.)])\s+/;

function isBullet(line: string): boolean {
  return BULLET_RE.test(line);
}

function stripBullet(line: string): string {
  return line.replace(BULLET_RE, '').trim();
}

/** Une líneas que son continuación visual de la anterior (corte de ancho). */
function joinWrapped(lines: string[]): string[] {
  const out: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const prev = out[out.length - 1];
    const continues =
      prev &&
      !isBullet(line) &&
      !/[.;:!?]$/.test(prev) &&
      prev.length > 40 &&
      /^[a-záéíóúñ(]/.test(line);
    if (continues) {
      out[out.length - 1] = `${prev} ${line}`;
    } else {
      out.push(line);
    }
  }
  return out;
}

const ROLE_WORDS = [
  'ingenier',
  'analista',
  'desarrollador',
  'desarrolladora',
  'programador',
  'jefe',
  'jefa',
  'gerente',
  'asistente',
  'auxiliar',
  'tecnico',
  'tecnica',
  'operario',
  'operaria',
  'docente',
  'profesor',
  'enfermer',
  'contador',
  'contadora',
  'disenador',
  'disenadora',
  'encargad',
  'supervisor',
  'coordinador',
  'coordinadora',
  'administrativo',
  'administrativa',
  'practicante',
  'ejecutivo',
  'ejecutiva',
  'secretari',
  'chofer',
  'conductor',
  'cajero',
  'cajera',
  'bodeguero',
  'mecanico',
  'electricista',
  'soldador',
  'garzon',
  'recepcionista',
  'vendedor',
  'vendedora',
  'consultor',
  'consultora',
  'especialista',
  'lider',
  'director',
  'directora',
  'abogad',
  'psicolog',
  'kinesiolog',
  'arquitect',
  'constructor',
  'prevencionista',
  'community',
  'manager',
  'engineer',
  'developer',
  'designer',
  'analyst',
  'intern',
  'trainee',
  'freelance',
];

const COMPANY_WORDS = [
  's.a',
  'spa',
  'ltda',
  'limitada',
  'e.i.r.l',
  'inc',
  'llc',
  'corp',
  'group',
  'grupo',
  'consultora',
  'agencia',
  'universidad',
  'instituto',
  'fundacion',
  'municipalidad',
  'banco',
  'clinica',
  'hospital',
  'colegio',
  'empresa',
];

const PLACE_WORDS = [
  'remoto',
  'hibrido',
  'presencial',
  'santiago',
  'osorno',
  'valparaiso',
  'concepcion',
  'temuco',
  'puerto montt',
  'antofagasta',
  'la serena',
  'rancagua',
  'talca',
  'iquique',
  'chile',
  'argentina',
  'peru',
  'colombia',
  'mexico',
  'espana',
];

function looksLikeRole(text: string): boolean {
  const flat = normalize(text);
  return ROLE_WORDS.some((w) => flat.includes(w));
}

function looksLikeCompany(text: string): boolean {
  const flat = normalize(text);
  return COMPANY_WORDS.some((w) => flat.includes(w));
}

function looksLikePlace(text: string): boolean {
  const flat = normalize(text);
  return PLACE_WORDS.some((w) => flat.includes(w));
}

/**
 * Los separadores fuertes (barra, punto medio, raya, doble espacio) siempre
 * dividen. La coma y « en » solo entran cuando no hubo ninguno fuerte, porque
 * parten títulos legítimos como «Ingeniería en Logística».
 */
const STRONG_SEP = /\s+[|·•—–]\s+|\s{2,}|\t+/;
const ANY_SEP = /\s+[|·•—–]\s+|\s{2,}|\t+|,\s+/;
const WEAK_SEP = /\s+(?:en|at)\s+|,\s+/;

/** Reparte las partes del encabezado de un cargo entre puesto, empresa y lugar. */
function splitRoleCompany(parts: string[]): { role: string; company: string; location: string } {
  const clean = parts.map((p) => p.trim()).filter(Boolean);
  let location = '';
  const rest: string[] = [];

  for (const part of clean) {
    if (!location && looksLikePlace(part) && part.length < 40 && !looksLikeRole(part)) {
      location = part;
    } else {
      rest.push(part);
    }
  }

  if (rest.length === 0) return { role: '', company: '', location };
  if (rest.length === 1) {
    return looksLikeCompany(rest[0])
      ? { role: '', company: rest[0], location }
      : { role: rest[0], company: '', location };
  }

  const roleIndex = rest.findIndex(looksLikeRole);
  const companyIndex = rest.findIndex(looksLikeCompany);

  if (roleIndex !== -1 && companyIndex !== -1 && roleIndex !== companyIndex) {
    return {
      role: rest[roleIndex],
      company: rest[companyIndex],
      location: location || rest.filter((_, i) => i !== roleIndex && i !== companyIndex).join(', '),
    };
  }
  if (companyIndex === 0 && rest.length > 1) {
    return { role: rest[1], company: rest[0], location: location || rest.slice(2).join(', ') };
  }
  return { role: rest[0], company: rest[1], location: location || rest.slice(2).join(', ') };
}

interface Block {
  range: DateRange;
  header: string[];
  body: string[];
}

/** Corta una sección en bloques, usando los rangos de fecha como ancla. */
function blocksByDate(lines: string[]): Block[] {
  const anchors: number[] = [];
  const ranges: DateRange[] = [];

  lines.forEach((line, i) => {
    const range = findRange(line);
    if (range) {
      anchors.push(i);
      ranges.push(range);
    }
  });
  if (!anchors.length) return [];

  const starts = anchors.map((anchor, n) => {
    let start = anchor;
    const floor = n === 0 ? 0 : anchors[n - 1] + 1;
    while (start - 1 >= floor && anchor - start < 2 && !isBullet(lines[start - 1])) start -= 1;
    return start;
  });

  return anchors.map((anchor, n) => {
    const start = starts[n];
    const end = n + 1 < starts.length ? starts[n + 1] - 1 : lines.length - 1;
    const header: string[] = [];
    for (let i = start; i <= anchor; i += 1) {
      const text = i === anchor ? lines[i].replace(ranges[n].matched, ' ') : lines[i];
      const trimmed = text.replace(/\(\s*\d+\s*(años?|meses?|yrs?|mos?)[^)]*\)/gi, ' ').trim();
      const cleaned = trimmed.replace(/^[|·•\-–—,\s]+|[|·•\-–—,\s]+$/g, '').trim();
      if (cleaned) header.push(cleaned);
    }
    return { range: ranges[n], header, body: lines.slice(anchor + 1, end + 1) };
  });
}

function headerParts(header: string[]): string[] {
  const strong = header
    .flatMap((line) => line.split(STRONG_SEP))
    .map((p) => p.trim())
    .filter(Boolean);
  if (strong.length > 1) return strong;
  return header
    .flatMap((line) => line.split(WEAK_SEP))
    .map((p) => p.trim())
    .filter(Boolean);
}

function toBullets(body: string[]): string[] {
  const marked = body.filter(isBullet);
  const source = marked.length ? marked : body;
  return source
    .map(stripBullet)
    .map((b) => b.trim())
    .filter((b) => b.length > 12);
}

const LEVEL_MAP: Array<{ re: RegExp; level: LanguageLevel }> = [
  { re: /(nativ|materna|bilingue|bilingüe|c2|native)/i, level: 'Nativo' },
  { re: /(avanzad|advanced|c1|fluent|fluido|profesional)/i, level: 'Avanzado' },
  { re: /(intermedi|intermediate|b1|b2|medio)/i, level: 'Intermedio' },
  { re: /(basic|básic|elemental|a1|a2|principiante)/i, level: 'Básico' },
];

function toLevel(text: string): LanguageLevel {
  for (const { re, level } of LEVEL_MAP) if (re.test(text)) return level;
  return 'Intermedio';
}

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]{2,}/;
const PHONE_RE = /(\+?\d[\d\s().-]{7,17}\d)/;
const LINKEDIN_RE = /(?:https?:\/\/)?(?:[\w.]+\.)?linkedin\.com\/in\/[\w%\-.]+/i;
const GITHUB_RE = /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+/i;
const URL_RE =
  /(?:https?:\/\/)?(?:www\.)?[\w-]+\.(?:com|cl|dev|io|net|org|me|app|co)(?:\/[\w%\-./]*)?/i;

function looksLikeName(line: string): boolean {
  const words = line.trim().split(/\s+/);
  if (words.length < 2 || words.length > 5) return false;
  if (line.length > 60) return false;
  if (/[@\d]/.test(line)) return false;
  if (headingFor(line)) return false;
  const capitalised = words.filter((w) => /^[A-ZÁÉÍÓÚÑ]/.test(w)).length;
  return capitalised >= Math.max(2, words.length - 1);
}

/** Lee un CV en texto plano y devuelve lo que pudo reconocer. */
export function parseCvText(input: string): ParsedCv {
  const result = emptyParsed();
  const rawLines = input.replace(/\r\n/g, '\n').split('\n');
  const lines = joinWrapped(rawLines);
  if (!lines.length) {
    result.notes.push('El texto venía vacío.');
    return result;
  }

  const whole = lines.join('\n');

  const email = whole.match(EMAIL_RE)?.[0];
  if (email) result.personal.email = email;

  const linkedin = whole.match(LINKEDIN_RE)?.[0];
  if (linkedin) result.personal.linkedin = linkedin.replace(/^https?:\/\//, '');

  const github = whole.match(GITHUB_RE)?.[0];
  if (github) result.personal.github = github.replace(/^https?:\/\//, '');

  const phoneLine = lines.find((l) => PHONE_RE.test(l) && !findRange(l));
  const phone = phoneLine?.match(PHONE_RE)?.[0];
  if (phone && phone.replace(/\D/g, '').length >= 8) result.personal.phone = phone.trim();

  // Sin los correos primero: si no, el «correo.cl» de una dirección pasa por sitio web.
  const withoutEmails = whole.replace(new RegExp(EMAIL_RE.source, 'gi'), ' ');
  const site = withoutEmails
    .match(new RegExp(URL_RE.source, 'gi'))
    ?.find((u) => !/linkedin|github/i.test(u));
  if (site) result.personal.website = site;

  // Cabecera: nombre y titular en las primeras líneas, antes de cualquier sección.
  const headEnd = lines.findIndex((l) => headingFor(l));
  const head = lines.slice(0, headEnd === -1 ? Math.min(8, lines.length) : headEnd);
  const nameIndex = head.findIndex(looksLikeName);
  if (nameIndex !== -1) {
    result.personal.fullName = head[nameIndex].trim();
    const after = head
      .slice(nameIndex + 1)
      .find(
        (l) =>
          l.length > 4 &&
          l.length < 90 &&
          !EMAIL_RE.test(l) &&
          !PHONE_RE.test(l) &&
          !URL_RE.test(l),
      );
    if (after) result.personal.headline = after.trim();
  } else {
    result.notes.push('No pude identificar el nombre; revísalo antes de guardar.');
  }

  // La ciudad suele ir dentro de la línea de contacto, junto al correo y el
  // teléfono, así que se busca por partes y no por el largo de la línea.
  const cityLine = head.find((l) => looksLikePlace(l) && !looksLikeName(l));
  if (cityLine) {
    const places = cityLine
      .split(ANY_SEP)
      .map((p) => p.trim())
      .filter((p) => p.length < 40 && looksLikePlace(p));
    if (places[0]) result.personal.city = places[0];
    if (places[1]) result.personal.country = places[1];
  }

  // Reparto del cuerpo en secciones.
  const sections = new Map<SectionId, string[]>();
  let current: SectionId = 'otro';
  for (let i = headEnd === -1 ? lines.length : headEnd; i < lines.length; i += 1) {
    const id = headingFor(lines[i]);
    if (id) {
      current = id;
      if (!sections.has(id)) sections.set(id, []);
      continue;
    }
    if (!sections.has(current)) sections.set(current, []);
    sections.get(current)!.push(lines[i]);
  }

  const resumen = sections.get('resumen');
  if (resumen?.length) {
    result.personal.summary = resumen.join(' ').replace(/\s+/g, ' ').trim();
  }

  for (const block of blocksByDate(sections.get('experiencia') ?? [])) {
    const { role, company, location } = splitRoleCompany(headerParts(block.header));
    result.experience.push({
      id: uid('exp'),
      role,
      company,
      location,
      startDate: block.range.startDate,
      endDate: block.range.endDate,
      current: block.range.current,
      bullets: toBullets(block.body),
      tech: [],
    } satisfies Experience);
  }

  for (const block of blocksByDate(sections.get('educacion') ?? [])) {
    const parts = headerParts(block.header);
    const institutionIndex = parts.findIndex(looksLikeCompany);
    const degree = parts.filter((_, i) => i !== institutionIndex)[0] ?? parts[0] ?? '';
    result.education.push({
      id: uid('edu'),
      degree,
      institution: institutionIndex !== -1 ? parts[institutionIndex] : (parts[1] ?? ''),
      location:
        parts.find((p, i) => i !== institutionIndex && p !== degree && looksLikePlace(p)) ?? '',
      startDate: block.range.startDate,
      endDate: block.range.endDate,
      current: block.range.current,
      detail: toBullets(block.body).join(' '),
    } satisfies Education);
  }

  const skillLines = sections.get('habilidades') ?? [];
  const grouped: SkillGroup[] = [];
  const loose: string[] = [];
  for (const line of skillLines) {
    const text = stripBullet(line);
    const withLabel = text.match(/^([^:]{3,32}):\s*(.+)$/);
    if (withLabel) {
      grouped.push({ id: uid('sk'), name: withLabel[1].trim(), items: splitSkills(withLabel[2]) });
    } else {
      loose.push(...splitSkills(text));
    }
  }
  if (loose.length)
    grouped.unshift({ id: uid('sk'), name: 'Habilidades', items: [...new Set(loose)] });
  result.skills = grouped.filter((g) => g.items.length);

  for (const line of sections.get('idiomas') ?? []) {
    const text = stripBullet(line);
    if (!text) continue;
    for (const chunk of text.split(/[;|]|,(?=\s*[A-ZÁÉÍÓÚÑ])/)) {
      const piece = chunk.trim();
      if (!piece) continue;
      const [namePart] = piece.split(/[:\-–—(]/);
      const name = namePart.trim();
      if (!name || name.length > 24) continue;
      result.languages.push({ id: uid('lang'), name, level: toLevel(piece) });
    }
  }

  for (const line of sections.get('certificaciones') ?? []) {
    const text = stripBullet(line);
    if (text.length < 4) continue;
    const range = findRange(text);
    const year = text.match(/\b(20\d{2}|19\d{2})\b/);
    const parts = text
      .replace(range?.matched ?? '', '')
      .split(ANY_SEP)
      .map((p) => p.trim())
      .filter(Boolean);
    result.certifications.push({
      id: uid('cert'),
      name: parts[0] ?? text,
      issuer: parts[1] ?? '',
      date: range?.startDate || (year ? `${year[1]}-01` : ''),
      url: '',
    } satisfies Certification);
  }

  for (const line of sections.get('proyectos') ?? []) {
    const text = stripBullet(line);
    if (text.length < 8) continue;
    const [name, ...rest] = text.split(/[:—–]|\s-\s/);
    result.projects.push({
      id: uid('prj'),
      name: name.trim(),
      url: text.match(URL_RE)?.[0] ?? '',
      description: rest.join(' ').trim(),
      tech: [],
    } satisfies Project);
  }

  if (!result.experience.length && (sections.get('experiencia')?.length ?? 0) > 0) {
    result.notes.push(
      'Encontré la sección de experiencia pero no reconocí las fechas. Tendrás que cargar los cargos a mano.',
    );
  }
  if (!sections.size) {
    result.notes.push(
      'No reconocí encabezados de sección (Experiencia, Educación, Habilidades). Si tu CV los tiene con otro nombre, renómbralos y vuelve a intentar.',
    );
  }

  return result;
}

function splitSkills(text: string): string[] {
  return text
    .split(/[,;|•·]|\s{2,}|\s+\/\s+/)
    .map((s) => s.trim().replace(/\.$/, ''))
    .filter((s) => s.length > 1 && s.length < 40);
}
