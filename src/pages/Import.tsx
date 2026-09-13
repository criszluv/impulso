import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, ArrowRight } from 'lucide-react';
import { useApp } from '../state/context';
import { pdfToText, docxToText, zipToCsvMap, detectKind } from '../lib/import/files';
import { parseCvText } from '../lib/import/parseCv';
import type { ParsedCv } from '../lib/import/parseCv';
import { parseLinkedInCsvs } from '../lib/import/linkedin';
import { applyParsed, SECTION_LABELS, countOf } from '../lib/import/apply';
import type { SectionKey, ImportMode } from '../lib/import/apply';
import { isConfigured } from '../lib/ai/settings';
import { Button, TextArea, Select, Toggle } from '../components/ui';

const sections: SectionKey[] = [
  'personal',
  'experience',
  'education',
  'skills',
  'languages',
  'projects',
  'certifications',
];
export function ImportPage() {
  const { state, replaceAll, ai } = useApp(),
    nav = useNavigate(),
    input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [parsed, setParsed] = useState<ParsedCv | null>(null),
    [include, setInclude] = useState(new Set(sections)),
    [mode, setMode] = useState<ImportMode>('agregar'),
    [useAi, setUseAi] = useState(false);
  const read = async (value: string) => {
    if (!value.trim())
      throw new Error(
        'No encontramos texto. Si es una foto o un escaneo, puedes escribir tus datos con la guía paso a paso.',
      );
    if (useAi && isConfigured(ai)) {
      const { extractCvWithAi } = await import('../lib/ai/extract');
      return await extractCvWithAi(value, ai);
    }
    return parseCvText(value);
  };
  const fileRead = async (file: File) => {
    setBusy(true);
    setError('');
    setParsed(null);
    try {
      if (file.size > 15 * 1024 * 1024)
        throw new Error('El archivo es demasiado grande. Prueba uno de menos de 15 MB.');
      const kind = detectKind(file);
      if (kind === 'json') {
        nav('/ajustes');
        return;
      }
      if (kind === 'zip') {
        setParsed(parseLinkedInCsvs(await zipToCsvMap(file)));
        return;
      }
      const content =
        kind === 'pdf'
          ? await pdfToText(file)
          : kind === 'docx'
            ? await docxToText(file)
            : kind === 'txt'
              ? await file.text()
              : null;
      if (content === null)
        throw new Error(
          'Elige un PDF, Word (.docx) o archivo de texto. Los archivos .doc antiguos deben guardarse primero como .docx.',
        );
      setParsed(await read(content));
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No pudimos leer el archivo. Puedes usar la guía paso a paso.',
      );
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };
  const hasData = parsed && sections.some((k) => countOf(parsed, k) > 0);
  return (
    <div className="narrow-page">
      <Link to="/cv" className="text-link">
        <ArrowLeft size={17} />
        Volver a mi currículum
      </Link>
      <div className="page-head">
        <div>
          <span className="eyebrow">Aprovecha lo que ya tienes</span>
          <h1>Trae tu currículum.</h1>
          <p>Leemos el archivo, te mostramos lo que encontramos y tú decides qué guardar.</p>
        </div>
      </div>
      <section className="upload-zone">
        <FileText size={42} />
        <h2>Elige tu archivo</h2>
        <p>PDF, Word (.docx) o texto · Hasta 15 MB</p>
        <input
          ref={input}
          type="file"
          accept=".pdf,.docx,.txt,.zip"
          hidden
          aria-label="Seleccionar currículum"
          onChange={(e) => {
            if (e.target.files?.[0]) void fileRead(e.target.files[0]);
          }}
        />
        <Button variant="primary" disabled={busy} onClick={() => input.current?.click()}>
          <Upload size={18} />
          {busy ? 'Leyendo tu archivo…' : 'Buscar archivo en mi equipo'}
        </Button>
        <span className="field-hint">También puedes buscarlo en la carpeta Descargas.</span>
      </section>
      {isConfigured(ai) && (
        <details>
          <summary>Usar mi asistente opcional</summary>
          <p>
            Al activarlo, el texto del archivo o el texto pegado se envía al servicio que
            configuraste. Puedes dejarlo desactivado para leerlo solo en este navegador.
          </p>
          <Toggle
            label="Enviar el texto al asistente para leerlo"
            checked={useAi}
            onChange={setUseAi}
          />
        </details>
      )}
      <details>
        <summary>Prefiero copiar y pegar el texto</summary>
        <TextArea
          label="El contenido de mi currículum"
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tu nombre, contacto, trabajos anteriores, estudios…"
        />
        <Button
          disabled={!text.trim() || busy}
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              setParsed(await read(text));
            } catch (e) {
              setError(e instanceof Error ? e.message : 'No pudimos leer el texto.');
            } finally {
              setBusy(false);
            }
          }}
        >
          Leer este texto
        </Button>
      </details>
      <details>
        <summary>Tengo una copia de datos de LinkedIn</summary>
        <p>
          Puedes elegir el archivo ZIP que descargaste desde LinkedIn usando el botón de arriba. Si
          no tienes esa copia, también puedes pegar el texto de tu perfil.
        </p>
      </details>
      {busy && (
        <p role="status">
          Estamos leyendo. Tus datos actuales no se modificarán hasta que confirmes.
        </p>
      )}
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      {parsed && !hasData && (
        <p role="status" className="notice">
          No pudimos reconocer los datos. Puedes probar pegando el texto o{' '}
          <Link to="/empezar">responder las preguntas de la guía</Link>.
        </p>
      )}
      {parsed && hasData && (
        <section className="form-sheet">
          <span className="eyebrow">Revisa antes de guardar</span>
          <h2>Esto es lo que encontramos.</h2>
          <p>
            {parsed.personal.fullName || 'No reconocimos el nombre'} ·{' '}
            {parsed.personal.headline || 'Trabajo sin identificar'}
          </p>
          <p className="field-hint">
            La lectura puede equivocarse. Después podrás corregir cada dato.
          </p>
          <div className="stack">
            {sections
              .filter((k) => countOf(parsed, k) > 0)
              .map((k) => (
                <label className="import-section" key={k}>
                  <input
                    type="checkbox"
                    checked={include.has(k)}
                    onChange={() =>
                      setInclude((prev) => {
                        const n = new Set(prev);
                        if (n.has(k)) n.delete(k);
                        else n.add(k);
                        return n;
                      })
                    }
                  />
                  <span>
                    <strong>{SECTION_LABELS[k]}</strong>
                    <small>
                      {k === 'personal'
                        ? Object.values(parsed.personal).filter(Boolean).join(' · ')
                        : parsed[k]
                            .map((v) =>
                              'role' in v
                                ? v.role
                                : 'degree' in v
                                  ? v.degree
                                  : 'name' in v
                                    ? v.name
                                    : '',
                            )
                            .filter(Boolean)
                            .join(' · ')}
                    </small>
                  </span>
                  <span>{countOf(parsed, k)}</span>
                </label>
              ))}
          </div>
          {!!state.profile.personal.fullName && (
            <Select
              label="¿Qué hacer con los datos que ya tienes?"
              value={mode}
              onChange={(e) => setMode(e.target.value as ImportMode)}
            >
              <option value="agregar">Conservar mis datos y agregar lo nuevo</option>
              <option value="reemplazar">Reemplazar las secciones seleccionadas</option>
            </Select>
          )}
          {parsed.notes.length > 0 && (
            <details>
              <summary>Observaciones de la lectura</summary>
              {parsed.notes.map((n, i) => (
                <p key={i}>{n}</p>
              ))}
            </details>
          )}
          <Button
            variant="primary"
            disabled={!sections.some((k) => include.has(k) && countOf(parsed, k) > 0)}
            onClick={() => {
              replaceAll(applyParsed(state, parsed, mode, include));
              nav('/perfil');
            }}
          >
            Guardar y revisar mis datos
            <ArrowRight size={18} />
          </Button>
        </section>
      )}
      <p className="gentle-note">
        ¿No tienes un archivo?{' '}
        <Link to="/empezar" className="text-link">
          Podemos empezar desde cero
          <ArrowRight size={17} />
        </Link>
      </p>
    </div>
  );
}
