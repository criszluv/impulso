/**
 * Lectura de un aviso de trabajo pegado.
 *
 * Una app que corre solo en el navegador no puede abrir el enlace por ti: los
 * portales bloquean las peticiones desde otros sitios (CORS), y usar un proxy
 * externo significaría mandar tu actividad a un tercero. Así que el enlace se
 * guarda para abrirlo con un clic, y el texto lo pegas tú. Lo que sí hace la
 * app es leer ese texto y rellenar los campos.
 */
import { normalize } from '../text';

export interface ParsedJob {
  role: string;
  company: string;
  location: string;
  salary: string;
  source: string;
  notes: string[];
}

const PORTALS: Array<{ match: RegExp; name: string }> = [
  { match: /linkedin\./i, name: 'LinkedIn' },
  { match: /getonbrd|getonboard/i, name: 'Get on Board' },
  { match: /computrabajo/i, name: 'Computrabajo' },
  { match: /laborum/i, name: 'Laborum' },
  { match: /trabajando\./i, name: 'Trabajando.com' },
  { match: /chiletrabajos/i, name: 'Chiletrabajos' },
  { match: /indeed\./i, name: 'Indeed' },
  { match: /glassdoor/i, name: 'Glassdoor' },
  { match: /bne\.cl|empleo\.gob/i, name: 'Bolsa Nacional de Empleo' },
  { match: /occ\.com/i, name: 'OCC' },
  { match: /bumeran/i, name: 'Bumeran' },
  { match: /remoteok|weworkremotely|remotive/i, name: 'Portal de empleo remoto' },
];

/** Nombre legible del portal a partir del enlace. */
export function sourceFromUrl(url: string): string {
  if (!url.trim()) return '';
  for (const portal of PORTALS) {
    if (portal.match.test(url)) return portal.name;
  }
  try {
    const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    return host.replace(/^www\./, '');
  } catch {
    return '';
  }
}

const MODALITY = /\b(remoto|teletrabajo|h[ií]brido|presencial|remote|hybrid|on-?site)\b/i;
const CITIES = [
  'santiago', 'osorno', 'valdivia', 'puerto montt', 'temuco', 'concepcion', 'valparaiso',
  'viña del mar', 'vina del mar', 'antofagasta', 'la serena', 'rancagua', 'talca', 'iquique',
  'arica', 'chillan', 'punta arenas', 'coquimbo', 'calama', 'copiapo', 'los angeles', 'curico',
];

const SALARY_RE =
  /((?:\$|CLP|USD|UF)\s?[\d.,]{3,}(?:\s*(?:-|a|hasta)\s*(?:\$|CLP|USD|UF)?\s?[\d.,]{3,})?|[\d.]{7,}\s*(?:-|a)\s*[\d.]{7,})/i;

type TextField = 'role' | 'company' | 'location' | 'salary';

const LABELLED: Array<{ key: TextField; labels: string[] }> = [
  { key: 'role', labels: ['cargo', 'puesto', 'posicion', 'posición', 'titulo del cargo', 'job title', 'position', 'vacante'] },
  { key: 'company', labels: ['empresa', 'compania', 'compañia', 'compañía', 'organizacion', 'organización', 'company', 'employer', 'contratante'] },
  { key: 'location', labels: ['ubicacion', 'ubicación', 'lugar', 'localidad', 'ciudad', 'location', 'modalidad', 'jornada y lugar'] },
  { key: 'salary', labels: ['sueldo', 'renta', 'salario', 'remuneracion', 'remuneración', 'banda salarial', 'salary', 'compensation'] },
];

function looksLikeNoise(line: string): boolean {
  const flat = normalize(line);
  return (
    flat.length < 3 ||
    flat.length > 110 ||
    /^(inicia sesion|iniciar sesion|postular|guardar|compartir|cookies|aceptar|menu|buscar|inicio|volver|siguiente|anterior|ver mas|mostrar mas)$/.test(flat)
  );
}

/**
 * Extrae los campos de la ficha a partir del texto del aviso. Es un apoyo para
 * no tipear: lo detectado se muestra en el formulario para corregirlo.
 */
export function parseJobPosting(text: string, url = ''): ParsedJob {
  const result: ParsedJob = { role: '', company: '', location: '', salary: '', source: sourceFromUrl(url), notes: [] };
  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lines.length) {
    result.notes.push('No pegaste texto del aviso.');
    return result;
  }

  // 1. Campos con etiqueta explícita ("Empresa: Acme").
  for (const line of lines) {
    const labelled = line.match(/^([^:]{3,28}):\s*(.{2,90})$/);
    if (!labelled) continue;
    const label = normalize(labelled[1]).trim();
    const value = labelled[2].trim();
    for (const entry of LABELLED) {
      if (entry.labels.includes(label) && !result[entry.key]) {
        result[entry.key] = value;
      }
    }
  }

  // 2. El título del aviso suele ser la primera línea con peso.
  if (!result.role) {
    const title = lines.find((l) => !looksLikeNoise(l) && !/^(inicio|empleos|trabajos)$/i.test(l));
    if (title) {
      const at = title.split(/\s+(?:en|at|-|·|\|)\s+/);
      result.role = at[0].trim();
      if (at.length > 1 && !result.company) result.company = at[1].trim();
    }
  }

  // 3. Empresa: patrón "<cargo> en <Empresa>" en las primeras líneas.
  if (!result.company) {
    for (const line of lines.slice(0, 12)) {
      const m = line.match(/\b(?:en|at)\s+([A-ZÁÉÍÓÚÑ][\w&.\-' ]{2,40})$/);
      if (m) {
        result.company = m[1].trim();
        break;
      }
    }
  }

  // 4. Ubicación y modalidad.
  if (!result.location) {
    const modality = text.match(MODALITY)?.[0];
    const cityLine = lines.slice(0, 20).find((l) => {
      const flat = normalize(l);
      return l.length < 60 && CITIES.some((c) => flat.includes(c));
    });
    const city = cityLine
      ? cityLine
          .split(/[·|,]/)
          .map((p) => p.trim())
          .find((p) => CITIES.some((c) => normalize(p).includes(c)))
      : '';
    result.location = [city, modality].filter(Boolean).join(' · ');
  }

  // 5. Sueldo.
  if (!result.salary) {
    const near = lines.find((l) => /(sueldo|renta|salario|remunerac|salary|banda)/i.test(l) && SALARY_RE.test(l));
    const match = (near ?? text).match(SALARY_RE);
    if (match) result.salary = match[1].trim();
  }

  const missing = (['role', 'company'] as const).filter((k) => !result[k]);
  if (missing.length) {
    result.notes.push(
      `No reconocí ${missing.map((m) => (m === 'role' ? 'el cargo' : 'la empresa')).join(' ni ')}. Complétalo a mano.`,
    );
  }
  if (text.trim().length < 200) {
    result.notes.push('El texto es muy corto: pega el aviso completo para que el comparador con tu CV sirva.');
  }

  return result;
}
