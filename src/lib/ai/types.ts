export interface BulletSuggestion {
  text: string;
  note: string;
}

export interface BulletRewrite {
  options: BulletSuggestion[];
  /** Preguntas por los datos que faltan, en vez de inventar cifras. */
  missing: string[];
}
