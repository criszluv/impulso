import { z } from 'zod';
import type { ParsedCv } from '../import/parseCv';
import type { ParsedJob } from '../import/parseJob';
import { sourceFromUrl } from '../import/parseJob';
import { AiError } from './errors';
import { coerceCv, coerceJob, coerceRewrite } from './coerce';
import { callStructured } from './openaiCompat';
import { describeSettings } from './settings';
import type { AiSettings } from './settings';
import type { BulletRewrite } from './types';

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
