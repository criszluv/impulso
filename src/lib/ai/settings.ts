/**
 * Configuración del asistente con IA.
 *
 * La clave vive en su propia entrada de localStorage, aparte del resto del
 * estado, por una razón concreta: la copia de seguridad que exportas desde
 * Ajustes no debe llevarla dentro. Si compartes ese archivo, no compartes tu
 * clave.
 */

export type AiModel = 'claude-opus-5' | 'claude-sonnet-5' | 'claude-haiku-4-5';

export interface AiSettings {
  apiKey: string;
  model: AiModel;
}

export const AI_MODELS: Array<{ id: AiModel; name: string; detail: string }> = [
  {
    id: 'claude-opus-5',
    name: 'Claude Opus 5',
    detail: 'El más preciso. Para un CV mal maquetado o con secciones raras, es el que menos se equivoca.',
  },
  {
    id: 'claude-sonnet-5',
    name: 'Claude Sonnet 5',
    detail: 'Bastante más barato y rápido. Suficiente para un CV ordenado.',
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    detail: 'El más económico. Sirve para leer avisos de trabajo, que son textos cortos.',
  },
];

const STORAGE_KEY = 'impulso.ai.v1';

export const emptyAiSettings: AiSettings = { apiKey: '', model: 'claude-opus-5' };

export function loadAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyAiSettings;
    const parsed = JSON.parse(raw) as Partial<AiSettings>;
    return {
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      model: AI_MODELS.some((m) => m.id === parsed.model) ? (parsed.model as AiModel) : 'claude-opus-5',
    };
  } catch {
    return emptyAiSettings;
  }
}

export function saveAiSettings(settings: AiSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Modo privado o cuota llena: queda solo en memoria.
  }
}

export function clearAiSettings() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nada que hacer.
  }
}

export function hasAiKey(settings: AiSettings): boolean {
  return settings.apiKey.trim().length > 10;
}
