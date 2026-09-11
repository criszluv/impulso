import type { Profile } from '../types';
import { extractKeywords, normalize, textHasTerm, tokenize } from './text';
import { monthsBetween } from './utils';

export type IssueLevel = 'error' | 'warn' | 'tip' | 'ok';

export interface Issue {
  level: IssueLevel;
  message: string;
  hint?: string;
}

/** Arranques que suenan a descripción de cargo en vez de logro. */
const WEAK_OPENERS: Array<{ re: RegExp; label: string; fix: string }> = [
  {
    re: /^(fui\s+)?(el\s+|la\s+)?(encargad[oa]|responsable)\s+de/i,
    label: 'encargado de…',
    fix: 'Parte con el verbo de la acción: «Gestioné…», «Coordiné…», «Lideré…».',
  },
  {
    re: /^(mis\s+)?(funciones|tareas|labores)/i,
    label: 'mis funciones eran…',
    fix: 'Un CV no lista funciones, lista resultados. Escribe qué lograste con esa tarea.',
  },
  {
    re: /^particip(e|é)\s+en/i,
    label: 'participé en…',
    fix: 'Di qué hiciste tú exactamente: «Desarrollé el módulo de…», «Diseñé el flujo de…».',
  },
  {
    re: /^(ayud(e|é)|colabor(e|é)|apoy(e|é))\s+(a|en|con)/i,
    label: 'ayudé a…',
    fix: 'Suena secundario. Nombra tu aporte concreto: «Implementé…», «Resolví…».',
  },
  {
    re: /^trabaj(e|é)\s+(en|con)/i,
    label: 'trabajé en…',
    fix: 'Todos trabajaron en algo. Di qué construiste o mejoraste.',
  },
  {
    re: /^(tuve\s+la\s+oportunidad|me\s+toc(o|ó))/i,
    label: 'tuve la oportunidad de…',
    fix: 'Quita el rodeo y deja solo la acción.',
  },
  {
    re: /^(realic(e|é)|hice)\s+(tareas|labores|actividades)/i,
    label: 'realicé tareas de…',
    fix: 'Reemplázalo por el verbo específico de la tarea.',
  },
];

/** Relleno que ocupa espacio sin decir nada. */
const FILLER = [
  'proactivo',
  'proactiva',
  'dinamico',
  'dinamica',
  'autodidacta',
  'buen manejo de',
  'excelente manejo',
  'ganas de aprender',
  'orientado a resultados',
  'don de gentes',
  'trabajo bajo presion',
  'responsable y puntual',
  'altamente motivado',
];

export const ACTION_VERBS: Record<string, string[]> = {
  Liderazgo: ['Lideré', 'Coordiné', 'Dirigí', 'Supervisé', 'Mentoricé', 'Formé', 'Delegué', 'Alineé'],
  Creación: ['Diseñé', 'Desarrollé', 'Construí', 'Implementé', 'Lancé', 'Creé', 'Prototipé', 'Definí'],
  Mejora: ['Optimicé', 'Reduje', 'Automaticé', 'Simplifiqué', 'Migré', 'Rediseñé', 'Escalé', 'Estandaricé'],
  Resultados: ['Aumenté', 'Dupliqué', 'Recuperé', 'Generé', 'Superé', 'Ahorré', 'Aceleré', 'Consolidé'],
  Análisis: ['Analicé', 'Diagnostiqué', 'Investigué', 'Modelé', 'Audité', 'Proyecté', 'Segmenté', 'Evalué'],
  Gestión: ['Gestioné', 'Planifiqué', 'Ejecuté', 'Negocié', 'Presupuesté', 'Prioricé', 'Controlé', 'Documenté'],
  Personas: ['Atendí', 'Capacité', 'Asesoré', 'Resolví', 'Fidelicé', 'Comuniqué', 'Facilité', 'Presenté'],
};

const VERB_SET = new Set(Object.values(ACTION_VERBS).flat().map((v) => normalize(v)));

function hasMetric(text: string): boolean {
  if (/\d/.test(text)) return true;
  return /(dupliqu|tripliqu|mayoría|totalidad)/i.test(text);
}

