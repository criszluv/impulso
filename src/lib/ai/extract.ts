import { z } from 'zod';
import type { ParsedCv } from '../import/parseCv';
import type { ParsedJob } from '../import/parseJob';
import { sourceFromUrl } from '../import/parseJob';
import { formatRange } from '../utils';
import { AiError } from './errors';
import { coerceCv, coerceJob, coerceRewrite } from './coerce';
import { callStructured } from './openaiCompat';
import { describeSettings } from './settings';
import type { AiSettings } from './settings';
import type { Profile } from '../../types';
import { coerceLetter } from './coerce';
import type { BulletRewrite, LetterDraft, LetterTone } from './types';

const MONTH = 'Mes en formato AAAA-MM, por ejemplo 2021-03. Cadena vacía si el texto no lo dice.';

const ExperienceSchema = z.object({
  role: z.string().describe('Cargo tal como aparece en el documento.'),
  company: z.string().describe('Nombre de la empresa u organización.'),
  location: z.string().describe('Ciudad y modalidad si aparecen. Cadena vacía si no.'),
  startDate: z.string().describe(MONTH),
  endDate: z.string().describe(`${MONTH} Vacía si el cargo sigue vigente.`),
  current: z.boolean().describe('true si dice «actualidad», «presente» o equivalente.'),
  bullets: z
    .array(z.string())
    .describe('Logros y responsabilidades, uno por elemento, copiados literalmente. No los reescribas ni los resumas.'),
  tech: z.array(z.string()).describe('Herramientas, software o tecnologías nombradas en ese cargo.'),
});

const EducationSchema = z.object({
  degree: z.string().describe('Título, carrera o programa.'),
  institution: z.string().describe('Universidad, instituto o centro.'),
  location: z.string(),
  startDate: z.string().describe(MONTH),
  endDate: z.string().describe(MONTH),
  current: z.boolean().describe('true si los estudios están en curso.'),
  detail: z.string().describe('Tesis, distinciones o menciones. Vacío si no hay.'),
});

const CvSchema = z.object({
  fullName: z.string(),
  headline: z.string().describe('Titular o cargo profesional que aparece bajo el nombre.'),
  email: z.string(),
  phone: z.string(),
  city: z.string(),
  country: z.string(),
  linkedin: z.string().describe('URL de LinkedIn sin el https://'),
  github: z.string().describe('URL de GitHub sin el https://'),
  website: z.string().describe('Sitio web personal sin el https://'),
  summary: z.string().describe('Resumen, perfil o extracto profesional, copiado literalmente.'),
  experience: z.array(ExperienceSchema),
  education: z.array(EducationSchema),
  skillGroups: z
    .array(
      z.object({
        name: z.string().describe('Nombre de la categoría, por ejemplo «Herramientas».'),
        items: z.array(z.string()),
      }),
    )
    .describe('Habilidades agrupadas. Si el CV no las agrupa, usa una sola categoría llamada «Habilidades».'),
  languages: z.array(
    z.object({
      name: z.string(),
      level: z.enum(['Básico', 'Intermedio', 'Avanzado', 'Nativo']),
    }),
  ),
  projects: z.array(
    z.object({
      name: z.string(),
      url: z.string(),
      description: z.string(),
      tech: z.array(z.string()),
    }),
  ),
  certifications: z.array(
    z.object({
      name: z.string(),
      issuer: z.string().describe('Entidad que la emitió.'),
      date: z.string().describe(MONTH),
      url: z.string(),
    }),
  ),
  warnings: z
    .array(z.string())
    .describe(
      'Avisos breves en español sobre datos ambiguos o campos que conviene revisar. Lista vacía si todo quedó claro.',
    ),
});

