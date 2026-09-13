import type { CvConfig, Profile } from '../types';
import { fold } from './jobs';
import { formatRange } from './utils';

export type Evidence = { section: string; text: string; searchable?: string };
export type ComparisonItem = {
  id: string;
  label: string;
  quote: string;
  status: 'related' | 'missing' | 'review';
  evidence: Evidence[];
  suggestion: string;
};
type Topic = {
  id: string;
  label: string;
  pattern: RegExp;
  suggestion: string;
  check?: 'education' | 'language' | 'experience' | 'credential';
};
const topics: Topic[] = [
  {
    id: 'service',
    label: 'Atención al cliente',
    pattern:
      /atencion (?:al?|de) (?:cliente|publico|personas)|customer (?:service|support)|servicio al cliente|resolucion de consultas/,
    suggestion:
      'Si has atendido personas o resuelto consultas, describe una tarea concreta y dónde la realizaste.',
  },
  {
    id: 'sales',
    label: 'Ventas',
    pattern: /\bventas?\b|\bsales\b|asesor(?:a)? comercial/,
    suggestion:
      'Si tienes esta experiencia, explica qué vendías o cómo ayudabas a los clientes a elegir.',
  },
  {
    id: 'cash',
    label: 'Caja y cobros',
    pattern: /manejo de caja|cajer[oa]|cashier|cobros|cierre de caja/,
    suggestion:
      'Si lo has hecho, indica si realizabas cobros, cierre de caja o manejo de medios de pago.',
  },
  {
    id: 'stock',
    label: 'Inventario',
    pattern: /inventario|inventory|control de stock/,
    suggestion: 'Si sabes llevar inventario, cuenta cómo registrabas o revisabas los productos.',
  },
  {
    id: 'orders',
    label: 'Pedidos y bodega',
    pattern:
      /preparacion de pedidos|picking|packing|warehouse|bodega|recepcion de (?:productos|mercaderia)/,
    suggestion:
      'Si has preparado o recibido pedidos, añade las tareas y herramientas que realmente usaste.',
  },
  {
    id: 'cleaning',
    label: 'Limpieza',
    pattern: /limpieza|\baseo\b|cleaning|housekeeping/,
    suggestion:
      'Si tienes experiencia, explica qué espacios limpiabas y qué procedimientos seguías.',
  },
  {
    id: 'cooking',
    label: 'Cocina',
    pattern: /\bcocina\b|cociner[oa]|\bchef\b|\bcook(?:ing)?\b|preparacion de alimentos/,
    suggestion:
      'Si cocinas o has trabajado en cocina, describe las preparaciones y tareas que conoces.',
  },
  {
    id: 'food',
    label: 'Manipulación de alimentos',
    pattern: /manipula(?:cion|dor) de alimentos|higiene de alimentos|food safety/,
    check: 'credential',
    suggestion:
      'Comprueba si piden un certificado vigente. Añade el curso, entidad y fecha solo si lo tienes.',
  },
  {
    id: 'care',
    label: 'Cuidados',
    pattern: /cuidado de (?:personas|mayores|pacientes)|cuidador|caregiver|apoyo en alimentacion/,
    suggestion:
      'Si has cuidado personas, describe las tareas realizadas; puede ser experiencia familiar o por cuenta propia.',
  },
  {
    id: 'tools',
    label: 'Herramientas y reparaciones',
    pattern: /uso de herramientas|reparacion|mantenimiento|maintenance|plomeria|fontaneria/,
    suggestion:
      'Si sabes realizar estas tareas, nombra las herramientas y reparaciones que conoces.',
  },
  {
    id: 'driving',
    label: 'Conducción y licencia',
    pattern:
      /licencia de conducir|permiso de conducir|carnet de conducir|driving licen[cs]e|\bconductor\b/,
    check: 'credential',
    suggestion:
      'Verifica la clase, vigencia y validez de la licencia en el país del trabajo. No basta con mencionar conducción.',
  },
  {
    id: 'forklift',
    label: 'Carretilla o grúa horquilla',
    pattern: /carretiller|grua horquilla|forklift/,
    check: 'credential',
    suggestion:
      'Comprueba si exigen acreditación y qué equipo hay que manejar. Añádelo solo si corresponde a tu experiencia.',
  },
  {
    id: 'excel',
    label: 'Excel',
    pattern: /\bexcel\b/,
    suggestion:
      'Si manejas Excel, especifica las tareas o funciones que sabes utilizar y revisa el nivel solicitado.',
  },
  {
    id: 'office',
    label: 'Microsoft Office',
    pattern: /microsoft office|ofimatica|\boffice\b/,
    suggestion:
      'Nombra las aplicaciones que utilizas y para qué; evita afirmar un nivel que no puedas demostrar.',
  },
  {
    id: 'crm',
    label: 'CRM',
    pattern: /\bcrm\b|salesforce|hubspot/,
    suggestion:
      'Si has utilizado un CRM, indica cuál y qué tareas realizabas. Comprueba si el aviso pide una herramienta específica.',
  },
  {
    id: 'sap',
    label: 'SAP',
    pattern: /\bsap\b/,
    suggestion: 'Si conoces SAP, indica las operaciones o módulos con los que has trabajado.',
  },
  {
    id: 'powerbi',
    label: 'Power BI',
    pattern: /\bpower\s?bi\b/,
    suggestion:
      'Si has trabajado con Power BI, describe los informes o análisis que puedes realizar.',
  },
  {
    id: 'sql',
    label: 'SQL',
    pattern: /\bsql\b/,
    suggestion:
      'Si utilizas SQL, describe una consulta, análisis o proyecto real relevante para el puesto.',
  },
  {
    id: 'python',
    label: 'Python',
    pattern: /\bpython\b/,
    suggestion: 'Si sabes Python, menciona un proyecto o tarea que hayas realizado con él.',
  },
  {
    id: 'js',
    label: 'JavaScript',
    pattern: /\bjavascript\b/,
    suggestion: 'Si utilizas JavaScript, vincúlalo con una tarea o proyecto concreto.',
  },
  {
    id: 'ts',
    label: 'TypeScript',
    pattern: /\btypescript\b/,
    suggestion: 'Si utilizas TypeScript, vincúlalo con una tarea o proyecto concreto.',
  },
  {
    id: 'react',
    label: 'React',
    pattern: /\breact\b/,
    suggestion: 'Si has usado React, explica qué construiste y cuál fue tu aportación.',
  },
  {
    id: 'team',
    label: 'Trabajo en equipo',
    pattern: /trabajo en equipo|teamwork|team player/,
    suggestion: 'Puedes explicar una situación real en la que colaboraste con otras personas.',
  },
  {
    id: 'lead',
    label: 'Coordinación de equipos',
    pattern:
      /liderazgo|coordinacion de equipos|gestion de equipos|team leadership|people management/,
    suggestion: 'Si coordinaste personas, cuenta qué organizabas y tu responsabilidad concreta.',
  },
  {
    id: 'education',
    label: 'Estudios y titulación',
    pattern:
      /titulacion|titulo (?:profesional|tecnico|universitario)|bachillerato|educacion secundaria|ensenanza media|formacion profesional|grado (?:en|universitario)|licenciatura|bachelor|master(?:.s)? degree|university degree/,
    check: 'education',
    suggestion:
      'Compara la especialidad y el nivel pedidos con tus estudios. Aclara si están terminados o en curso y si requieren reconocimiento en el país de destino.',
  },
  {
    id: 'english',
    label: 'Inglés',
    pattern: /\bingles\b|\benglish\b/,
    check: 'language',
    suggestion:
      'Revisa el nivel de inglés solicitado y si lo usarás al hablar o escribir. Añade tu nivel real; mencionar el idioma no confirma el nivel requerido.',
  },
  {
    id: 'spanish',
    label: 'Español',
    pattern: /\bespanol\b|\bspanish\b/,
    check: 'language',
    suggestion:
      'Revisa el nivel de español y las tareas en que lo utilizarás. Indica tu nivel real si aún no figura.',
  },
  {
    id: 'french',
    label: 'Francés',
    pattern: /\bfrances\b|\bfrench\b/,
    check: 'language',
    suggestion: 'Revisa el nivel de francés solicitado e indica el que puedes demostrar.',
  },
  {
    id: 'german',
    label: 'Alemán',
    pattern: /\baleman\b|\bgerman\b/,
    check: 'language',
    suggestion: 'Revisa el nivel de alemán solicitado e indica el que puedes demostrar.',
  },
  {
    id: 'experience',
    label: 'Experiencia previa y duración',
    pattern:
      /\b\d+\+?\s*(?:anos|years).{0,35}(?:experiencia|experience)|experiencia previa|prior experience/,
    check: 'experience',
    suggestion:
      'Comprueba cuánto tiempo piden y en qué tareas. Revisa tus fechas; no sumamos periodos que podrían solaparse ni damos por equivalente cualquier trabajo.',
  },
];
const split = (text: string) =>
  text
    .split(/\r?\n|[.;!?]\s+|,\s+|\s+(?:pero|but)\s+/i)
    .map((s) => s.replace(/^\s*[-*•]\s*/, '').trim())
    .filter(Boolean);
