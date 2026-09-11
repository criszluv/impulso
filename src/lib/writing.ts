import type { Profile } from '../types';
import { totalExperienceMonths } from './analysis';
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
function roleNoun(profile: Profile): string {
  const headline = profile.personal.headline || 'profesional';
  return headline.split(/[·|]/)[0].trim() || headline;
}

function experienceLabel(profile: Profile): string {
  const months = totalExperienceMonths(profile);
  if (months < 12) return 'en formación';
  const years = Math.floor(months / 12);
  return `con ${years} ${years === 1 ? 'año' : 'años'} de experiencia`;
}

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
  const p = profile.personal;
  const role = p.headline || 'profesional';
  const skills = topSkills(profile, 4);
  const skillsText = skills.length
    ? skills.slice(0, -1).join(', ') + (skills.length > 1 ? ` y ${skills[skills.length - 1]}` : skills[0])
    : 'mis principales herramientas';
  const exp = experienceLabel(profile);
  const win = bestAchievement(profile);
  const lastCompany = profile.experience[0]?.company ?? '';
  const goal = target || 'un equipo donde pueda seguir creciendo y aportar desde el primer mes';

  return [
    {
      name: 'Directo',
      description: 'Va al grano. Funciona para postulaciones masivas y filtros automáticos.',
      text: [
        `${role} ${exp}, especializado en ${skillsText}.`,
        win ? `Entre mis resultados: ${win}.` : '',
        `Busco ${goal}.`,
      ]
        .filter(Boolean)
        .join(' '),
    },
    {
      name: 'Con contexto',
      description: 'Suma dónde trabajaste. Útil si vienes de una empresa reconocible.',
      text: [
        `${role} ${exp}.`,
        lastCompany ? `Actualmente en ${lastCompany}, donde ${win || 'lidero proyectos de punta a punta'}.` : '',
        `Trabajo a diario con ${skillsText}.`,
        `Me interesa ${goal}.`,
      ]
        .filter(Boolean)
        .join(' '),
    },
    {
      name: 'Orientado a impacto',
      description: 'Abre con el resultado. El más fuerte si tienes una cifra buena.',
      text: [
        win ? `${win.charAt(0).toUpperCase() + win.slice(1)}.` : `${role} que entrega resultados medibles.`,
        `Soy ${role.toLowerCase()} ${exp}, con foco en ${skillsText}.`,
        `Quiero ${goal}.`,
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
  if (how) sentence += ` ${how.startsWith('con') || how.startsWith('mediante') || how.startsWith('usando') ? how : `mediante ${how}`}`;
  if (result) sentence += `, ${result.startsWith('logrando') || result.startsWith('reduciendo') || result.startsWith('aumentando') ? result : `logrando ${result}`}`;
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
  const { profile, company, role, recipient, source, motivation, keywords } = input;
  const p = profile.personal;
  const name = p.fullName || '[Tu nombre]';
  const empresa = company || '[Empresa]';
  const cargo = role || '[Cargo]';
  const saludo = recipient ? `Estimado/a ${recipient}:` : 'Estimado equipo de selección:';
  const exp = experienceLabel(profile);
  const skills = (keywords.length ? keywords : topSkills(profile, 4)).slice(0, 4);
  const skillsText = skills.length ? skills.join(', ') : 'las herramientas del rol';
  const win = bestAchievement(profile);
  const via = source ? ` a través de ${source}` : '';

  const cuerpo = [
    saludo,
    '',
    `Les escribo para postular al cargo de ${cargo} en ${empresa}, publicado${via}. Soy ${roleNoun(profile)} ${exp} y creo que el perfil que describen calza con lo que vengo haciendo.`,
    '',
    win
      ? `En mi rol actual ${win}. Ese tipo de trabajo es el que me gustaría seguir haciendo en ${empresa}, especialmente en lo que respecta a ${skillsText}.`
      : `Manejo a diario ${skillsText}, y me muevo bien en equipos donde hay que hacerse cargo del problema completo, no solo de la tarea asignada.`,
    '',
    motivation
      ? motivation
      : `Me interesa ${empresa} en particular porque [completa aquí con algo concreto de la empresa: un producto que usas, un valor que comparten, una nota que leíste]. Ese detalle es lo que separa una carta genérica de una que se lee entera.`,
    '',
    `Quedo atento/a a la posibilidad de conversar. Pueden contactarme al ${p.phone || '[teléfono]'} o a ${p.email || '[correo]'}.`,
    '',
    'Saludos cordiales,',
    name,
  ];

  return cuerpo.join('\n');
}

/** Titular de LinkedIn: cargo + especialidad + valor. */
export function linkedinHeadlines(profile: Profile): string[] {
  const role = profile.personal.headline || 'Profesional';
  const base = role.split('·')[0].trim();
  const skills = topSkills(profile, 3);
  const win = bestAchievement(profile);
  const metric = win.match(/\d+[%\d.,]*\s*\w*/)?.[0] ?? '';

  return [
    `${base} · ${skills.slice(0, 2).join(' y ') || 'especialista'}`,
    `${base} | Ayudo a equipos a ${skills[0] ? `sacar más de ${skills[0]}` : 'entregar mejores resultados'}`,
    metric ? `${base} · ${metric} de impacto medible en mi último proyecto` : `${base} · Abierto a nuevas oportunidades`,
  ];
}

/**
 * Borrador del «Acerca de» de LinkedIn. A diferencia del CV, aquí se escribe
 * en primera persona y se permite algo más de voz propia.
 */
export function linkedinAbout(profile: Profile): string {
  const p = profile.personal;
  const skills = topSkills(profile, 5);
  const wins = profile.experience
    .flatMap((e) => e.bullets)
    .filter((b) => b.trim() && /\d/.test(b))
    .slice(0, 3);

  const parts: string[] = [];
  parts.push(p.summary.trim() || `Soy ${p.headline || 'profesional'} y esto es lo que hago.`);

  if (wins.length) {
    parts.push('');
    parts.push('Algunas cosas que he hecho:');
    parts.push(...wins.map((w) => `• ${w.replace(/^/, '').trim()}`));
  }

  if (skills.length) {
    parts.push('');
    parts.push(`Trabajo principalmente con: ${skills.join(' · ')}.`);
  }

  parts.push('');
  parts.push(
    `Si estás armando un equipo o quieres conversar sobre un proyecto, escríbeme${p.email ? ` a ${p.email}` : ''}.`,
  );

  return parts.join('\n');
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
    tip: 'STAR completo. La parte que más importa es la Acción: qué hiciste tú, no el equipo.',
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
