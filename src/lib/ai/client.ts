import type { AiSettings } from './settings';

/**
 * Cliente de la API de Claude apuntando directo desde el navegador.
 *
 * `dangerouslyAllowBrowser` está puesto a conciencia: esta app no tiene
 * servidor, así que la llamada sale del navegador con la clave del propio
 * usuario. Es aceptable porque cada persona pone su clave y nadie más la ve;
 * no lo sería en una app con backend, donde la clave debe quedarse allá.
 *
 * El SDK se importa de forma dinámica para que no pese en el arranque de quien
 * nunca activa la IA.
 */
export async function createClient(settings: AiSettings) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  return new Anthropic({
    apiKey: settings.apiKey.trim(),
    dangerouslyAllowBrowser: true,
    maxRetries: 2,
  });
}

/** Traduce los errores del SDK a algo que se pueda leer en pantalla. */
export async function describeAiError(error: unknown): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');

  if (error instanceof Anthropic.AuthenticationError) {
    return 'La clave no es válida o fue revocada. Revísala en console.anthropic.com.';
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return 'La clave no tiene permiso para usar este modelo. Prueba con otro modelo o revisa tu plan.';
  }
  if (error instanceof Anthropic.RateLimitError) {
    return 'Llegaste al límite de peticiones. Espera un minuto y vuelve a intentar.';
  }
  if (error instanceof Anthropic.BadRequestError) {
    return `La petición fue rechazada: ${error.message}`;
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return 'No se pudo conectar con la API. Revisa tu conexión a internet.';
  }
  if (error instanceof Anthropic.APIError) {
    return `Error de la API (${error.status ?? 'sin código'}): ${error.message}`;
  }
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}

/** Consulta mínima para confirmar que la clave y el modelo funcionan. */
export async function testConnection(settings: AiSettings): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const client = await createClient(settings);
    await client.messages.create({
      model: settings.model,
      max_tokens: 16,
      messages: [{ role: 'user', content: 'Responde solo con la palabra: listo' }],
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, message: await describeAiError(error) };
  }
}