const uncertain = (text: string) =>
  /sin experiencia|no (?:se|tengo|domino|conozco)|quiero aprender|busco aprender|me gustaria|no experience|want to learn/.test(
    fold(text),
  );
function notRequired(line: string, pattern: RegExp) {
  const text = fold(line),
    match = text.match(pattern);
  if (!match || match.index === undefined) return false;
  const before = text.slice(0, match.index),
    after = text.slice(match.index + match[0].length);
  return (
    /(?:no (?:se )?(?:requiere|requieren|necesita|necesitas|exige|exigen)|sin)\s+[\w\s]{0,45}$/.test(
      before,
    ) || /^.{0,20}(?:no (?:es )?(?:obligatori|necesari)|not required)/.test(after)
  );
}
function cvEvidence(profile: Profile, config: CvConfig): Evidence[] {
  const result: Evidence[] = [];
  const add = (section: string, text: string, searchable = text) => {
    if (text.trim()) result.push({ section, text: text.trim(), searchable });
  };
  if (config.showSummary)
    for (const text of split(profile.personal.summary)) {
      if (!/^(busco|quiero|me gustaria|objetivo|looking for)\b/.test(fold(text)))
        add('Perfil', text);
    }
  profile.skills.forEach((g) => g.items.forEach((t) => add('Habilidades', t)));
  profile.experience.forEach((e) => {
    add(
      'Experiencia',
      [e.role, e.company, formatRange(e.startDate, e.endDate, e.current)]
        .filter(Boolean)
        .join(' · '),
      e.role,
    );
    e.bullets.forEach((t) => add('Experiencia' + (e.role ? ' · ' + e.role : ''), t));
    e.tech.forEach((t) => add('Herramientas' + (e.role ? ' · ' + e.role : ''), t));
  });
  profile.education.forEach((e) =>
    add(
      'Estudios',
      [
        e.degree,
        e.institution,
        formatRange(e.startDate, e.endDate, e.current, 'En curso'),
        e.detail,
      ]
        .filter(Boolean)
        .join(' · '),
      [e.degree, e.detail].join(' '),
    ),
  );
  if (config.showLanguages)
    profile.languages.forEach((e) => add('Idiomas', e.name + ' · ' + e.level));
  if (config.showCertifications)
    profile.certifications.forEach((e) =>
      add(
        'Cursos y certificaciones',
        [e.name, e.issuer, e.date].filter(Boolean).join(' · '),
        e.name,
      ),
    );
  if (config.showProjects)
    profile.projects.forEach((e) => {
      add('Proyectos', [e.name, e.description].filter(Boolean).join(' · '));
      e.tech.forEach((t) => add('Proyectos', t));
    });
  return result;
}
export function compareJob(description: string, profile: Profile, config: CvConfig) {
  const lines = split(description),
    evidence = cvEvidence(profile, config);
  const items: ComparisonItem[] = topics.flatMap((topic) => {
    const quotes = lines.filter(
      (line) => topic.pattern.test(fold(line)) && !notRequired(line, topic.pattern),
    );
    if (!quotes.length) return [];
    const related = evidence.filter((e) =>
      topic.check === 'education'
        ? e.section === 'Estudios'
        : topic.check === 'experience'
          ? e.section === 'Experiencia'
          : topic.pattern.test(fold(e.searchable ?? e.text)),
    );
    const positive = related.filter((e) => !uncertain(e.text));
    const status =
      topic.check || (related.length && !positive.length)
        ? 'review'
        : positive.length
          ? 'related'
          : 'missing';
    return [
      {
        id: topic.id,
        label: topic.label,
        quote: quotes.join(' / '),
        status,
        evidence: related.slice(0, 3),
        suggestion: topic.suggestion,
      },
    ];
  });
  const other = lines.filter(
    (line) =>
      /requisit|obligatori|imprescindible|se requiere|must |required|qualification/.test(
        fold(line),
      ) &&
      !topics.some((t) => t.pattern.test(fold(line))) &&
      !/edad|sexo|genero|nacionalidad|discapacidad|religion|ethnicity|gender|citizenship/.test(
        fold(line),
      ),
  );
  return {
    items,
    other,
    hasProfile: evidence.length > 0,
    counts: {
      related: items.filter((i) => i.status === 'related').length,
      missing: items.filter((i) => i.status === 'missing').length,
      review: items.filter((i) => i.status === 'review').length,
    },
  };
}
