/** Utilidades de texto compartidas por el analizador y el buscador de palabras clave. */

export function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export function normalize(value: string): string {
  return stripAccents(value.toLowerCase());
}

const STOPWORDS = new Set(
  `a al algo algun alguna algunas alguno algunos ante antes aqui asi aun aunque cada casi como con
   contra cual cuales cuando cuanto de del desde donde dos e el ella ellas ello ellos en entre era
   eran eres es esa esas ese eso esos esta estan estas este esto estos fue fueron ha haber habia han
   hasta hay la las le les lo los mas me mi mientras mis mucho muy nos nosotros nuestra nuestro o os
   otra otras otro otros para pero poco por porque que quien quienes se segun ser si sin sobre solo
   son su sus tambien tan tanto te tiene tienen todo todos tu tus un una uno unos usted ustedes va
   vamos ver vez y ya yo buscamos buscas ofrecemos requisitos deseable importante empresa puesto
   cargo trabajo trabajar experiencia anos ano nivel conocimientos conocimiento capacidad equipo
   equipos persona personas candidato candidata perfil area areas funciones tareas actividades
   principales requerimos necesitamos deberas podras sera seran tendras nuestras nuestros mismo
   misma dentro fuera parte todas toda ademas cualquier general formacion titulo carrera profesional
   and are as at be by for from has have in is it its of on or that the this to was were will with
   you your we our job role work working team teams strong good great plus must should would able
   experience years year knowledge ability skills skill about across including etc

   valoramos valorara valoraran trabajaras trabajara trabajaran somos estamos tenemos tener tenga
   tengas poseer posea contar cuenta cuentas hacer haciendo realizar realizando realizadas realizada
   participar participando apoyar apoyando manejo manejar usar usando utilizar utilizando lograr
   liderar liderando junto dia dias semana semanas mes meses hora horas tiempo completo
   parcial modalidad jornada minimo maximo excluyente responsabilidades beneficios salario sueldo
   renta contrato indefinido plazo fijo oportunidad oportunidades crecimiento desafios ambiente
   cultura valores mision vision solida solido solidas solidos propio propia propios propias
   importante ideal buen buena bueno gran grandes alto alta fuerte amplio amplia clave diversas
   distintas diferentes nuevas nuevos nueva nuevo ofrecer ofrece brindar entregar aportar sumar
   incorporar postular postulacion vacante aviso oferta jefe jefa reporta reportando directamente`
    .split(/\s+/)
    .filter(Boolean),
);

/** Términos técnicos que se detectan aunque el tokenizador los partiría. */
const PHRASE_TERMS = [
  'react native', 'node js', 'next js', 'nest js', 'vue js', 'spring boot', 'ruby on rails',
  'machine learning', 'deep learning', 'data science', 'big data', 'power bi', 'google analytics',
  'sql server', 'google cloud', 'amazon web services', 'design system', 'design systems',
  'control de versiones', 'metodologias agiles', 'metodologia agil', 'trabajo en equipo',
  'atencion al cliente', 'servicio al cliente', 'gestion de proyectos', 'analisis de datos',
  'mejora continua', 'toma de decisiones', 'resolucion de problemas', 'ingles avanzado',
  'ingles intermedio', 'recursos humanos', 'redes sociales', 'community manager',
  'bases de datos', 'base de datos', 'pruebas unitarias', 'integracion continua',
];

/** Siglas y símbolos que sobreviven a la normalización. */
const SYMBOL_TERMS: Record<string, string> = {
  'c#': 'c#',
  'c++': 'c++',
  '.net': '.net',
  'node.js': 'node.js',
  'next.js': 'next.js',
  'vue.js': 'vue.js',
  'ci/cd': 'ci/cd',
};

export function tokenize(text: string): string[] {
  return normalize(text)
    .replace(/[^a-z0-9ñ+#./\s-]/g, ' ')
    .split(/[\s,;:()[\]{}'"!?]+/)
    .map((t) => t.replace(/^[-.]+|[-.]+$/g, ''))
    .filter((t) => t.length > 1);
}

export interface Keyword {
  term: string;
  count: number;
}

/**
 * Extrae los términos con más peso de una oferta de trabajo: frases técnicas
 * conocidas primero, luego palabras sueltas fuera de la lista de vacías.
 */
export function extractKeywords(text: string, limit = 30): Keyword[] {
  if (!text.trim()) return [];
  const flat = normalize(text);
  const counts = new Map<string, number>();
  const consumed: string[] = [];

  for (const phrase of PHRASE_TERMS) {
    const matches = flat.split(phrase).length - 1;
    if (matches > 0) {
      counts.set(phrase, matches);
      consumed.push(phrase);
    }
  }
  for (const [needle, label] of Object.entries(SYMBOL_TERMS)) {
    const matches = flat.split(needle).length - 1;
    if (matches > 0) counts.set(label, (counts.get(label) ?? 0) + matches);
  }

  let rest = flat;
  for (const phrase of consumed) rest = rest.split(phrase).join(' ');

  for (const token of tokenize(rest)) {
    if (token.length < 3) continue;
    if (STOPWORDS.has(token)) continue;
    if (/^\d+$/.test(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
    .slice(0, limit);
}

/** true si el término aparece en el texto (tolerante a plurales simples). */
export function textHasTerm(haystack: string, term: string): boolean {
  const flat = normalize(haystack);
  const needle = normalize(term);
  if (flat.includes(needle)) return true;
  if (needle.endsWith('s') && flat.includes(needle.slice(0, -1))) return true;
  if (!needle.endsWith('s') && flat.includes(`${needle}s`)) return true;
  return false;
}
