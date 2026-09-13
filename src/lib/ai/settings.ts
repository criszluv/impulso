/**
 * Configuración del asistente con IA.
 *
 * La clave vive en su propia entrada de localStorage, aparte del resto del
 * estado, por una razón concreta: la copia de seguridad que exportas desde
 * Ajustes no debe llevarla dentro. Si compartes ese archivo, no compartes tu
 * clave.
 */

/**
 * Dos transportes: el SDK oficial de Anthropic, o cualquier servidor que hable
 * el formato de OpenAI, que a estas alturas es casi todo (Ollama, LM Studio,
 * Groq, Gemini, OpenRouter, Mistral).
 */
export type AiProvider = 'anthropic' | 'openai-compat';

export interface AiSettings {
  preset: string;
  provider: AiProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
  /**
   * Servicio externo que convierte una página en texto, para poder leer un
   * aviso desde su enlace sin Claude. Apagado por defecto: implica mandarle el
   * enlace a un tercero.
   */
  reader: 'ninguno' | 'jina';
}

export interface AiPreset {
  id: string;
  name: string;
  provider: AiProvider;
  baseUrl: string;
  defaultModel: string;
  /** 'no' = gratis de verdad, 'limite' = capa gratuita con tope, 'si' = se paga. */
  cost: 'no' | 'limite' | 'si';
  needsKey: boolean;
  keyUrl: string;
  detail: string;
  /** Aviso propio de este proveedor, si hay algo que la persona deba saber. */
  note?: string;
}

export const AI_PRESETS: AiPreset[] = [
  {
    id: 'ollama',
    name: 'Ollama (en tu computador)',
    provider: 'openai-compat',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: '',
    cost: 'no',
    needsKey: false,
    keyUrl: 'https://ollama.com/download',
    detail:
      'Gratis y sin límite, y el texto no sale de tu equipo. Necesitas instalar Ollama y descargar un modelo. Es más lento y menos preciso que los de pago, pero para probar va perfecto.',
    note: 'Un modelo de 7B a 9B anda bien para esto. Cuanto más grande, mejor lee, pero más demora.',
  },
  {
    id: 'lmstudio',
    name: 'LM Studio (en tu computador)',
    provider: 'openai-compat',
    baseUrl: 'http://localhost:1234/v1',
    defaultModel: '',
    cost: 'no',
    needsKey: false,
    keyUrl: 'https://lmstudio.ai',
    detail:
      'Igual que Ollama pero con interfaz gráfica. Levanta el servidor local desde la pestaña «Developer».',
    note: 'En LM Studio hay que activar «Enable CORS» en los ajustes del servidor; si no, el navegador bloquea la llamada.',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    provider: 'openai-compat',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.0-flash',
    cost: 'limite',
    needsKey: true,
    keyUrl: 'https://aistudio.google.com/apikey',
    detail:
      'Capa gratuita generosa y sin tarjeta. La clave se saca en Google AI Studio en un minuto.',
  },
  {
    id: 'groq',
    name: 'Groq',
    provider: 'openai-compat',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    cost: 'limite',
    needsKey: true,
    keyUrl: 'https://console.groq.com/keys',
    detail: 'Capa gratuita con tope diario y muy rápido. Corre modelos abiertos como Llama.',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    provider: 'openai-compat',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    cost: 'limite',
    needsKey: true,
    keyUrl: 'https://openrouter.ai/keys',
    detail: 'Un solo lugar para muchos modelos. Los que terminan en «:free» no cobran.',
  },
  {
    id: 'anthropic',
    name: 'Claude (Anthropic)',
    provider: 'anthropic',
    baseUrl: '',
    defaultModel: 'claude-opus-5',
    cost: 'si',
    needsKey: true,
    keyUrl: 'https://console.anthropic.com/settings/keys',
    detail:
      'El más preciso de todos, y el que menos se equivoca con un CV mal maquetado. Se paga por uso.',
  },
  {
    id: 'custom',
    name: 'Otro servidor compatible con OpenAI',
    provider: 'openai-compat',
    baseUrl: '',
    defaultModel: '',
    cost: 'si',
    needsKey: false,
    keyUrl: '',
    detail:
      'Cualquier servicio que exponga /chat/completions: Mistral, Together, DeepSeek, tu propio servidor.',
  },
];

/** Modelos sugeridos para el preset de Claude. */
export const CLAUDE_MODELS: Array<{ id: string; name: string; detail: string }> = [
  { id: 'claude-opus-5', name: 'Claude Opus 5', detail: 'El más preciso.' },
  { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', detail: 'Bastante más barato y rápido.' },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', detail: 'El más económico.' },
];

const STORAGE_KEY = 'impulso.ai.v1';

export const emptyAiSettings: AiSettings = {
  preset: '',
  provider: 'openai-compat',
  apiKey: '',
  model: '',
  baseUrl: '',
  reader: 'ninguno',
};

export function presetById(id: string): AiPreset | undefined {
  return AI_PRESETS.find((p) => p.id === id);
}

/** Los servidores locales no necesitan clave; los de la nube sí. */
export function isConfigured(settings: AiSettings): boolean {
  if (!settings.preset || !settings.model.trim()) return false;
  const preset = presetById(settings.preset);
  if (!preset) return false;
  if (preset.needsKey && settings.apiKey.trim().length < 10) return false;
  if (settings.provider === 'openai-compat' && !settings.baseUrl.trim()) return false;
  return true;
}

/** Nombre legible del proveedor activo, para mostrarlo junto a los resultados. */
export function describeSettings(settings: AiSettings): string {
  const preset = presetById(settings.preset);
  return preset ? `${preset.name} · ${settings.model}` : settings.model;
}

export function loadAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyAiSettings;
    const parsed = JSON.parse(raw) as Partial<AiSettings>;
    return {
      preset: typeof parsed.preset === 'string' ? parsed.preset : '',
      provider: parsed.provider === 'anthropic' ? 'anthropic' : 'openai-compat',
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      model: typeof parsed.model === 'string' ? parsed.model : '',
      baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : '',
      reader: parsed.reader === 'jina' ? 'jina' : 'ninguno',
    };
  } catch {
    return emptyAiSettings;
  }
}

export function saveAiSettings(settings: AiSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function clearAiSettings() {
  localStorage.removeItem(STORAGE_KEY);
}

/** Pregunta a un Ollama local qué modelos tiene descargados. */
export async function listOllamaModels(baseUrl: string): Promise<string[]> {
  const root = baseUrl.replace(/\/v1\/?$/, '');
  const response = await fetch(`${root}/api/tags`);
  if (!response.ok) throw new Error(`Ollama respondió ${response.status}`);
  const data = (await response.json()) as { models?: Array<{ name?: string }> };
  return (data.models ?? []).map((m) => m.name ?? '').filter(Boolean);
}

/** Claude trae fetch propio del lado del servidor; el resto necesita el lector externo. */
export function canReadLinks(settings: AiSettings): boolean {
  return (
    isConfigured(settings) && (settings.provider === 'anthropic' || settings.reader !== 'ninguno')
  );
}

/** De dónde saldría el texto de una página, para poder decírselo a la persona. */
export function readerName(settings: AiSettings): string {
  if (settings.provider === 'anthropic') return 'el servidor de Anthropic';
  if (settings.reader === 'jina') return 'r.jina.ai';
  return '';
}