/** Revisa un logro del CV y devuelve observaciones accionables. */
export function reviewBullet(text: string): Issue[] {
  const value = text.trim();
  const issues: Issue[] = [];
  if (!value) return issues;

  for (const weak of WEAK_OPENERS) {
    if (weak.re.test(value)) {
      issues.push({ level: 'warn', message: `Empieza con «${weak.label}»`, hint: weak.fix });
      break;
    }
  }

  const firstWord = value.split(/\s+/)[0] ?? '';
  if (!VERB_SET.has(normalize(firstWord)) && !/(e|i|é|í)$/.test(firstWord)) {
    issues.push({
      level: 'tip',
      message: 'No arranca con un verbo de acción',
      hint: 'Los logros se leen mejor en pasado: «Reduje», «Diseñé», «Coordiné».',
    });
  }

  if (!hasMetric(value)) {
    issues.push({
      level: 'warn',
      message: 'Sin cifras',
      hint: 'Agrega cuánto, en cuánto tiempo o para cuántas personas. Si no tienes el dato exacto, usa un rango honesto.',
    });
  }

  if (value.length < 45) {
    issues.push({
      level: 'tip',
      message: 'Muy corto',
      hint: 'Falta contexto o resultado. Apunta a 90–200 caracteres.',
    });
  } else if (value.length > 260) {
    issues.push({
      level: 'warn',
      message: 'Muy largo',
      hint: 'Divídelo en dos logros o recorta el contexto: nadie lee párrafos en un CV.',
    });
  }

  if (/\byo\b/i.test(value)) {
    issues.push({ level: 'tip', message: 'Dice «yo»', hint: 'En un CV el sujeto se da por hecho. Bórralo.' });
  }

  const flat = normalize(value);
  const foundFiller = FILLER.filter((f) => flat.includes(f));
  if (foundFiller.length) {
    issues.push({
      level: 'tip',
      message: `Frase de relleno: «${foundFiller[0]}»`,
      hint: 'Cámbiala por un hecho comprobable que demuestre esa cualidad.',
    });
  }

  if (issues.length === 0) {
    issues.push({ level: 'ok', message: 'Buen logro: verbo de acción, contexto y cifra.' });
  }
  return issues;
}

/** Revisa el resumen profesional (3–5 líneas, con foco y cifra). */
export function reviewSummary(text: string): Issue[] {
  const value = text.trim();
  if (!value) {
    return [
      {
        level: 'error',
        message: 'Falta el resumen profesional',
        hint: 'Son las tres líneas que más se leen de todo el CV.',
      },
    ];
  }

  const issues: Issue[] = [];
  const words = value.split(/\s+/).length;
  if (words < 25) {
    issues.push({
      level: 'warn',
      message: 'Demasiado breve',
      hint: 'Apunta a 40–70 palabras: quién eres, cuánta experiencia, un logro y qué buscas.',
    });
  }
  if (words > 110) {
    issues.push({
      level: 'warn',
      message: 'Demasiado largo',
      hint: 'Recorta a 70 palabras; lo demás va en la experiencia.',
    });
  }
  if (!hasMetric(value)) {
    issues.push({
      level: 'warn',
      message: 'Sin ningún dato concreto',
      hint: 'Incluye años de experiencia o el resultado del que estés más orgulloso.',
    });
  }

  const flat = normalize(value);
  const foundFiller = FILLER.filter((f) => flat.includes(f));
  if (foundFiller.length) {
    issues.push({
      level: 'tip',
      message: `Contiene «${foundFiller[0]}»`,
      hint: 'Los adjetivos genéricos no diferencian a nadie. Sustituye por evidencia.',
    });
  }
  if (!/\b(busco|quiero|me interesa)\b/i.test(value)) {
    issues.push({
      level: 'tip',
      message: 'No dice qué buscas',
      hint: 'Cierra con una frase sobre el tipo de rol o equipo que te interesa.',
    });
  }
  if (issues.length === 0) {
    issues.push({ level: 'ok', message: 'Resumen sólido: concreto, medido y con dirección.' });
  }
  return issues;
}

export interface CompletenessItem {
  label: string;
  done: boolean;
  weight: number;
  hint: string;
}

export interface Completeness {
  score: number;
  items: CompletenessItem[];
}

