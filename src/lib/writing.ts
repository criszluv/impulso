import type { Profile } from '../types';
import { textHasTerm } from './text';

/** Habilidades más nombradas, de todos los grupos y stacks. */
export function topSkills(profile: Profile, limit = 6): string[] {
  const seen = new Map<string, number>();
  const push = (value: string, weight: number) => {
    const key = value.trim();
    if (!key) return;
    seen.set(key, (seen.get(key) ?? 0) + weight);
  };
  profile.skills.forEach((g) => g.items.forEach((i) => push(i, 2)));
  profile.experience.forEach((e) => e.tech.forEach((t) => push(t, 3)));
  profile.projects.forEach((p) => p.tech.forEach((t) => push(t, 1)));
  return [...seen.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
}

/**
 * Habilidades tuyas que la oferta menciona, con la escritura original del
 * perfil (el comparador trabaja en minúsculas y sin tildes, y eso no se puede
 * pegar en una carta). Si la oferta no menciona ninguna, cae en las top.
 */
export function relevantSkills(profile: Profile, jobDescription: string, limit = 4): string[] {
  if (!jobDescription.trim()) return topSkills(profile, limit);
  const hits = topSkills(profile, 40).filter((s) => textHasTerm(jobDescription, s));
  return (hits.length ? hits : topSkills(profile, limit)).slice(0, limit);
}

/** El titular sin la parte de especialidad, para usarlo dentro de una frase. */

function bestAchievement(profile: Profile): string {
  const bullets = profile.experience.flatMap((e) => e.bullets).filter((b) => b.trim());
  const withNumbers = bullets.filter((b) => /\d/.test(b));
  const pick = (withNumbers[0] ?? bullets[0] ?? '').trim();
  if (!pick) return '';
  const clean = pick.replace(/\.$/, '');
  return clean.charAt(0).toLowerCase() + clean.slice(1);
}

export interface SummaryVariant {
  name: string;
  description: string;
  text: string;
}

/**
 * Arma tres versiones del resumen profesional a partir de lo que ya está
 * cargado en el perfil. Son borradores para editar, no texto final.
 */
export function summaryVariants(profile: Profile, target = ''): SummaryVariant[] {
  const skills = topSkills(profile, 5),
    role = profile.personal.headline;
  const goal = target || role;
  const intro = goal ? 'Busco trabajo en ' + goal + '.' : '';
  const ability = skills.length ? 'Puedo aportar en ' + skills.join(', ') + '.' : '';
  const first = profile.experience.find((e) => e.role.trim());
  const experience = first
    ? 'Mi experiencia incluye ' + first.role + (first.company ? ' en ' + first.company : '') + '.'
    : '';
  return [
    {
      name: 'Breve',
      description: 'Una presentación sencilla con tus datos.',
      text: [intro, ability].filter(Boolean).join(' '),
    },
    {
      name: 'Con mi experiencia',
      description: 'Incluye un trabajo que registraste.',
      text: [experience, ability, intro].filter(Boolean).join(' '),
    },
    {
      name: 'Con mis estudios',
      description: 'Incluye los estudios que registraste.',
      text: [
        intro,
        ...profile.education.slice(0, 1).map((e) => 'Estudios: ' + e.degree + '.'),
        ability,
      ]
        .filter(Boolean)
        .join(' '),
    },
  ];
}

export interface BulletParts {
  verb: string;
  what: string;
  how: string;
  result: string;
}

/** Método XYZ: «Logré X, medido por Y, haciendo Z». */
export function buildBullet(parts: BulletParts): string {
  const verb = parts.verb.trim();
  const what = parts.what.trim().replace(/\.$/, '');
  const how = parts.how.trim().replace(/\.$/, '');
  const result = parts.result.trim().replace(/\.$/, '');
  if (!verb && !what) return '';

  let sentence = [verb, what].filter(Boolean).join(' ');
  if (how)
    sentence += ` ${how.startsWith('con') || how.startsWith('mediante') || how.startsWith('usando') ? how : `mediante ${how}`}`;
  if (result)
    sentence += `, ${result.startsWith('logrando') || result.startsWith('reduciendo') || result.startsWith('aumentando') ? result : `logrando ${result}`}`;
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}

export interface LetterInput {
  profile: Profile;
  company: string;
  role: string;
  recipient: string;
  source: string;
  motivation: string;
  keywords: string[];
}

/** Borrador de carta de presentación en cuatro párrafos. */
export function generateCoverLetter(input: LetterInput): string {
  const { profile, company, role, recipient, motivation } = input;
  return [
    recipient ? 'Hola, ' + recipient + ':' : 'Hola:',
    'Me interesa ' +
      (role ? 'el trabajo de ' + role : 'esta oportunidad') +
      (company ? ' en ' + company : '') +
      '.',
    profile.personal.summary,
    bestAchievement(profile) ? 'Una de mis experiencias: ' + bestAchievement(profile) + '.' : '',
    motivation,
    'Quedo disponible para conversar.',
    profile.personal.fullName,
    [profile.personal.phone, profile.personal.email].filter(Boolean).join(' · '),
  ]
    .filter(Boolean)
    .join('\n\n');
}

/** Titular de LinkedIn: cargo + especialidad + valor. */
export function linkedinHeadlines(profile: Profile): string[] {
  const role = profile.personal.headline.trim(),
    skills = topSkills(profile, 3);
  return [
    role || 'En búsqueda de trabajo',
    [role, ...skills.slice(0, 2)].filter(Boolean).join(' · ') ||
      'Disponible para nuevas oportunidades',
    role ? 'Busco trabajo en ' + role : 'Quiero encontrar mi próximo trabajo',
  ];
}

export function linkedinAbout(profile: Profile): string {
  const p = profile.personal,
    skills = topSkills(profile, 5),
    tasks = profile.experience
      .flatMap((e) => e.bullets)
      .filter((b) => b.trim())
      .slice(0, 3);
  return [
    p.summary ||
      (p.headline
        ? 'Busco trabajo en ' + p.headline + '.'
        : 'Estoy buscando una oportunidad de trabajo.'),
    tasks.length ? 'Mi experiencia incluye:\n' + tasks.map((t) => '- ' + t).join('\n') : '',
    skills.length ? 'Puedo aportar en: ' + skills.join(', ') + '.' : '',
    [p.phone, p.email].filter(Boolean).join(' · '),
  ]
    .filter(Boolean)
    .join('\n\n');
}

export interface InterviewQuestion {
  question: string;
  category: string;
  tip: string;
}

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    question: 'Cuéntame de ti',
    category: 'Apertura',
    tip: 'Noventa segundos: presente, pasado relevante y por qué estás en esta conversación. No recorras el CV entero.',
  },
  {
    question: '¿Por qué quieres trabajar acá?',
    category: 'Motivación',
    tip: 'Nombra algo específico de la empresa. Si no puedes, es que no investigaste lo suficiente.',
  },
  {
    question: '¿Por qué estás dejando tu trabajo actual?',
    category: 'Motivación',
    tip: 'Hacia dónde vas, no de qué escapas. Nunca hables mal de tu jefe anterior.',
  },
  {
    question: 'Cuéntame de un problema difícil que resolviste',
    category: 'Conductual',
    tip: 'Cuenta qué pasaba, qué hiciste y cómo terminó. Usa un ejemplo real.',
  },
  {
    question: 'Háblame de un error que cometiste',
    category: 'Conductual',
    tip: 'Error real, impacto real, qué cambiaste después. Un error falso se nota a un kilómetro.',
  },
  {
    question: 'Cuéntame de un conflicto con un compañero',
    category: 'Conductual',
    tip: 'Muestra que escuchaste la otra posición antes de resolver. Cierra con cómo quedó la relación.',
  },
  {
    question: '¿Cuál es tu mayor debilidad?',
    category: 'Clásica',
    tip: 'Una debilidad real que estés trabajando, con la acción concreta que tomaste. Nada de «soy muy perfeccionista».',
  },
  {
    question: '¿Dónde te ves en cinco años?',
    category: 'Clásica',
    tip: 'Habla de capacidades que quieres tener, no de cargos. Conecta con el rol que estás postulando.',
  },
  {
    question: '¿Cuál es tu expectativa de renta?',
    category: 'Negociación',
    tip: 'Da un rango investigado, no un número. Si puedes, pregunta primero cuál es el rango del cargo.',
  },
  {
    question: 'Cuéntame de una vez que lideraste sin tener el cargo',
    category: 'Conductual',
    tip: 'Muy pedida para roles senior. Sirve cualquier situación donde tomaste la iniciativa.',
  },
  {
    question: '¿Cómo priorizas cuando todo es urgente?',
    category: 'Conductual',
    tip: 'Describe tu método concreto y da un ejemplo donde dijiste que no a algo.',
  },
  {
    question: '¿Tienes preguntas para nosotros?',
    category: 'Cierre',
    tip: 'Siempre sí. Pregunta por el equipo, cómo se mide el éxito del cargo y qué pasó con quien estaba antes.',
  },
];

/** Preguntas que conviene hacerle tú a la empresa. */
export const QUESTIONS_TO_ASK: string[] = [
  '¿Cómo se ve un buen primer trimestre en este cargo?',
  '¿Qué pasó con la persona que estaba antes en el puesto?',
  '¿Cómo se toman las decisiones cuando el equipo no está de acuerdo?',
  '¿Cuál es el mayor desafío que tiene el equipo hoy?',
  '¿Cómo es el proceso de evaluación y de aumentos?',
  '¿Qué es lo que más te gusta de trabajar acá, y qué cambiarías?',
];
