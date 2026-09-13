import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../state/context';
import type { AppState } from '../types';
import { initialState } from '../lib/defaults';
import { detectKind, docxToText, pdfToText, zipToCsvMap } from '../lib/import/files';
import { parseCvText } from '../lib/import/parseCv';
import type { ParsedCv } from '../lib/import/parseCv';
import { parseLinkedInCsvs } from '../lib/import/linkedin';
import { SECTION_LABELS, applyParsed, countOf } from '../lib/import/apply';
import type { ImportMode, SectionKey } from '../lib/import/apply';
import { hasAiKey } from '../lib/ai/settings';
import { AiError } from '../lib/ai/errors';
import { formatRange } from '../lib/utils';
import { Badge, Button, Card, Empty, Select, TextArea, Toggle } from '../components/ui';

type Source = 'archivo' | 'texto' | 'linkedin' | 'copia';

const SOURCES: Array<{ id: Source; title: string; detail: string; icon: string }> = [
  {
    id: 'archivo',
    title: 'Mi CV en PDF o Word',
    detail: 'Sube el currículum que ya tienes. Lee el texto y reparte los datos en las secciones.',
    icon: '▤',
  },
  {
    id: 'linkedin',
    title: 'Mi LinkedIn',
    detail: 'Con la copia de datos que entrega LinkedIn, el PDF de tu perfil, o pegando el texto.',
    icon: 'in',
  },
  {
    id: 'texto',
    title: 'Pegar texto',
    detail: 'Copias tu CV desde donde sea y lo pegas. Es lo que funciona con cualquier formato.',
    icon: '¶',
  },
  {
    id: 'copia',
    title: 'Una copia de Impulso',
    detail: 'El archivo .json que exportaste antes desde Ajustes.',
    icon: '↺',
  },
];

const ALL_SECTIONS: SectionKey[] = [
  'personal',
  'experience',
  'education',
  'skills',
  'languages',
  'projects',
  'certifications',
];

