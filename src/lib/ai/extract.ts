import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { LanguageLevel } from '../../types';
import { uid } from '../utils';
import { emptyParsed } from '../import/parseCv';
import type { ParsedCv } from '../import/parseCv';
import type { ParsedJob } from '../import/parseJob';
import { sourceFromUrl } from '../import/parseJob';
import { createClient, describeAiError } from './client';
import { AiError } from './errors';
import type { AiSettings } from './settings';

const MONTH = 'Mes en formato AAAA-MM. Cadena vacía si el texto no lo dice.';

const ExperienceSchema = z.object({
  role: z.string().describe('Cargo tal como aparece en el documento.'),
  company: z.string().describe('Nombre de la empresa u organización.'),
  location: z.string().describe('Ciudad y modalidad si aparecen. Cadena vacía si no.'),
  startDate: z.string().describe(MONTH),
  endDate: z.string().describe(`${MONTH} Vacía si el cargo sigue vigente.`),
  current: z.boolean().describe('true si dice «actualidad», «presente» o equivalente.'),
  bullets: z
    .array(z.string())
    .describe(
      'Logros y responsabilidades, uno por elemento, copiados literalmente. No los reescribas ni los resumas.',
    ),
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
        name: z.string().describe('Nombre de la categoría, por ejemplo «Herramientas» o «Idiomas técnicos».'),
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
      'Avisos breves en español para la persona: datos ambiguos, secciones que no pudiste interpretar o campos que conviene revisar. Lista vacía si todo quedó claro.',
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

type CvResult = z.infer<typeof CvSchema>;

function toParsed(data: CvResult): ParsedCv {
  const result = emptyParsed();

  result.personal = {
    fullName: data.fullName,
    headline: data.headline,
    email: data.email,
    phone: data.phone,
    city: data.city,
    country: data.country,
    linkedin: data.linkedin,
    github: data.github,
    website: data.website,
    summary: data.summary,
  };

  result.experience = data.experience.map((e) => ({ ...e, id: uid('exp') }));
  result.education = data.education.map((e) => ({ ...e, id: uid('edu') }));
  result.skills = data.skillGroups
    .filter((g) => g.items.length)
    .map((g) => ({ ...g, id: uid('sk') }));
  result.languages = data.languages.map((l) => ({
    id: uid('lang'),
    name: l.name,
    level: l.level as LanguageLevel,
  }));
  result.projects = data.projects.map((p) => ({ ...p, id: uid('prj') }));
  result.certifications = data.certifications.map((c) => ({ ...c, id: uid('cert') }));
  result.notes = data.warnings;

  return result;
}

/** Lee un CV con Claude y devuelve la misma estructura que el lector local. */
export async function extractCvWithAi(text: string, settings: AiSettings): Promise<ParsedCv> {
  try {
    const client = await createClient(settings);
    const message = await client.beta.messages.parse({
      model: settings.model,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: CV_SYSTEM,
      messages: [{ role: 'user', content: `Extrae los datos de este CV:\n\n${text}` }],
      output_config: { format: zodOutputFormat(CvSchema) },
    });

    if (message.stop_reason === 'refusal') {
      throw new AiError('El modelo declinó procesar este documento. Usa el lector sin IA.');
    }
    if (!message.parsed_output) {
      throw new AiError('La respuesta no vino en el formato esperado. Vuelve a intentar.');
    }

    const parsed = toParsed(message.parsed_output);
    parsed.notes.unshift(`Leído con ${settings.model}. Revisa igual: la IA también se equivoca.`);
    return parsed;
  } catch (error) {
    if (error instanceof AiError) throw error;
    throw new AiError(await describeAiError(error));
  }
}

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

/** Lee un aviso de trabajo con Claude. */
export async function extractJobWithAi(
  text: string,
  url: string,
  settings: AiSettings,
): Promise<ParsedJob & { contact: string }> {
  try {
    const client = await createClient(settings);
    const message = await client.beta.messages.parse({
      model: settings.model,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: JOB_SYSTEM,
      messages: [{ role: 'user', content: `Extrae los datos de este aviso:\n\n${text}` }],
      output_config: { format: zodOutputFormat(JobSchema) },
    });

    if (message.stop_reason === 'refusal') {
      throw new AiError('El modelo declinó procesar este aviso. Usa el lector sin IA.');
    }
    if (!message.parsed_output) {
      throw new AiError('La respuesta no vino en el formato esperado. Vuelve a intentar.');
    }

    const data = message.parsed_output;
    return {
      role: data.role,
      company: data.company,
      location: data.location,
      salary: data.salary,
      contact: data.contact,
      source: sourceFromUrl(url),
      notes: data.notes,
    };
  } catch (error) {
    if (error instanceof AiError) throw error;
    throw new AiError(await describeAiError(error));
  }
}

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
    .describe(
      'Datos que le faltan a la persona para que el logro quede sólido, formulados como preguntas cortas. Lista vacía si no falta nada.',
    ),
});

const BULLET_SYSTEM = `Reescribes logros de currículum en español de Chile, siguiendo las reglas de redacción de CV: verbo de acción en pasado al inicio, qué hiciste, cómo, y el resultado medible.

Reglas estrictas:
- No inventes cifras, empresas, tecnologías ni resultados. Solo puedes usar lo que aparece en el texto original y en el contexto del cargo.
- Si al logro le falta una cifra y no tienes el dato, NO la inventes: deja el logro sin número y anota la pregunta en «missing».
- Nada de adjetivos de relleno («proactivo», «orientado a resultados»).
- Cada versión entre 90 y 200 caracteres.
- Las tres versiones deben ser genuinamente distintas en enfoque, no la misma frase con sinónimos.`;

export interface BulletSuggestion {
  text: string;
  note: string;
}

export interface BulletRewrite {
  options: BulletSuggestion[];
  missing: string[];
}

/** Propone tres reescrituras de un logro, sin inventar datos. */
export async function rewriteBulletWithAi(
  bullet: string,
  context: { role: string; company: string },
  settings: AiSettings,
): Promise<BulletRewrite> {
  try {
    const client = await createClient(settings);
    const message = await client.beta.messages.parse({
      model: settings.model,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: BULLET_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Cargo: ${context.role || 'sin especificar'}\nEmpresa: ${context.company || 'sin especificar'}\n\nLogro a mejorar:\n${bullet}`,
        },
      ],
      output_config: { format: zodOutputFormat(BulletSchema) },
    });

    if (message.stop_reason === 'refusal' || !message.parsed_output) {
      throw new AiError('No se pudo generar la reescritura. Vuelve a intentar.');
    }
    return message.parsed_output;
  } catch (error) {
    if (error instanceof AiError) throw error;
    throw new AiError(await describeAiError(error));
  }
}
