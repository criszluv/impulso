import { AiError } from './errors';
import type { AiSettings } from './settings';

/**
 * Obtener el texto de una página desde el navegador.
 *
 * El navegador no puede hacerlo por su cuenta: los portales bloquean las
 * peticiones desde otro origen. Quedan dos caminos, y los dos implican que
 * alguien más vea el enlace:
 *
 * 1. Claude, que trae una herramienta de fetch del lado del servidor. El
 *    enlace no sale de la conversación con Anthropic, que ya es el proveedor
 *    elegido, así que no suma un tercero.
 * 2. Un lector externo, para el resto de los proveedores. Suma un tercero que
 *    ve a qué estás postulando, por eso viene apagado y hay que encenderlo a
 *    mano en Ajustes.
 */

/** Tope de texto que se guarda de una página, para no ahogar a un modelo chico. */
const MAX_CHARS = 14000;

/**
 * Limpieza del markdown que devuelve el lector.
 *
 * No es cosmética. Una página de portal de empleo llega con menús, avisos de
 * cookies, publicidad y cada enlace con su URL completa entre paréntesis. En un
 * aviso real de Chiletrabajos eso era el 66% del texto, y el aviso de verdad
 * quedaba fuera al recortar: el modelo no veía la oferta y respondía cualquier
 * cosa.
 */
export function cleanPageMarkdown(markdown: string): string {
  let text = markdown;
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, ''); // imágenes
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1'); // enlaces: se queda el texto
  text = text.replace(/^\s*(PUBLICIDAD|ADVERTISEMENT|×)\s*$/gim, '');

  const out: string[] = [];
  const seen = new Set<string>();

  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/^\s*[*\-+]\s*/, '').trim();
    if (!line) {
      if (out.length && out[out.length - 1] !== '') out.push('');
      continue;
    }
    // Las barras de navegación vienen repetidas (escritorio y móvil). Se
    // descartan las líneas cortas ya vistas; las largas pueden ser contenido
    // legítimo que casualmente se repite.
    const key = line.toLowerCase();
    if (line.length < 40 && seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }

  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function trim(text: string): string {
  const clean = cleanPageMarkdown(text);
  return clean.length > MAX_CHARS ? `${clean.slice(0, MAX_CHARS)}\n\n[…texto recortado…]` : clean;
}

function normalizeUrl(raw: string): string {
  const value = raw.trim();
  if (!value) throw new AiError('Falta el enlace.');
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(withProtocol).toString();
  } catch {
    throw new AiError('Ese enlace no tiene un formato válido.');
  }
}

const NOT_READABLE =
  'No se pudo leer esa página. Muchos portales cargan el aviso con JavaScript o piden sesión iniciada —LinkedIn entre ellos—, y así no queda nada que leer. Abre el enlace y pega el texto.';

/** Lector externo: convierte la página en texto y la devuelve como markdown. */
async function viaJina(url: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`https://r.jina.ai/${url}`, { headers: { accept: 'text/plain' } });
  } catch {
    throw new AiError('No se pudo contactar al lector de páginas. Revisa tu conexión.');
  }
  if (!response.ok) {
    throw new AiError(
      response.status === 429
        ? 'El lector de páginas está saturado. Espera un momento o pega el texto del aviso.'
        : `${NOT_READABLE} (el lector respondió ${response.status})`,
    );
  }
  const text = await response.text();
  if (text.replace(/\s/g, '').length < 200) throw new AiError(NOT_READABLE);
  return trim(text);
}

/** Fetch del lado del servidor de Anthropic, sin terceros de por medio. */
async function viaClaude(url: string, settings: AiSettings): Promise<string> {
  const { createClient, describeAiError } = await import('./client');
  try {
    const client = await createClient(settings);
    const message = await client.messages.create({
      model: settings.model,
      max_tokens: 8000,
      system:
        'Recibes el enlace de una página. Úsalo con la herramienta web_fetch y devuelve SOLO su contenido en texto plano. Descarta menús, botones, pies de página, avisos de cookies y contenidos relacionados que no sean la publicación principal. No resumas ni interpretes: transcribe. Si la página no se puede leer, responde exactamente NO_SE_PUDO_LEER.',
      messages: [{ role: 'user', content: `Léeme el contenido de esta página: ${url}` }],
      // La versión básica basta para transcribir y funciona en más modelos que
      // las que traen filtrado dinámico.
      tools: [
        { type: 'web_fetch_20250910', name: 'web_fetch', max_uses: 3, max_content_tokens: 30000 },
      ],
    });

    const text = message.content
      .filter((block) => block.type === 'text')
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('\n')
      .trim();

    if (!text || text.includes('NO_SE_PUDO_LEER')) throw new AiError(NOT_READABLE);
    return trim(text);
  } catch (error) {
    if (error instanceof AiError) throw error;
    throw new AiError(await describeAiError(error));
  }
}

/** Texto de una página, por la vía que corresponda según la configuración. */
export async function fetchPageText(rawUrl: string, settings: AiSettings): Promise<string> {
  const url = normalizeUrl(rawUrl);
  if (settings.provider === 'anthropic') return viaClaude(url, settings);
  if (settings.reader === 'jina') return viaJina(url);
  throw new AiError(
    'Leer desde un enlace necesita Claude, o activar el lector de páginas en Ajustes. Mientras tanto, pega el texto.',
  );
}