export function ImportPage() {
  const { state, apply, replaceAll, ai } = useApp();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const aiReady = hasAiKey(ai);
  const [source, setSource] = useState<Source | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [pasted, setPasted] = useState('');
  const [parsed, setParsed] = useState<ParsedCv | null>(null);
  const [mode, setMode] = useState<ImportMode>('reemplazar');
  const [include, setInclude] = useState<Set<SectionKey>>(new Set(ALL_SECTIONS));
  const [dragging, setDragging] = useState(false);
  const [useAi, setUseAi] = useState(true);

  const withAi = aiReady && useAi;
  const hasProfile = Boolean(state.profile.personal.fullName || state.profile.experience.length);

  const reset = () => {
    setParsed(null);
    setError('');
    setPasted('');
    setBusy('');
  };

  /** Punto único de lectura: decide entre el modelo y el lector local. */
  const readText = async (text: string) => {
    if (!withAi) {
      setParsed(parseCvText(text));
      return;
    }
    setBusy('Leyendo con IA… puede tardar hasta un minuto.');
    try {
      // El SDK y el esquema pesan; se cargan solo cuando la IA se usa de verdad.
      const { extractCvWithAi } = await import('../lib/ai/extract');
      setParsed(await extractCvWithAi(text, ai));
    } catch (e) {
      const detail = e instanceof AiError ? e.message : 'Falló la lectura con IA.';
      setError(`${detail} Se usó el lector sin IA como respaldo.`);
      setParsed(parseCvText(text));
    } finally {
      setBusy('');
    }
  };

  const handleFile = async (file: File) => {
    setError('');
    setParsed(null);
    const kind = detectKind(file);
    try {
      if (kind === 'json') {
        const data = JSON.parse(await file.text()) as AppState;
        if (!data || typeof data !== 'object' || !data.profile) throw new Error('formato');
        replaceAll({ ...initialState, ...data });
        navigate('/perfil');
        return;
      }

      if (kind === 'zip') {
        setBusy('Abriendo el ZIP de LinkedIn…');
        const csvs = await zipToCsvMap(file);
        setParsed(parseLinkedInCsvs(csvs));
        setBusy('');
        return;
      }

      if (kind === 'csv') {
        setBusy('Leyendo el CSV…');
        const base = file.name.toLowerCase();
        setParsed(parseLinkedInCsvs({ [base]: await file.text() }));
        setBusy('');
        return;
      }

      setBusy(kind === 'pdf' ? 'Extrayendo el texto del PDF…' : 'Leyendo el documento…');
      const text =
        kind === 'pdf' ? await pdfToText(file) : kind === 'docx' ? await docxToText(file) : await file.text();

      if (text.replace(/\s/g, '').length < 60) {
        setBusy('');
        setError(
          'Del archivo salió muy poco texto. Si tu PDF es un escaneo o una imagen, no se puede leer: copia el contenido a mano y usa «Pegar texto».',
        );
        return;
      }
      await readText(text);
    } catch (e) {
      setBusy('');
      setError(
        e instanceof Error && e.message === 'formato'
          ? 'Ese .json no es una copia de Impulso.'
          : 'No pude leer el archivo. Prueba con «Pegar texto», que funciona siempre.',
      );
    }
  };

  const applyNow = () => {
    if (!parsed) return;
    apply((s) => applyParsed(s, parsed, mode, include));
    navigate('/perfil');
  };

  const toggle = (key: SectionKey) => {
    setInclude((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const readButtons = (
    <div className="row" style={{ marginTop: 12 }}>
      <Button
        variant="primary"
        disabled={pasted.trim().length < 60 || Boolean(busy)}
        onClick={() => void readText(pasted)}
      >
        {busy ? 'Leyendo…' : withAi ? '✦ Leer con IA' : 'Leer el texto'}
      </Button>
      {withAi && (
        <Button disabled={pasted.trim().length < 60 || Boolean(busy)} onClick={() => setParsed(parseCvText(pasted))}>
          Leer sin IA
        </Button>
      )}
      <span className="faint">Se muestra lo detectado antes de guardar nada.</span>
    </div>
  );

  // ---------- Paso 3: revisión ----------
  if (parsed) {
    const totals = ALL_SECTIONS.map((key) => ({ key, count: countOf(parsed, key) }));
    const detected = totals.filter((t) => t.count > 0);

    return (
      <>
        <div className="page-head">
          <div>
            <h1>Revisa lo que encontré</h1>
            <p>
              Nada se guarda hasta que confirmes. Después puedes editar todo campo por campo en tu
              perfil.
            </p>
          </div>
          <div className="head-actions">
            <Button onClick={reset}>Volver a empezar</Button>
            <Button variant="primary" onClick={applyNow} disabled={!detected.length}>
              Guardar en mi perfil
            </Button>
          </div>
        </div>

        {error && (
          <div className="issue issue-warn" style={{ marginBottom: 12 }}>
            <span className="issue-icon">!</span>
            <div>
              <strong>{error}</strong>
            </div>
          </div>
        )}

        {parsed.notes.map((note) => (
          <div className="issue issue-tip" key={note} style={{ marginBottom: 12 }}>
            <span className="issue-icon">i</span>
            <div>
              <strong>{note}</strong>
            </div>
          </div>
        ))}

        {!detected.length ? (
          <Card>
            <Empty
              title="No reconocí nada aprovechable"
              text="Suele pasar con CV muy gráficos o con encabezados poco comunes. Prueba pegando el texto y revisa que las secciones se llamen Experiencia, Educación y Habilidades."
              action={<Button onClick={reset}>Probar de otra forma</Button>}
            />
          </Card>
        ) : (
          <>
            {!aiReady && (
              <div className="next-step">
                <span className="num" aria-hidden="true">
                  ✦
                </span>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <h3>¿Quedaron datos en campos equivocados?</h3>
                  <p>
                    El lector incluido adivina la estructura con reglas, y con CV de columnas o
                    encabezados poco comunes se equivoca. Con una clave de la API de Claude, el mismo
                    texto lo interpreta un modelo y esto mejora bastante.
                  </p>
                </div>
                <Link to="/ajustes">
                  <Button variant="primary">Configurar IA</Button>
                </Link>
              </div>
            )}

            <Card title="Qué incluir" subtitle="Desmarca lo que no quieras traer.">
              <div className="stack" style={{ gap: 8 }}>
                {totals.map(({ key, count }) => (
                  <label
                    key={key}
                    className="stat"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      cursor: count ? 'pointer' : 'default',
                      opacity: count ? 1 : 0.45,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={include.has(key) && count > 0}
                      disabled={!count}
                      onChange={() => toggle(key)}
                    />
                    <b style={{ fontSize: 14, flex: 1 }}>{SECTION_LABELS[key]}</b>
                    <Badge tone={count ? 'good' : 'neutral'}>
                      {count
                        ? `${count} ${key === 'personal' ? 'campos' : count === 1 ? 'elemento' : 'elementos'}`
                        : 'nada'}
                    </Badge>
                  </label>
                ))}
              </div>

              {hasProfile && (
                <div style={{ marginTop: 16 }}>
                  <Select
                    label="Ya tienes datos cargados"
                    hint="Las secciones que no se detectaron quedan intactas en los dos casos."
                    value={mode}
                    onChange={(e) => setMode(e.target.value as ImportMode)}
                  >
                    <option value="reemplazar">Reemplazar las secciones que traiga</option>
                    <option value="agregar">Sumar a lo que ya tengo</option>
                  </Select>
                </div>
              )}
            </Card>

            <Card title="Vista previa">
              <div className="stack">
                {Object.entries(parsed.personal).filter(([, v]) => String(v ?? '').trim()).length > 0 && (
                  <div>
                    <div className="field-label" style={{ marginBottom: 6 }}>
                      Datos personales
                    </div>
                    <div className="chips">
                      {Object.entries(parsed.personal)
                        .filter(([, v]) => String(v ?? '').trim())
                        .map(([k, v]) => (
                          <span className="badge" key={k}>
                            {String(v).length > 60 ? `${String(v).slice(0, 60)}…` : String(v)}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                {parsed.experience.length > 0 && (
                  <div>
                    <div className="field-label" style={{ margin: '10px 0 6px' }}>
                      Experiencia
                    </div>
                    {parsed.experience.map((e) => (
                      <div className="item" key={e.id} style={{ marginBottom: 8 }}>
                        <div className="item-head">
                          <h3>{e.role || <span className="faint">Cargo sin reconocer</span>}</h3>
                          <span className="faint">{e.company}</span>
                          <span className="spacer" />
                          <span className="faint">{formatRange(e.startDate, e.endDate, e.current)}</span>
                        </div>
                        {e.bullets.length > 0 && (
                          <div className="item-body" style={{ paddingTop: 10, paddingBottom: 10 }}>
                            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                              {e.bullets.slice(0, 4).map((b, i) => (
                                <li key={i} className="muted">
                                  {b}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {parsed.education.length > 0 && (
                  <div>
                    <div className="field-label" style={{ margin: '10px 0 6px' }}>
                      Formación
                    </div>
                    <ul className="checklist">
                      {parsed.education.map((e) => (
                        <li key={e.id}>
                          <span className="mark">✓</span>
                          <div style={{ flex: 1 }}>
                            <span className="label">{e.degree || 'Sin título reconocido'}</span>
                            <small>
                              {e.institution} · {formatRange(e.startDate, e.endDate, e.current)}
                            </small>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {parsed.skills.length > 0 && (
                  <div>
                    <div className="field-label" style={{ margin: '10px 0 6px' }}>
                      Habilidades
                    </div>
                    {parsed.skills.map((g) => (
                      <div key={g.id} style={{ marginBottom: 8 }}>
                        <div className="faint" style={{ marginBottom: 4 }}>
                          {g.name}
                        </div>
                        <div className="chips">
                          {g.items.map((i) => (
                            <span className="badge" key={i}>
                              {i}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(parsed.languages.length > 0 || parsed.certifications.length > 0) && (
                  <div className="chips" style={{ marginTop: 6 }}>
                    {parsed.languages.map((l) => (
                      <span className="badge badge-accent" key={l.id}>
                        {l.name}: {l.level}
                      </span>
                    ))}
                    {parsed.certifications.map((c) => (
                      <span className="badge" key={c.id}>
                        {c.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button variant="primary" onClick={applyNow}>
                Guardar en mi perfil →
              </Button>
            </div>
          </>
        )}
      </>
    );
  }

  // ---------- Paso 1 y 2: elegir origen y entregar el material ----------
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Trae lo que ya tienes</h1>
          <p>
            Escribir un perfil desde cero es lento. Carga tu CV o tu LinkedIn, y corrige lo que haga
            falta. El archivo se abre en tu navegador y no se sube a ninguna parte.
          </p>
        </div>
      </div>

      {aiReady ? (
        <div className="next-step">
          <span className="num" aria-hidden="true">
            ✦
          </span>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h3>Lectura con IA activada</h3>
            <p>
              El texto se manda a Claude para interpretarlo, que es bastante más preciso que las
              reglas locales. Solo viaja el documento que cargues acá, nada más de tu perfil.
            </p>
          </div>
          <Toggle label="Usar IA" checked={useAi} onChange={setUseAi} />
        </div>
      ) : (
        <div className="next-step">
          <span className="num" aria-hidden="true">
            ✦
          </span>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h3>¿La lectura te deja datos en campos equivocados?</h3>
            <p>
              El lector incluido funciona sin conexión y sin costo, pero adivina la estructura con
              reglas y se confunde con CV de columnas o encabezados poco comunes. Con una clave de la
              API de Claude, el mismo texto lo interpreta un modelo.
            </p>
          </div>
          <Link to="/ajustes">
            <Button>Configurar IA</Button>
          </Link>
        </div>
      )}

      <div className="grid">
        {SOURCES.map((s) => (
          <button
            key={s.id}
            type="button"
            className="stat source-card"
            onClick={() => {
              setSource(s.id);
              setError('');
            }}
            style={{
              textAlign: 'left',
              cursor: 'pointer',
              font: 'inherit',
              color: 'inherit',
              borderColor: source === s.id ? 'var(--accent)' : 'var(--line)',
              background: source === s.id ? 'var(--accent-soft)' : 'var(--bg-soft)',
            }}
          >
            <span className="source-icon" aria-hidden="true">
              {s.icon}
            </span>
            <b style={{ fontSize: 15 }}>{s.title}</b>
            <span>{s.detail}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="issue issue-error" style={{ marginTop: 16 }}>
          <span className="issue-icon">✕</span>
          <div>
            <strong>{error}</strong>
          </div>
        </div>
      )}

      {busy && (
        <div className="issue issue-tip" style={{ marginTop: 16 }}>
          <span className="issue-icon">…</span>
          <div>
            <strong>{busy}</strong>
          </div>
        </div>
      )}

      {(source === 'archivo' || source === 'copia') && (
        <Card
          title={source === 'copia' ? 'Tu copia de Impulso' : 'Sube tu CV'}
          subtitle={
            source === 'copia'
              ? 'El .json que descargaste desde Ajustes. Restaura todo tal cual estaba.'
              : 'Acepta PDF y Word (.docx). El PDF tiene que tener texto seleccionable: si es una foto escaneada, no hay nada que leer.'
          }
        >
          <div
            className={`dropzone ${dragging ? 'dragging' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) void handleFile(file);
            }}
            onClick={() => fileRef.current?.click()}
          >
            <strong>Arrastra el archivo aquí</strong>
            <span className="faint">o haz clic para buscarlo</span>
          </div>
          <input
            ref={fileRef}
            type="file"
            hidden
            accept={source === 'copia' ? '.json' : '.pdf,.docx,.txt'}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = '';
            }}
          />
        </Card>
      )}

      {source === 'linkedin' && (
        <>
          <Card
            title="Opción A: la copia de datos de LinkedIn"
            subtitle="La más fiel, porque son tus datos tal como los tiene LinkedIn, sin interpretar nada."
          >
            <ol className="steps">
              <li>
                En LinkedIn, entra a <b>Configuración y privacidad → Privacidad de los datos → Obtener
                una copia de tus datos</b>.
              </li>
              <li>
                Elige <b>«Descargar archivo más grande»</b> (la copia completa) y pide el archivo.
              </li>
              <li>Llega un correo con el ZIP, normalmente en unos minutos.</li>
              <li>Suéltalo aquí sin descomprimir.</li>
            </ol>
            <div
              className={`dropzone ${dragging ? 'dragging' : ''}`}
              style={{ marginTop: 14 }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void handleFile(file);
              }}
              onClick={() => fileRef.current?.click()}
            >
              <strong>Arrastra el ZIP de LinkedIn</strong>
              <span className="faint">también sirve un CSV suelto</span>
            </div>
            <input
              ref={fileRef}
              type="file"
              hidden
              accept=".zip,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = '';
              }}
            />
          </Card>

          <Card
            title="Opción B: el PDF de tu perfil"
            subtitle="Rápido y sin esperar el correo de LinkedIn."
          >
            <ol className="steps">
              <li>Abre tu perfil de LinkedIn en el computador.</li>
              <li>
                Bajo tu foto, toca <b>«Más» → «Guardar en PDF»</b>.
              </li>
              <li>Sube ese PDF en la primera opción de esta página, «Mi CV en PDF o Word».</li>
            </ol>
          </Card>

          <Card
            title="Opción C: copiar y pegar el perfil"
            subtitle="Lo más rápido de todo, aunque reconoce menos si lees sin IA."
          >
            <ol className="steps">
              <li>Abre tu perfil de LinkedIn en el computador.</li>
              <li>
                Selecciona desde tu nombre hasta el final de la sección de aptitudes y copia
                (<span className="mono">Ctrl+C</span>).
              </li>
              <li>Pégalo abajo.</li>
            </ol>
            <TextArea
              label="Texto del perfil"
              rows={8}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder="Pega aquí…"
            />
            {readButtons}
          </Card>
        </>
      )}

      {source === 'texto' && (
        <Card
          title="Pega tu CV"
          subtitle="Abre tu currículum, selecciona todo, copia y pega. Si lees sin IA, ayuda que las secciones se llamen Experiencia, Educación y Habilidades."
        >
          <TextArea
            label="Texto del CV"
            rows={14}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder={'María Pérez\nAnalista de Datos\nmaria@correo.cl · +56 9 1234 5678 · Osorno\n\nEXPERIENCIA\nAnalista de Datos — Retail Sur · mar 2021 - Actualidad\n• Automaticé el reporte semanal…'}
          />
          {readButtons}
        </Card>
      )}

      {!source && (
        <Card title="¿Y si no tengo nada de esto?">
          <p className="muted" style={{ fontSize: 14, maxWidth: '70ch' }}>
            Se puede empezar de cero: el perfil te va guiando campo por campo y el asistente de
            redacción arma los logros a partir de tres preguntas. También puedes cargar un perfil de
            ejemplo para ver cómo queda todo antes de escribir lo tuyo.
          </p>
          <div className="row" style={{ marginTop: 14 }}>
            <Button variant="primary" onClick={() => navigate('/perfil')}>
              Empezar de cero
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}