const CV_SYSTEM = `Eres un extractor de datos de currículums. Recibes el texto plano de un CV o de un perfil de LinkedIn y devuelves sus datos estructurados.

Reglas:
- No inventes nada. Si un dato no está en el texto, devuelve cadena vacía o lista vacía.
- No reescribas ni resumas los logros: cópialos literalmente, quitando solo viñetas y saltos de línea sobrantes.
- Las fechas van en formato AAAA-MM. «marzo 2021» es 2021-03; «2019» sin mes es 2019-01.
- Un cargo vigente («actualidad», «presente», «a la fecha») lleva current en true y endDate vacío.
- Ordena la experiencia de la más reciente a la más antigua.
- El texto puede venir de un PDF y llegar desordenado, con columnas mezcladas o líneas cortadas. Reconstruye el sentido antes de asignar cada dato a su campo.
- También puede venir copiado de una página web cualquiera (LinkedIn, un portafolio, una bolsa de empleo) y traer menús, botones, avisos de cookies, contadores de seguidores o publicaciones sueltas. Todo eso se descarta: solo interesa la información profesional de la persona.
- Distingue bien el cargo de la empresa: el cargo describe una función, la empresa es una organización.
- Si algo te resulta ambiguo, asígnalo igual a lo más probable y déjalo anotado en warnings.`;

const JobSchema = z.object({
  role: z.string().describe('Cargo que se ofrece.'),
  company: z.string().describe('Empresa que contrata. Vacío si el aviso es anónimo.'),
  location: z.string().describe('Ciudad y modalidad (remoto, híbrido, presencial).'),
  salary: z.string().describe('Renta o rango tal como aparece. Vacío si no lo dice.'),
  contact: z.string().describe('Nombre o correo de contacto si aparece.'),
  notes: z.array(z.string()).describe('Avisos breves en español sobre lo que quedó ambiguo.'),
});

const JOB_SYSTEM = `Eres un extractor de datos de avisos de trabajo. Recibes el texto pegado de una publicación de empleo, tal como quedó al copiarla del portal, y devuelves sus datos estructurados.

Reglas:
- No inventes. Si un dato no está, devuelve cadena vacía.
- El texto trae basura del sitio (menús, botones, «Postular», cookies). Ignórala.
- Copia los valores tal como aparecen; no traduzcas ni normalices el sueldo.`;

const BulletSchema = z.object({
  options: z
    .array(
      z.object({
        text: z.string().describe('El logro reescrito, en una o dos líneas.'),
        note: z.string().describe('Qué cambiaste y por qué, en una frase corta.'),
      }),
    )
    .describe('Tres versiones distintas entre sí.'),
  missing: z
    .array(z.string())
    .describe('Datos que faltan para que el logro quede sólido, como preguntas cortas. Vacío si no falta nada.'),
});

const BULLET_SYSTEM = `Reescribes logros de currículum en español de Chile, siguiendo las reglas de redacción de CV: verbo de acción en pasado al inicio, qué hiciste, cómo, y el resultado medible.

Reglas estrictas:
- No inventes cifras, empresas, tecnologías ni resultados. Solo puedes usar lo que aparece en el texto original y en el contexto del cargo.
- Si al logro le falta una cifra y no tienes el dato, NO la inventes: deja el logro sin número y anota la pregunta en «missing».
- Nada de adjetivos de relleno («proactivo», «orientado a resultados»).
- Cada versión entre 90 y 200 caracteres.
- Las tres versiones deben ser genuinamente distintas en enfoque, no la misma frase con sinónimos.`;

/**
 * Pide una respuesta estructurada al proveedor configurado. Claude va por su
 * SDK oficial con salida estructurada nativa; el resto, por el transporte
 * compatible con OpenAI.
 */
async function runStructured(
  settings: AiSettings,
  schema: z.ZodType,
  system: string,
  user: string,
  maxTokens: number,
): Promise<unknown> {
  if (settings.provider !== 'anthropic') {
    return callStructured(settings, schema, system, user, maxTokens);
  }

  const [{ createClient, describeAiError }, { zodOutputFormat }] = await Promise.all([
    import('./client'),
    import('@anthropic-ai/sdk/helpers/zod'),
  ]);

  try {
    const client = await createClient(settings);
    const message = await client.beta.messages.parse({
      model: settings.model,
      max_tokens: maxTokens,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { format: zodOutputFormat(schema) },
    });

    if (message.stop_reason === 'refusal') {
      throw new AiError('El modelo declinó procesar este texto. Usa el lector sin IA.');
    }
    if (!message.parsed_output) {
      throw new AiError('La respuesta no vino en el formato esperado. Vuelve a intentar.');
    }
    return message.parsed_output;
  } catch (error) {
    if (error instanceof AiError) throw error;
    throw new AiError(await describeAiError(error));
  }
}