export function profileCompleteness(profile: Profile): Completeness {
  const p = profile.personal;
  const bulletCount = profile.experience.reduce((n, e) => n + e.bullets.filter(Boolean).length, 0);
  const withMetrics = profile.experience
    .flatMap((e) => e.bullets)
    .filter((b) => b.trim() && hasMetric(b)).length;

  const items: CompletenessItem[] = [
    {
      label: 'Nombre y titular profesional',
      done: Boolean(p.fullName && p.headline),
      weight: 10,
      hint: 'El titular es tu cargo objetivo, no necesariamente el actual.',
    },
    {
      label: 'Contacto (correo y teléfono)',
      done: Boolean(p.email && p.phone),
      weight: 10,
      hint: 'Usa un correo con tu nombre, no un apodo.',
    },
    { label: 'Ciudad', done: Boolean(p.city), weight: 5, hint: 'Muchos filtros de reclutamiento ordenan por ubicación.' },
    {
      label: 'Resumen profesional',
      done: p.summary.trim().length > 80,
      weight: 15,
      hint: 'Tres a cinco líneas que resumen tu propuesta.',
    },
    {
      label: 'Al menos una experiencia',
      done: profile.experience.length > 0,
      weight: 15,
      hint: 'Prácticas, voluntariados y proyectos propios cuentan.',
    },
    { label: 'Tres o más logros escritos', done: bulletCount >= 3, weight: 10, hint: 'Dos o tres logros por cargo bastan.' },
    {
      label: 'Logros con cifras',
      done: withMetrics >= 2,
      weight: 10,
      hint: 'Los números son lo que distingue un CV del resto.',
    },
    {
      label: 'Formación',
      done: profile.education.length > 0,
      weight: 8,
      hint: 'Incluye cursos relevantes si no tienes título.',
    },
    {
      label: 'Habilidades agrupadas',
      done: profile.skills.some((s) => s.items.length > 0),
      weight: 8,
      hint: 'Sepáralas por categoría: los filtros automáticos las leen mejor.',
    },
    {
      label: 'Idiomas',
      done: profile.languages.length > 0,
      weight: 4,
      hint: 'Indica el nivel real, te lo van a probar.',
    },
    {
      label: 'LinkedIn o portafolio',
      done: Boolean(p.linkedin || p.website || p.github),
      weight: 5,
      hint: 'Un enlace ahorra media entrevista.',
    },
  ];

  const score = items.reduce((sum, i) => sum + (i.done ? i.weight : 0), 0);
  return { score, items };
}

/** Todo el texto del perfil en plano, para comparar contra una oferta. */
export function profileText(profile: Profile): string {
  const p = profile.personal;
  return [
    p.headline,
    p.summary,
    ...profile.experience.flatMap((e) => [e.role, e.company, ...e.bullets, ...e.tech]),
    ...profile.education.flatMap((e) => [e.degree, e.institution, e.detail]),
    ...profile.skills.flatMap((s) => [s.name, ...s.items]),
    ...profile.languages.map((l) => `${l.name} ${l.level}`),
    ...profile.projects.flatMap((pr) => [pr.name, pr.description, ...pr.tech]),
    ...profile.certifications.flatMap((c) => [c.name, c.issuer]),
  ]
    .filter(Boolean)
    .join(' \n ');
}

export interface JobMatch {
  score: number;
  matched: string[];
  missing: string[];
  total: number;
}

/** Compara una oferta con el perfil y dice qué palabras clave faltan. */
export function matchJob(jobDescription: string, profile: Profile): JobMatch {
  const keywords = extractKeywords(jobDescription, 28);
  if (keywords.length === 0) return { score: 0, matched: [], missing: [], total: 0 };

  const haystack = profileText(profile);
  const matched: string[] = [];
  const missing: string[] = [];
  let weightHit = 0;
  let weightAll = 0;

  for (const kw of keywords) {
    const weight = 1 + Math.min(kw.count - 1, 3) * 0.5;
    weightAll += weight;
    if (textHasTerm(haystack, kw.term)) {
      matched.push(kw.term);
      weightHit += weight;
    } else {
      missing.push(kw.term);
    }
  }

  return {
    score: Math.round((weightHit / weightAll) * 100),
    matched,
    missing,
    total: keywords.length,
  };
}

export interface CvStats {
  words: number;
  bullets: number;
  bulletsWithMetrics: number;
  repeatedVerbs: Array<{ verb: string; count: number }>;
  estimatedPages: number;
}

export function cvStats(profile: Profile): CvStats {
  const bullets = profile.experience.flatMap((e) => e.bullets).filter((b) => b.trim());
  const verbCounts = new Map<string, number>();
  for (const b of bullets) {
    const first = normalize(b.trim().split(/\s+/)[0] ?? '');
    if (first) verbCounts.set(first, (verbCounts.get(first) ?? 0) + 1);
  }
  const words = tokenize(profileText(profile)).length;
  return {
    words,
    bullets: bullets.length,
    bulletsWithMetrics: bullets.filter(hasMetric).length,
    repeatedVerbs: [...verbCounts.entries()]
      .filter(([, c]) => c > 1)
      .map(([verb, count]) => ({ verb, count }))
      .sort((a, b) => b.count - a.count),
    estimatedPages: Math.max(1, Math.ceil(words / 420)),
  };
}

/** Meses totales de experiencia (suma simple, sin descontar solapes). */
export function totalExperienceMonths(profile: Profile): number {
  return profile.experience.reduce(
    (sum, e) => sum + monthsBetween(e.startDate, e.current ? '' : e.endDate),
    0,
  );
}
