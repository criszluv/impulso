import type { CvFont } from '../types';

/** Tipografías que los lectores automáticos parsean sin romper palabras. */
export const FONT_STACKS: Record<CvFont, string> = {
  calibri: "Calibri, 'Segoe UI', Candara, Optima, sans-serif",
  arial: "Arial, Helvetica, 'Liberation Sans', sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
  times: "'Times New Roman', Times, 'Liberation Serif', serif",
};

export const FONT_LABELS: Record<CvFont, string> = {
  calibri: 'Calibri',
  arial: 'Arial',
  georgia: 'Georgia',
  times: 'Times New Roman',
};