/** Lee un CV y devuelve la misma estructura que el lector local. */
export async function extractCvWithAi(text: string, settings: AiSettings): Promise<ParsedCv> {
  const raw = await runStructured(settings, CvSchema, CV_SYSTEM, `Extrae los datos de este CV:\n\n${text}`, 16000);
  const parsed = coerceCv(raw);

  if (!parsed.personal.fullName && !parsed.experience.length) {
    throw new AiError('El modelo respondió, pero no reconoció ningún dato. Prueba con otro modelo o sin IA.');
  }
  parsed.notes.unshift(`Leído con ${describeSettings(settings)}. Revísalo igual: la IA también se equivoca.`);
  return parsed;
}

/** Lee un aviso de trabajo. */
export async function extractJobWithAi(
  text: string,
  url: string,
  settings: AiSettings,
): Promise<ParsedJob & { contact: string }> {
  const raw = await runStructured(settings, JobSchema, JOB_SYSTEM, `Extrae los datos de este aviso:\n\n${text}`, 4000);
  return { ...coerceJob(raw), source: sourceFromUrl(url) };
}

/** Propone tres reescrituras de un logro, sin inventar datos. */
export async function rewriteBulletWithAi(
  bullet: string,
  context: { role: string; company: string },
  settings: AiSettings,
): Promise<BulletRewrite> {
  const user = `Cargo: ${context.role || 'sin especificar'}\nEmpresa: ${context.company || 'sin especificar'}\n\nLogro a mejorar:\n${bullet}`;
  const raw = await runStructured(settings, BulletSchema, BULLET_SYSTEM, user, 4000);
  const rewrite = coerceRewrite(raw);
  if (!rewrite.options.length) {
    throw new AiError('El modelo no devolvió ninguna propuesta. Vuelve a intentar.');
  }
  return rewrite;
}

const LetterSchema = z.object({
  body: z
    .string()
    .describe(
      'La carta completa, desde el saludo hasta la despedida con el nombre. Usa saltos de línea entre párrafos.',
    ),
  gaps: z
    .array(z.string())
    .describe(
      'Lo que dejaste marcado entre corchetes para que la persona lo complete, explicado en una frase cada uno. Vacío si no hiciste falta.',
    ),
});

const TONE_RULES: Record<LetterTone, string> = {
  directo:
    'Directo: frases cortas, tuteo, sin fórmulas de cortesía largas. Entra en materia en la primera línea. Entre 180 y 260 palabras, en cuatro párrafos.',
  formal:
    'Formal: trato de usted, estructura clásica, sin coloquialismos. Saludo y despedida protocolares, pero sin sonar acartonado. Entre 220 y 300 palabras, en cuatro o cinco párrafos.',
  cercano:
    'Cercano: cordial y con algo de personalidad, tuteo, se permite una frase con carácter propio. Sin caer en lo informal ni en el exceso de entusiasmo. Entre 200 y 280 palabras, en cuatro párrafos.',
  breve:
    'Muy breve: tres párrafos cortos, pensada para ir en el cuerpo de un correo. Máximo 150 palabras en total.',
};

