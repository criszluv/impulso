export interface BulletSuggestion {
  text: string;
  note: string;
}

export interface BulletRewrite {
  options: BulletSuggestion[];
  /** Preguntas por los datos que faltan, en vez de inventar cifras. */
  missing: string[];
}

export type LetterTone = 'directo' | 'formal' | 'cercano' | 'breve';

export const LETTER_TONES: Array<{ id: LetterTone; name: string; detail: string }> = [
  {
    id: 'directo',
    name: 'Directo',
    detail: 'Al grano, sin rodeos. Funciona en tecnología, startups y comercio.',
  },
  {
    id: 'formal',
    name: 'Formal',
    detail: 'Trato de usted y estructura clásica. Para banca, sector público, salud o educación.',
  },
  {
    id: 'cercano',
    name: 'Cercano',
    detail:
      'Cordial y con algo de personalidad. Para equipos chicos y empresas con cultura informal.',
  },
  {
    id: 'breve',
    name: 'Muy breve',
    detail: 'Tres párrafos cortos. Para cuando la carta va en el cuerpo de un correo.',
  },
];

export interface LetterDraft {
  body: string;
  /** Huecos que la persona tiene que llenar, porque no se pueden inventar. */
  gaps: string[];
}
