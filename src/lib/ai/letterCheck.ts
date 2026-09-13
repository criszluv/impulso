/**
 * Verificación de que lo devuelto es una carta y no una respuesta de chat.
 *
 * Es un modo de fallo real y bastante común: al modelo se le pide una carta y
 * contesta al usuario en vez de escribirla («Hola Cristóbal, he revisado tu
 * perfil… ¿te gustaría que redacte una carta?»). Cumple el esquema, así que la
 * validación de tipos lo deja pasar; hay que mirar el texto.
 */

interface Signal {
  re: RegExp;
  label: string;
}

const CHAT_SIGNALS: Signal[] = [
  { re: /¿[^?]{3,}\?/, label: 'hace preguntas' },
  { re: /\btu\s+(perfil|cv|curr[ií]cul\w*)\b/i, label: 'habla del perfil de quien lee' },
  { re: /\b(he revisado|veo que tienes|seg[uú]n tu perfil|revis[ée] tu)\b/i, label: 'comenta el perfil' },
  { re: /\b(te gustar[ií]a|quieres que|puedo redactar|puedo ayudarte|aqu[ií] tienes|necesito saber)\b/i, label: 'se ofrece a hacer algo' },
  { re: /^\s*\d+\.\s+\S/m, label: 'da una lista de pasos' },
  { re: /\b(para postular|pasos para|entra al sitio|rellena el formulario)\b/i, label: 'explica cómo postular' },
];

export interface LetterCheck {
  ok: boolean;
  reasons: string[];
}

/**
 * Devuelve ok:false cuando el texto parece una respuesta de asistente. Se pide
 * más de una señal porque cualquiera suelta puede aparecer en una carta legítima.
 */
export function checkLetter(body: string, candidateName: string): LetterCheck {
  const text = body.trim();
  const reasons: string[] = [];

  for (const signal of CHAT_SIGNALS) {
    if (signal.re.test(text)) reasons.push(signal.label);
  }

  // Saludar a la propia persona por su nombre es señal inequívoca: la carta va
  // dirigida a quien contrata, no a quien la firma.
  const firstName = candidateName.trim().split(/\s+/)[0];
  if (firstName && firstName.length > 2) {
    const greeting = new RegExp(`^\\s*(hola|estimad[oa]|querid[oa])[\\s,]+${firstName}\\b`, 'i');
    if (greeting.test(text)) {
      reasons.push('saluda a quien firma la carta en vez de a la empresa');
      reasons.push('destinatario equivocado');
    }
  }

  return { ok: reasons.length < 2, reasons: [...new Set(reasons)] };
}

/** Refuerzo para el segundo intento, cuando el primero salió en modo chat. */
export const LETTER_RETRY_NOTE = `IMPORTANTE: tu respuesta anterior no sirvió porque respondiste como asistente en vez de escribir el documento.

En «body» va EXCLUSIVAMENTE el texto de la carta, tal como se enviaría a la empresa:
- Empieza con el saludo a la empresa o a la persona que contrata. NUNCA saludes a quien firma la carta.
- No hagas preguntas. No ofrezcas ayuda. No des instrucciones de cómo postular. No comentes el perfil.
- Termina con la firma: el nombre de quien postula.`;

/** Señales de que la página leída era un listado y no un aviso concreto. */
export function looksLikeJobList(text: string): boolean {
  const applyLinks = (text.match(/\b(postular|postúlate|ver oferta|apply now|ver empleo)\b/gi) ?? []).length;
  const daysAgo = (text.match(/\bhace\s+\d+\s+(d[ií]as?|horas?|semanas?)\b/gi) ?? []).length;
  return applyLinks >= 6 || daysAgo >= 6;
}