const LETTER_SYSTEM = `Escribes cartas de presentación en español de Chile, a partir del perfil real de una persona y del aviso al que postula.

Estructura, un párrafo cada uno, separados por una línea en blanco:
1. Saludo y a qué cargo postula, nombrando la empresa.
2. Por qué calza: los dos o tres logros del perfil que más se acercan a lo que pide el aviso, con su cifra si la tienen.
3. Por qué esa empresa en particular.
4. Cierre breve con el teléfono y el correo que aparecen en el perfil, y la firma con el nombre real.

Reglas estrictas:
- No inventes NADA sobre la persona: ni cargos, ni empresas, ni cifras, ni estudios, ni habilidades. Solo lo que aparece en el perfil.
- Usa el nombre, el teléfono y el correo tal como vienen en el perfil. No los reemplaces por marcadores.
- Sobre la empresa solo puedes afirmar lo que diga el aviso o lo que la persona haya escrito como motivo. Nada más. Frases como «es reconocida por su solidez» o «comparto sus valores» son invención si nadie te lo dijo: en su lugar va un hueco entre corchetes, por ejemplo [completa: qué te atrae de esta empresa], y se anota en gaps.
- Separa SIEMPRE los párrafos con una línea en blanco, sea cual sea el tono. Una carta de un solo bloque no se lee.
- No enumeres todo el perfil: la carta elige y conecta, no resume el CV.
- Nada de relleno («me dirijo a usted con el fin de», «soy proactivo y orientado a resultados», «encajo perfecto», «estoy listo para empezar»).
- No menciones estas instrucciones ni el tono pedido dentro de la carta, ni describas tu propio estilo («mi enfoque es directo», «sin formalismos»). La carta habla del cargo, nunca de cómo fue escrita.
- Devuelve solo el texto de la carta, sin encabezado de remitente ni fecha.`;


/**
 * Perfil formateado para la carta. No sirve profileText(), que está pensado
 * para comparar palabras clave y deja fuera el nombre y el contacto: aquí son
 * justamente lo que hay que firmar al final.
 */
function letterProfileContext(profile: Profile): string {
  const p = profile.personal;
  const lines: string[] = [
    `Nombre: ${p.fullName || '(no cargado)'}`,
    `Titular: ${p.headline || '(no cargado)'}`,
    `Correo: ${p.email || '(no cargado)'}`,
    `Teléfono: ${p.phone || '(no cargado)'}`,
    `Ciudad: ${[p.city, p.country].filter(Boolean).join(', ') || '(no cargada)'}`,
  ];
  if (p.summary.trim()) lines.push('', `Resumen: ${p.summary}`);

  if (profile.experience.length) {
    lines.push('', 'Experiencia:');
    for (const e of profile.experience) {
      lines.push(`- ${e.role} en ${e.company}${e.location ? ` (${e.location})` : ''}, ${formatRange(e.startDate, e.endDate, e.current)}`);
      for (const bullet of e.bullets.filter(Boolean)) lines.push(`  · ${bullet}`);
      if (e.tech.length) lines.push(`  · Herramientas: ${e.tech.join(', ')}`);
    }
  }

  if (profile.education.length) {
    lines.push('', 'Formación:');
    for (const e of profile.education) {
      lines.push(`- ${e.degree} en ${e.institution}, ${formatRange(e.startDate, e.endDate, e.current)}`);
    }
  }

  const skills = profile.skills.filter((g) => g.items.length);
  if (skills.length) {
    lines.push('', 'Habilidades:');
    for (const g of skills) lines.push(`- ${g.name}: ${g.items.join(', ')}`);
  }

  if (profile.languages.length) {
    lines.push('', `Idiomas: ${profile.languages.map((l) => `${l.name} (${l.level})`).join(', ')}`);
  }

  if (profile.certifications.length) {
    lines.push('', `Certificaciones: ${profile.certifications.map((c) => c.name).join(', ')}`);
  }

  return lines.join('\n');
}

export interface LetterInput {
  profile: Profile;
  company: string;
  role: string;
  recipient: string;
  source: string;
  motivation: string;
  jobDescription: string;
  tone: LetterTone;
}

