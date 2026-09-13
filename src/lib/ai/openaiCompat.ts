import { z } from 'zod';
import { AiError } from './errors';
import type { AiSettings } from './settings';

/**
 * Transporte para cualquier servidor que hable el formato de OpenAI: Ollama y
 * LM Studio en local, y Gemini, Groq, OpenRouter o Mistral en la nube.
 *
 * Se usa `fetch` a propósito y no un SDK: el formato es el mismo en todos y no
 * vale la pena sumar una dependencia por un único POST. Las llamadas a Claude
 * sí van por su SDK oficial, en client.ts.
 */

interface ChatChoice {
  message?: { content?: string | null; reasoning?: string | null };
}

interface ChatResponse {
  choices?: ChatChoice[];
  error?: { message?: string };
}

function isOllama(baseUrl: string): boolean {
  return /:11434(\/|$)/.test(baseUrl) || /ollama/i.test(baseUrl);
}

/** Los modelos pequeños envuelven el JSON en explicaciones o en ```json. */
function extractJson(raw: string): unknown {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try {
    return JSON.parse(text);
  } catch {
    // Nada: se intenta recortar entre la primera llave y la última.
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new AiError('El modelo no devolvió JSON. Prueba con un modelo más grande o con otro proveedor.');
  }
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new AiError('El JSON que devolvió el modelo venía incompleto o mal formado. Vuelve a intentar.');
  }
}

async function post(url: string, headers: Record<string, string>, body: unknown): Promise<Response> {
  try {
    return await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  } catch {
    throw new AiError(
      `No se pudo conectar con ${url}. Si es un servidor local, revisa que esté encendido; si es LM Studio, que tenga «Enable CORS» activado.`,
    );
  }
}

async function readError(response: Response): Promise<string> {
  let detail = '';
  try {
    const data = (await response.json()) as ChatResponse;
    detail = data.error?.message ?? '';
  } catch {
    detail = '';
  }
  if (response.status === 401 || response.status === 403) {
    return `La clave no es válida o no tiene permiso (${response.status}). ${detail}`.trim();
  }
  if (response.status === 404) {
    return `No existe ese modelo o esa dirección (404). Revisa el nombre del modelo. ${detail}`.trim();
  }
  if (response.status === 429) {
    return 'Llegaste al límite del plan gratuito. Espera un rato o cambia de proveedor.';
  }
  return `El servidor respondió ${response.status}. ${detail}`.trim();
}

/**
 * Pide una respuesta que cumpla el esquema. Primero con `json_schema`, que es
 * lo más fiable; si el servidor no lo soporta, reintenta pidiendo JSON a secas
 * y metiendo el esquema en el prompt.
 */
export async function callStructured(
  settings: AiSettings,
  schema: z.ZodType,
  system: string,
  user: string,
  maxTokens: number,
): Promise<unknown> {
  const base = settings.baseUrl.trim().replace(/\/$/, '');
  if (!base) throw new AiError('Falta la dirección del servidor en Ajustes.');

  const url = `${base}/chat/completions`;
  const jsonSchema = z.toJSONSchema(schema);

  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (settings.apiKey.trim()) headers.authorization = `Bearer ${settings.apiKey.trim()}`;
  if (/openrouter/i.test(base)) {
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'Impulso';
  }

  const baseBody: Record<string, unknown> = {
    model: settings.model.trim(),
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    stream: false,
    max_tokens: maxTokens,
    temperature: 0,
  };
  /*
   * Los modelos que razonan antes de responder se comen el presupuesto de
   * salida pensando y devuelven contenido vacío; medido en Ollama con un
   * modelo de 9B, apagarlo bajó una extracción de 15 s a 1 s con el mismo
   * resultado. Va solo en Ollama, que es donde está comprobado: otros
   * servidores rechazan el valor «none», y para eso está el reintento.
   */
  if (isOllama(base)) baseBody.reasoning_effort = 'none';

  let response = await post(url, headers, {
    ...baseBody,
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'resultado', strict: true, schema: jsonSchema },
    },
  });

  // Reintento sin nada opcional: hay servidores que no soportan json_schema y
  // otros que rechazan reasoning_effort. Se cae a JSON a secas con el esquema
  // dentro del prompt, que es el mínimo común denominador.
  if (response.status === 400 || response.status === 422) {
    const { reasoning_effort: _ignored, ...plain } = baseBody;
    response = await post(url, headers, {
      ...plain,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `${system}\n\nResponde ÚNICAMENTE con un objeto JSON que cumpla este esquema, sin texto alrededor:\n${JSON.stringify(jsonSchema)}`,
        },
        { role: 'user', content: user },
      ],
    });
  }

  if (!response.ok) throw new AiError(await readError(response));

  const data = (await response.json()) as ChatResponse;
  const message = data.choices?.[0]?.message;
  // Si el modelo razonó de más y dejó la respuesta vacía, el JSON a veces
  // quedó dentro del propio razonamiento; vale la pena mirar ahí antes de
  // rendirse.
  const content = message?.content?.trim() || message?.reasoning?.trim() || '';
  if (!content) {
    throw new AiError(
      'El modelo gastó todo su presupuesto razonando y no alcanzó a responder. Prueba con un modelo más grande, o con uno que no razone.',
    );
  }

  return extractJson(content);
}

/** Consulta mínima para confirmar que el servidor, el modelo y la clave sirven. */
export async function pingOpenAiCompat(settings: AiSettings): Promise<void> {
  const base = settings.baseUrl.trim().replace(/\/$/, '');
  if (!base) throw new AiError('Falta la dirección del servidor.');

  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (settings.apiKey.trim()) headers.authorization = `Bearer ${settings.apiKey.trim()}`;

  const body: Record<string, unknown> = {
    model: settings.model.trim(),
    messages: [{ role: 'user', content: 'Responde solo con la palabra: listo' }],
    max_tokens: 16,
    stream: false,
  };
  if (isOllama(base)) body.reasoning_effort = 'none';

  const response = await post(`${base}/chat/completions`, headers, body);
  if (!response.ok) throw new AiError(await readError(response));
}
