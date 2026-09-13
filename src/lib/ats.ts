/**
 * Revisión contra las reglas de los filtros automáticos (ATS) según el
 * estándar vigente en 2026: una sola columna, encabezados estándar, orden
 * cronológico inverso, sin foto ni gráficos, y logros con cifras.
 *
 * Fuentes consultadas para armar estas reglas están citadas en el README.
 */
import type { CvConfig, Profile } from '../types';
import { cvStats } from './analysis';

export interface AtsCheck {
  id: string;
  label: string;
  ok: boolean;
  weight: number;
  detail: string;
}

export interface AtsReview {
  score: number;
  checks: AtsCheck[];
}

/** Plantillas de una sola columna, que es lo que los ATS parsean bien. */
export const SINGLE_COLUMN: CvConfig['template'][] = ['ats', 'clasico', 'compacto'];

export function atsReview(profile: Profile, cv: CvConfig): AtsReview {
  const stats = cvStats(profile);
  const p = profile.personal;
  const withDates = profile.experience.filter((e) => e.startDate).length;
  const metricRatio = stats.bullets ? stats.bulletsWithMetrics / stats.bullets : 0;

  const checks: AtsCheck[] = [
    {
      id: 'columna',
      label: 'Una sola columna',
      ok: SINGLE_COLUMN.includes(cv.template),
      weight: 3,
      detail:
        'Los lectores automáticos leen línea por línea de izquierda a derecha. Las dos columnas les hacen mezclar el contenido. Usa «ATS», «Clásico» o «Compacto».',
    },
    {
      id: 'foto',
      label: 'Sin foto',
      ok: !cv.showPhoto,
      weight: 2,
      detail:
        'Una imagen no aporta nada al parser y en varios países se descarta por sesgo. Deja la foto solo si postulas en mano o te la piden.',
    },
    {
      id: 'largo',
      label: 'Entre una y dos páginas',
      ok: stats.estimatedPages <= 2,
      weight: 2,
      detail:
        'Sobre dos páginas hay parsers que cortan el contenido y reclutadores que no llegan al final.',
    },
    {
      id: 'contacto',
      label: 'Correo y teléfono visibles',
      ok: Boolean(p.email && p.phone),
      weight: 3,
      detail:
        'Sin datos de contacto en el cuerpo del CV, la postulación queda huérfana. No los pongas en el encabezado del documento.',
    },
    {
      id: 'ciudad',
      label: 'Ciudad en el contacto',
      ok: Boolean(p.city),
      weight: 1,
      detail: 'Muchos filtros ordenan y descartan por ubicación antes de leer nada más.',
    },
    {
      id: 'titular',
      label: 'Titular con el cargo',
      ok: Boolean(p.headline),
      weight: 2,
      detail:
        'El cargo objetivo escrito tal como aparece en el aviso es una de las coincidencias que más puntúa.',
    },
    {
      id: 'habilidades',
      label: 'Sección de habilidades agrupada',
      ok: profile.skills.some((g) => g.items.length > 0),
      weight: 3,
      detail:
        'Es la zona donde el filtro concentra la búsqueda de palabras clave, y pesa más que la misma habilidad mencionada dentro de un logro. Agrúpalas por tipo.',
    },
    {
      id: 'fechas',
      label: 'Todos los cargos con fecha de inicio',
      ok: profile.experience.length > 0 && withDates === profile.experience.length,
      weight: 2,
      detail:
        'Un cargo sin fecha queda fuera del cálculo de años de experiencia que hace el filtro.',
    },
    {
      id: 'cifras',
      label: '70% o más de los logros con cifras',
      ok: stats.bullets > 0 && metricRatio >= 0.7,
      weight: 2,
      detail: `Vas en ${Math.round(metricRatio * 100)}%. Los logros con números puntúan más alto que las descripciones genéricas.`,
    },
    {
      id: 'resumen',
      label: 'Resumen profesional',
      ok: p.summary.trim().length > 80,
      weight: 1,
      detail:
        'Va justo después del contacto y es lo primero que se lee, tanto la máquina como la persona.',
    },
  ];

  const total = checks.reduce((sum, c) => sum + c.weight, 0);
  const got = checks.reduce((sum, c) => sum + (c.ok ? c.weight : 0), 0);
  return { score: Math.round((got / total) * 100), checks };
}

/** Prácticas que hoy penalizan en vez de ayudar. Es material de lectura, no un check. */
export const ATS_ANTIPATTERNS: Array<{ title: string; detail: string }> = [
  {
    title: 'Rellenar de palabras clave',
    detail:
      'Los sistemas actuales cruzan lo que declaras contra tu historial. Una habilidad que aparece suelta, sin ningún cargo que la respalde, resta en vez de sumar.',
  },
  {
    title: 'Texto blanco o invisible',
    detail:
      'Esconder palabras clave en blanco sobre blanco es lo primero que detectan los ATS grandes, y queda marcado como intento de fraude.',
  },
  {
    title: 'Tablas, iconos y gráficos',
    detail:
      'Todo lo que va dentro de una tabla o una imagen se pierde o se lee en desorden. Las barras de nivel («Excel 80%») no significan nada para el filtro: escribe «Excel avanzado».',
  },
  {
    title: 'Encabezados creativos',
    detail:
      '«Mi trayectoria» o «Lo que sé hacer» hacen que el parser no sepa dónde guardar el contenido. Usa Experiencia, Educación y Habilidades.',
  },
  {
    title: 'PDF exportado desde una herramienta de diseño',
    detail:
      'Los PDF de Canva o Figma suelen guardar el texto como trazos. Si no puedes seleccionar el texto con el mouse, el filtro tampoco puede leerlo.',
  },
];