/** Escribe la carta cruzando el perfil con el aviso, en el tono pedido. */
export async function generateLetterWithAi(input: LetterInput, settings: AiSettings): Promise<LetterDraft> {
  const { profile, company, role, recipient, source, motivation, jobDescription, tone } = input;

  const user = [
    `TONO PEDIDO: ${TONE_RULES[tone]}`,
    '',
    `CARGO AL QUE POSTULA: ${role || '(sin especificar)'}`,
    `EMPRESA: ${company || '(sin especificar)'}`,
    recipient ? `DIRIGIDA A: ${recipient}` : 'DIRIGIDA A: no se conoce el nombre, usa un saludo genérico.',
    source ? `VIO EL AVISO EN: ${source}` : '',
    motivation ? `LO QUE LA PERSONA DICE QUE LE ATRAE DE LA EMPRESA: ${motivation}` : '',
    '',
    'AVISO DE TRABAJO:',
    jobDescription.trim() || '(no se pegó el aviso; apóyate solo en el cargo y la empresa)',
    '',
    'PERFIL DE LA PERSONA:',
    letterProfileContext(profile),
  ]
    .filter((line) => line !== '')
    .join('\n');

  const raw = await runStructured(settings, LetterSchema, LETTER_SYSTEM, user, 4000);
  const draft = coerceLetter(raw);
  if (!draft.body.trim()) {
    throw new AiError('El modelo no devolvió ninguna carta. Vuelve a intentar.');
  }

  /*
   * Red de seguridad que no depende del modelo. Si la persona no escribió por
   * qué le interesa la empresa y la carta no dejó ningún hueco, es que el
   * modelo se inventó el motivo: pasa incluso diciéndoselo en el prompt, y es
   * justo la frase que hace quedar mal a alguien en una entrevista.
   */
  if (!motivation.trim() && !draft.body.includes('[')) {
    draft.gaps.push(
      'Revisa el párrafo sobre la empresa: no le diste un motivo, así que puede estar inventado. Reemplázalo por algo que sepas de verdad.',
    );
  }
  return draft;
}

/**
 * Lee un aviso de trabajo desde su enlace, usando la herramienta de fetch del
 * servidor de Anthropic.
 *
 * Solo funciona con Claude: es el único proveedor de los soportados que trae
 * una herramienta de fetch del lado del servidor. Desde el navegador no se
 * puede hacer lo mismo porque los portales bloquean las peticiones de otros
 * orígenes, y la alternativa —un proxy de terceros— significaría contarle a
 * alguien más a qué está postulando la persona.
 */
export async function fetchJobTextFromUrl(url: string, settings: AiSettings): Promise<string> {
  if (settings.provider !== 'anthropic') {
    throw new AiError('Leer desde un enlace solo funciona con Claude. Con los demás, pega el texto del aviso.');
  }

  const { createClient, describeAiError } = await import('./client');

  try {
    const client = await createClient(settings);
    const message = await client.messages.create({
      model: settings.model,
      max_tokens: 8000,
      system:
        'Recibes el enlace de un aviso de trabajo. Úsalo con la herramienta web_fetch y devuelve SOLO el texto de la publicación: cargo, empresa, ubicación, descripción, requisitos, beneficios y datos de contacto. Descarta menús, botones, pies de página, avisos de cookies y otras publicaciones relacionadas. No resumas ni interpretes: transcribe. Si la página no se puede leer o no es un aviso de trabajo, responde exactamente NO_SE_PUDO_LEER.',
      messages: [
        {
          role: 'user',
          content: `Lee este aviso de trabajo y devuélveme su texto: ${url}`,
        },
      ],
      // El básico basta para transcribir una página y funciona en más modelos
      // que las versiones con filtrado dinámico.
      tools: [{ type: 'web_fetch_20250910', name: 'web_fetch', max_uses: 3, max_content_tokens: 30000 }],
    });

    const text = message.content
      .filter((block): block is { type: 'text'; text: string; citations: null } => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    if (!text || text.includes('NO_SE_PUDO_LEER')) {
      throw new AiError(
        'No se pudo leer esa página. Muchos portales (LinkedIn entre ellos) cargan el aviso con JavaScript o piden sesión iniciada, y así no hay nada que leer. Abre el enlace y pega el texto.',
      );
    }
    return text;
  } catch (error) {
    if (error instanceof AiError) throw error;
    throw new AiError(await describeAiError(error));
  }
}
