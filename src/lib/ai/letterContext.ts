import { z } from 'zod';

export const LetterParagraphsSchema = z.array(
  z.object({
    text: z.string().describe('Texto de un párrafo de la carta, listo para enviar.'),
    jobIds: z
      .array(z.string())
      .describe(
        'Identificadores J del aviso que aborda este párrafo. [] en saludo y cierre o sin aviso.',
      ),
    profileIds: z
      .array(z.string())
      .describe(
        'Identificadores P del perfil que respaldan los hechos de la persona en este párrafo. [] si no afirma hechos de la persona.',
      ),
  }),
);

export function letterSources(text: string, prefix: 'J' | 'P') {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text, index) => ({ id: prefix + (index + 1), text }));
}

export function letterBody(raw: unknown): string {
  if (!raw || typeof raw !== 'object') return '';
  const parsed = LetterParagraphsSchema.safeParse((raw as Record<string, unknown>).paragraphs);
  return parsed.success
    ? parsed.data
        .map((p) => p.text.trim())
        .filter(Boolean)
        .join('\n\n')
    : '';
}

/** Comprueba fuentes existentes; no certifica la veracidad semántica de cada afirmación. */
export function checkLetterReferences(raw: unknown, job: string, profile: string): boolean {
  if (!raw || typeof raw !== 'object') return false;
  const parsed = LetterParagraphsSchema.safeParse((raw as Record<string, unknown>).paragraphs);
  if (!parsed.success || !parsed.data.length || parsed.data.some((p) => !p.text.trim()))
    return false;
  const jobs = new Set(letterSources(job, 'J').map((s) => s.id));
  const facts = new Set(letterSources(profile, 'P').map((s) => s.id));
  return (
    (!jobs.size || parsed.data.some((p) => p.jobIds.length)) &&
    parsed.data.every(
      (p) => p.jobIds.every((id) => jobs.has(id)) && p.profileIds.every((id) => facts.has(id)),
    )
  );
}

export const LETTER_CONTEXT_RETRY =
  'La respuesta anterior no vinculó los párrafos con fuentes válidas. Redacta de nuevo usando paragraphs: cada elemento contiene text, jobIds y profileIds. Usa solo identificadores J del aviso y P del perfil recibidos. No atribuyas a la persona requisitos del aviso que el perfil no demuestra.';
