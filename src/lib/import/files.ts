/**
 * Extracción de texto plano desde los archivos que la gente ya tiene:
 * su CV en PDF o Word, o el ZIP que entrega LinkedIn al exportar los datos.
 * Todo ocurre en el navegador; ningún archivo se sube a ninguna parte.
 */

export type SourceKind = 'pdf' | 'docx' | 'txt' | 'zip' | 'csv' | 'json' | 'desconocido';

export function detectKind(file: File): SourceKind {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.docx')) return 'docx';
  if (name.endsWith('.zip')) return 'zip';
  if (name.endsWith('.csv')) return 'csv';
  if (name.endsWith('.json')) return 'json';
  if (name.endsWith('.txt') || name.endsWith('.md')) return 'txt';
  return 'desconocido';
}

/** Texto de un PDF, página por página, respetando los saltos de línea visuales. */
export async function pdfToText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const data = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data });
  const doc = await loadingTask.promise;
  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let text = '';
    let lastY: number | null = null;

    for (const item of content.items) {
      if (!('str' in item)) continue;
      const y = item.transform[5] as number;
      // Un cambio de altura mayor a 2pt es una línea nueva, no un espacio.
      if (lastY !== null && Math.abs(y - lastY) > 2) text += '\n';
      text += item.str;
      if (item.hasEOL) text += '\n';
      lastY = y;
    }
    pages.push(text);
  }

  await loadingTask.destroy();
  return pages.join('\n\n');
}

/** Texto de un .docx: es un zip con el documento en XML. */
export async function docxToText(file: File): Promise<string> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const xml = await zip.file('word/document.xml')?.async('string');
  if (!xml) throw new Error('El archivo .docx no tiene el contenido esperado.');

  return xml
    .replace(/<w:tab[^>]*\/>/g, ' ')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Los CSV que vienen dentro del ZIP de LinkedIn, por nombre de archivo. */
export async function zipToCsvMap(file: File): Promise<Record<string, string>> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const out: Record<string, string> = {};

  await Promise.all(
    Object.values(zip.files).map(async (entry) => {
      if (entry.dir || !entry.name.toLowerCase().endsWith('.csv')) return;
      const base = entry.name.split('/').pop() ?? entry.name;
      out[base.toLowerCase()] = await entry.async('string');
    }),
  );

  return out;
}

export function readAsText(file: File): Promise<string> {
  return file.text();
}

/**
 * Parser de CSV con comillas: los campos de LinkedIn traen comas y saltos de
 * línea dentro de las descripciones, así que un split simple no sirve.
 */
export function parseCsv(input: string): Array<Record<string, string>> {
  const text = input.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...body] = rows.filter((r) => r.some((c) => c.trim()));
  if (!header) return [];

  const keys = header.map((h) => h.trim());
  return body.map((cells) => {
    const obj: Record<string, string> = {};
    keys.forEach((key, i) => {
      obj[key] = (cells[i] ?? '').trim();
    });
    return obj;
  });
}
