import { useState } from 'react';
import { useApp } from '../state/context';
import { removeById, upsert } from '../lib/list';
import type { CoverLetter } from '../types';
import { uid, formatDate } from '../lib/utils';
import { generateCoverLetter, relevantSkills } from '../lib/writing';
import { matchJob } from '../lib/analysis';
import { canReadLinks, isConfigured, readerName } from '../lib/ai/settings';
import { AiError } from '../lib/ai/errors';
import { LETTER_TONES } from '../lib/ai/types';
import type { LetterTone } from '../lib/ai/types';
import {
  Badge,
  Button,
  Card,
  ConfirmButton,
  CopyButton,
  Empty,
  Select,
  TextArea,
  TextInput,
} from '../components/ui';

function newLetter(): CoverLetter {
  const now = new Date().toISOString();
  return {
    id: uid('letter'),
    title: 'Carta sin título',
    company: '',
    role: '',
    recipient: '',
    body: '',
    jobDescription: '',
    applicationId: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function Letters() {
  const { state, setLetters, ai } = useApp();
  const { letters, applications, profile } = state;
  const [selectedId, setSelectedId] = useState<string | null>(letters[0]?.id ?? null);
  const [source, setSource] = useState('');
  const [motivation, setMotivation] = useState('');
  const [tone, setTone] = useState<LetterTone>('directo');
  const [writing, setWriting] = useState(false);
  const [aiError, setAiError] = useState('');
  const [gaps, setGaps] = useState<string[]>([]);
  const [jobUrl, setJobUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const aiReady = isConfigured(ai);
  const canFetch = canReadLinks(ai);

  const letter = letters.find((l) => l.id === selectedId) ?? null;

  const patch = (p: Partial<CoverLetter>) => {
    if (!letter) return;
    setLetters(upsert(letters, { ...letter, ...p, updatedAt: new Date().toISOString() }));
  };

  const create = () => {
    const l = newLetter();
    setLetters([l, ...letters]);
    setSelectedId(l.id);
  };

  const linkedApp = applications.find((a) => a.id === letter?.applicationId) ?? null;
  const jobText = letter?.jobDescription?.trim() || linkedApp?.jobDescription?.trim() || '';
  // Con un calce muy bajo, el modelo termina escribiendo una carta que
  // descarta a la propia persona. Mejor avisar antes de gastar la llamada.
  const match = jobText ? matchJob(jobText, profile) : null;
  const poorMatch = Boolean(match && match.total > 5 && match.score < 25);

  const readJobFromLink = async () => {
    if (!letter) return;
    setFetching(true);
    setAiError('');
    try {
      const { fetchPageText } = await import('../lib/ai/pageText');
      const text = await fetchPageText(jobUrl, ai);
      patch({ jobDescription: text });
    } catch (e) {
      setAiError(e instanceof AiError ? e.message : 'No se pudo leer ese enlace.');
    } finally {
      setFetching(false);
    }
  };

  const generate = () => {
    if (!letter) return;
    const keywords = relevantSkills(profile, jobText);
    const body = generateCoverLetter({
      profile,
      company: letter.company,
      role: letter.role,
      recipient: letter.recipient,
      source,
      motivation,
      keywords,
    });
    setGaps([]);
    setAiError('');
    patch({ body });
  };

  const generateWithAi = async () => {
    if (!letter) return;
    setWriting(true);
    setAiError('');
    setGaps([]);
    try {
      const { generateLetterWithAi } = await import('../lib/ai/extract');
      const draft = await generateLetterWithAi(
        {
          profile,
          company: letter.company,
          role: letter.role,
          recipient: letter.recipient,
          source,
          motivation,
          jobDescription: jobText,
          tone,
        },
        ai,
      );
      patch({ body: draft.body });
      setGaps(draft.gaps);
    } catch (e) {
      setAiError(e instanceof AiError ? e.message : 'No se pudo escribir la carta.');
    } finally {
      setWriting(false);
    }
  };

  const words = letter ? letter.body.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Cartas de presentación</h1>
          <p>
            Una carta corta y específica gana a una larga y genérica. El borrador se arma con tu
            perfil; el párrafo sobre por qué esa empresa lo tienes que escribir tú.
          </p>
        </div>
        <div className="head-actions">
          <Button variant="primary" onClick={create}>
            + Nueva carta
          </Button>
          {letter && (
            <Button onClick={() => window.print()}>⤓ Exportar a PDF</Button>
          )}
        </div>
      </div>

      {letters.length === 0 ? (
        <Card>
          <Empty
            title="Todavía no tienes cartas"
            text="Crea una por postulación. Reutilizar la misma carta cambiando el nombre de la empresa se nota, y descarta."
            action={
              <Button variant="primary" onClick={create}>
                Crear la primera
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="split">
          <div className="no-print">
            <Card title="Tus cartas">
              <div className="stack" style={{ gap: 8 }}>
                {letters.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setSelectedId(l.id)}
                    className="stat"
                    style={{
                      textAlign: 'left',
                      cursor: 'pointer',
                      font: 'inherit',
                      color: 'inherit',
                      borderColor: l.id === selectedId ? 'var(--accent)' : 'var(--line)',
                      background: l.id === selectedId ? 'var(--accent-soft)' : 'var(--bg-soft)',
                    }}
                  >
                    <b style={{ fontSize: 14 }}>{l.title || 'Sin título'}</b>
                    <span>
                      {[l.role, l.company].filter(Boolean).join(' · ') || 'Sin destinatario'} ·{' '}
                      {formatDate(l.updatedAt)}
                    </span>
                  </button>
                ))}
              </div>
            </Card>

            {letter && (
              <Card
                title="Datos de la carta"
                actions={
                  <ConfirmButton
                    onConfirm={() => {
                      const rest = removeById(letters, letter.id);
                      setLetters(rest);
                      setSelectedId(rest[0]?.id ?? null);
                    }}
                  >
                    Eliminar
                  </ConfirmButton>
                }
              >
                <div className="grid">
                  <TextInput
                    label="Título interno"
                    value={letter.title}
                    onChange={(e) => patch({ title: e.target.value })}
                    hint="Solo para que la encuentres."
                  />
                  {applications.length > 0 && (
                    <Select
                      label="Vincular a una postulación"
                      value={letter.applicationId ?? ''}
                      onChange={(e) => {
                        const app = applications.find((a) => a.id === e.target.value);
                        patch({
                          applicationId: e.target.value || null,
                          company: app?.company ?? letter.company,
                          role: app?.role ?? letter.role,
                          title: app ? `${app.role} · ${app.company}` : letter.title,
                          jobDescription: app?.jobDescription || letter.jobDescription,
                        });
                      }}
                    >
                      <option value="">— Ninguna —</option>
                      {applications.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.role} · {a.company}
                        </option>
                      ))}
                    </Select>
                  )}
                  <TextInput
                    label="Empresa"
                    value={letter.company}
                    onChange={(e) => patch({ company: e.target.value })}
                  />
                  <TextInput label="Cargo" value={letter.role} onChange={(e) => patch({ role: e.target.value })} />
                  <TextInput
                    label="¿A quién va dirigida?"
                    value={letter.recipient}
                    onChange={(e) => patch({ recipient: e.target.value })}
                    placeholder="Paula Méndez"
                    hint="Si encuentras el nombre en LinkedIn, úsalo. Cambia mucho."
                  />
                  <TextInput
                    label="¿Dónde viste el aviso?"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="LinkedIn, Getonboard, un contacto…"
                  />
                  <TextArea
                    label="¿Por qué esta empresa?"
                    rows={3}
                    value={motivation}
                    onChange={(e) => setMotivation(e.target.value)}
                    hint="El párrafo que no se puede automatizar. Algo real: un producto que usas, una noticia que leíste, alguien que trabaja ahí."
                  />
                </div>
                <div style={{ marginTop: 18 }}>
                  <div className="field-label" style={{ marginBottom: 6 }}>
                    El aviso al que postulas
                  </div>
                  <p className="field-hint" style={{ marginBottom: 10 }}>
                    Es lo que separa una carta genérica de una escrita para ese cargo: la IA elige
                    los logros de tu perfil que calzan con lo que pide el aviso.
                  </p>

                  {canFetch && (
                    <div className="row" style={{ flexWrap: 'nowrap', gap: 8, marginBottom: 10 }}>
                      <input
                        className="input"
                        value={jobUrl}
                        onChange={(e) => setJobUrl(e.target.value)}
                        placeholder="Pega el enlace del aviso…"
                      />
                      <Button disabled={!jobUrl.trim() || fetching} onClick={() => void readJobFromLink()}>
                        {fetching ? 'Leyendo…' : 'Leer enlace'}
                      </Button>
                    </div>
                  )}

                  <TextArea
                    label={canFetch ? 'O pega el texto del aviso' : 'Texto del aviso'}
                    rows={6}
                    value={letter.jobDescription}
                    onChange={(e) => patch({ jobDescription: e.target.value })}
                    placeholder={
                      linkedApp?.jobDescription
                        ? 'Se está usando el aviso de la postulación vinculada. Pega algo aquí para reemplazarlo.'
                        : 'Copia el aviso completo y pégalo aquí…'
                    }
                    hint={
                      canFetch
                        ? `El enlace se lee con ${readerName(ai)}.`
                        : 'Para leer directamente desde un enlace, activa esa opción en Ajustes.'
                    }
                  />

                  {!jobText && (
                    <div className="issue issue-warn" style={{ marginTop: 10 }}>
                      <span className="issue-icon">!</span>
                      <div>
                        <strong>Sin el aviso, la carta sale genérica</strong>
                        <p>
                          Con solo el cargo y la empresa, la IA no sabe qué pide el puesto y escribe
                          en abstracto. Pega el aviso o léelo desde su enlace.
                        </p>
                      </div>
                    </div>
                  )}

                  {poorMatch && (
                    <div className="issue issue-warn" style={{ marginTop: 10 }}>
                      <span className="issue-icon">!</span>
                      <div>
                        <strong>Tu perfil calza poco con este aviso ({match?.score}%)</strong>
                        <p>
                          La carta se va a apoyar en lo transferible, que es poco cuando el rubro es
                          otro. Si de verdad te interesa el cargo, primero conviene reforzar el
                          perfil con lo que pide el aviso. Puedes generarla igual.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {aiReady && (
                  <div style={{ marginTop: 16 }}>
                    <div className="field-label" style={{ marginBottom: 8 }}>
                      Tono de la carta
                    </div>
                    <div className="stack" style={{ gap: 6 }}>
                      {LETTER_TONES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className="stat"
                          onClick={() => setTone(t.id)}
                          style={{
                            textAlign: 'left',
                            cursor: 'pointer',
                            font: 'inherit',
                            color: 'inherit',
                            padding: '9px 12px',
                            borderColor: tone === t.id ? 'var(--accent)' : 'var(--line)',
                            background: tone === t.id ? 'var(--accent-soft)' : 'var(--bg-soft)',
                          }}
                        >
                          <b style={{ fontSize: 13.5 }}>{t.name}</b>
                          <span>{t.detail}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="row" style={{ marginTop: 14 }}>
                  {aiReady && (
                    <Button variant="primary" disabled={writing} onClick={() => void generateWithAi()}>
                      {writing ? 'Escribiendo…' : '✦ Escribir con IA'}
                    </Button>
                  )}
                  <Button variant={aiReady ? 'subtle' : 'primary'} onClick={generate}>
                    {aiReady ? 'Usar plantilla' : '✦ Generar borrador'}
                  </Button>
                  <span className="faint">Reemplaza el texto actual de la carta.</span>
                </div>

                {aiError && (
                  <div className="issue issue-error" style={{ marginTop: 12 }}>
                    <span className="issue-icon">✕</span>
                    <div>
                      <strong>{aiError}</strong>
                    </div>
                  </div>
                )}

                {gaps.length > 0 && (
                  <div className="issue issue-tip" style={{ marginTop: 12 }}>
                    <span className="issue-icon">i</span>
                    <div>
                      <strong>Huecos que tienes que llenar tú</strong>
                      <p>
                        Van marcados entre corchetes en el texto, porque son cosas que no se pueden
                        inventar: {gaps.join(' · ')}
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>

          <div>
            {letter && (
              <>
                <div className="no-print">
                  <Card
                    title="Texto de la carta"
                    subtitle={`${words} palabras · lo ideal está entre 180 y 300`}
                    actions={<CopyButton text={letter.body} />}
                  >
                    <TextArea
                      label="Cuerpo"
                      rows={16}
                      value={letter.body}
                      onChange={(e) => patch({ body: e.target.value })}
                      placeholder="Escribe o genera un borrador con el botón de la izquierda…"
                    />
                    {words > 340 && (
                      <div className="issue issue-warn" style={{ marginTop: 12 }}>
                        <span className="issue-icon">!</span>
                        <div>
                          <strong>La carta se está yendo larga</strong>
                          <p>Sobre 300 palabras, casi nadie la lee entera. Corta el párrafo más genérico.</p>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>

                <Card title="Vista previa" actions={<Badge tone="accent">Carta</Badge>}>
                  <div className="letter-preview">{letter.body || 'La carta aparecerá aquí.'}</div>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
