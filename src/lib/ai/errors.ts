/**
 * Error del asistente con IA, en su propio módulo para que las páginas puedan
 * atraparlo sin arrastrar el SDK ni zod al bundle inicial.
 */
export class AiError extends Error {}
