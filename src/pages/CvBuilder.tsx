import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../state/context';
import { CvDocument } from '../cv/CvDocument';
import { FONT_LABELS } from '../cv/fonts';
import { cvStats, matchJob } from '../lib/analysis';
import { ATS_ANTIPATTERNS, SINGLE_COLUMN, atsReview } from '../lib/ats';
import type { CvFont, TemplateId } from '../types';
import { Badge, Button, Card, Empty, ScoreRing, Select, TextArea, Toggle } from '../components/ui';

const TEMPLATES: Array<{ id: TemplateId; name: string; detail: string; tag?: string }> = [
  {
    id: 'ats',
    name: 'ATS',
    tag: 'Recomendado',
    detail:
      'Una columna, encabezados estándar y negro sobre blanco. Es el formato que los filtros de reclutamiento leen sin equivocarse.',
  },
  {
    id: 'clasico',
    name: 'Clásico',
    detail: 'Una columna con la cabecera centrada y un toque de color. Seguro para banca, salud o sector público.',
  },
  {
    id: 'compacto',
    name: 'Compacto',
    detail: 'Una columna más densa. Para cuando tienes mucha experiencia y no quieres pasar de dos páginas.',
  },
  {
    id: 'moderno',
    name: 'Moderno',
    tag: 'Dos columnas',
    detail:
      'Se ve bien y cabe más, pero los lectores automáticos mezclan las columnas. Úsalo solo si se lo envías directo a una persona.',
  },
];

const ACCENTS = ['#4d8bff', '#0f766e', '#7c3aed', '#b45309', '#be123c', '#1f2937'];
const FONTS: CvFont[] = ['calibri', 'arial', 'georgia', 'times'];

export function CvBuilder() {
  const { state, patchCv } = useApp();
  const { profile, cv, applications } = state;
  const [pastedJob, setPastedJob] = useState('');
  const [zoom, setZoom] = useState(0.75);
  const [showAvoid, setShowAvoid] = useState(false);

  const stats = cvStats(profile);
  const ats = atsReview(profile, cv);

  const targetApp = applications.find((a) => a.id === cv.targetJobId) ?? null;
  const jobText = pastedJob.trim() || targetApp?.jobDescription || '';
  const match = useMemo(() => matchJob(jobText, profile), [jobText, profile]);

  const hasProfile = Boolean(profile.personal.fullName || profile.experience.length);
  const failed = ats.checks.filter((c) => !c.ok);

  if (!hasProfile) {
    return (
      <>
        <div className="page-head">
          <h1>Constructor de CV</h1>
        </div>
        <Card>
          <Empty
            title="Primero necesitas tus datos cargados"
            text="El CV se arma solo con lo que haya en tu perfil. Puedes subir el CV que ya tienes y corregirlo, o escribirlo desde cero."
            action={
              <div className="row" style={{ justifyContent: 'center' }}>
                <Link to="/importar">
                  <Button variant="primary">Subir mi CV o LinkedIn</Button>
                </Link>
                <Link to="/perfil">
                  <Button>Escribirlo yo</Button>
                </Link>
              </div>
            }
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Constructor de CV</h1>
          <p>
            Ajusta el formato, revisa que pase los filtros automáticos y expórtalo. Al imprimir,
            elige «Guardar como PDF»: sale igual a lo que ves acá y con el texto seleccionable, que
            es lo que necesitan los sistemas de reclutamiento.
          </p>
        </div>
        <div className="head-actions">
          <Button variant="primary" onClick={() => window.print()}>
            ⤓ Exportar a PDF
          </Button>
        </div>
      </div>

      <div className="split split-cv">
        <div className="no-print">
          <Card
            title="Compatibilidad con filtros automáticos"
            subtitle="La mayoría de las postulaciones pasa primero por un sistema que lee el CV antes que una persona."
            actions={<Badge tone={ats.score >= 80 ? 'good' : ats.score >= 60 ? 'warn' : 'bad'}>{ats.score}%</Badge>}
          >
            <div className="row" style={{ gap: 18, alignItems: 'flex-start' }}>
              <ScoreRing value={ats.score} label="compatible" size={88} />
              <p className="muted" style={{ flex: 1, minWidth: 170, fontSize: 13.5 }}>
                {ats.score >= 85
                  ? 'Tu CV cumple con lo que esperan estos sistemas.'
                  : failed.length === 1
                    ? 'Queda un punto por resolver.'
                    : `Quedan ${failed.length} puntos por resolver.`}
              </p>
            </div>

            <ul className="checklist" style={{ marginTop: 14 }}>
              {ats.checks.map((c) => (
                <li key={c.id} className={c.ok ? 'done' : ''}>
                  <span className="mark">{c.ok ? '✓' : '○'}</span>
                  <div>
                    <span className="label">{c.label}</span>
                    {!c.ok && <small>{c.detail}</small>}
                  </div>
                </li>
              ))}
            </ul>

            <div className="row" style={{ marginTop: 14 }}>
              <Button size="sm" variant="ghost" onClick={() => setShowAvoid((v) => !v)}>
                {showAvoid ? 'Ocultar' : 'Qué evitar (y por qué)'}
              </Button>
            </div>

            {showAvoid && (
              <div className="stack" style={{ marginTop: 12, gap: 8 }}>
                {ATS_ANTIPATTERNS.map((a) => (
                  <div className="issue issue-warn" key={a.title}>
                    <span className="issue-icon">!</span>
                    <div>
                      <strong>{a.title}</strong>
                      <p>{a.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Formato">
            <div className="stack">
              <div className="grid" style={{ gridTemplateColumns: '1fr' }}>
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => patchCv({ template: t.id })}
                    className="stat"
                    style={{
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderColor: cv.template === t.id ? 'var(--accent)' : 'var(--line)',
                      background: cv.template === t.id ? 'var(--accent-soft)' : 'var(--bg-soft)',
                      color: 'inherit',
                      font: 'inherit',
                    }}
                  >
                    <span className="row" style={{ gap: 8 }}>
                      <b style={{ fontSize: 14 }}>{t.name}</b>
                      {t.tag && (
                        <Badge tone={t.id === 'ats' ? 'good' : 'warn'}>{t.tag}</Badge>
                      )}
                    </span>
                    <span>{t.detail}</span>
                  </button>
                ))}
              </div>

              {!SINGLE_COLUMN.includes(cv.template) && (
                <div className="issue issue-warn">
                  <span className="issue-icon">!</span>
                  <div>
                    <strong>Estás usando dos columnas</strong>
                    <p>
                      Para postular por un portal, cambia a «ATS». Guarda el formato de dos columnas
                      para cuando envíes el CV por correo a una persona concreta.
                    </p>
                  </div>
                </div>
              )}

              <Select
                label="Tipografía"
                hint="Las cuatro son tipografías que los lectores automáticos parsean sin romper palabras."
                value={cv.font}
                onChange={(e) => patchCv({ font: e.target.value as CvFont })}
              >
                {FONTS.map((f) => (
                  <option key={f} value={f}>
                    {FONT_LABELS[f]}
                  </option>
                ))}
              </Select>

              {cv.template !== 'ats' && (
                <div className="field">
                  <span className="field-label">Color de acento</span>
                  <div className="row">
                    {ACCENTS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Color ${c}`}
                        onClick={() => patchCv({ accent: c })}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: c,
                          border: cv.accent === c ? '2px solid var(--text)' : '1px solid var(--line)',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </div>
                  <span className="field-hint">La plantilla ATS va siempre en negro, a propósito.</span>
                </div>
              )}

              <div className="field">
                <span className="field-label">
                  Tamaño de letra ({Math.round(cv.fontScale * 100)}%) · {stats.estimatedPages}{' '}
                  {stats.estimatedPages === 1 ? 'página' : 'páginas'}
                </span>
                <input
                  type="range"
                  min={0.85}
                  max={1.15}
                  step={0.05}
                  value={cv.fontScale}
                  onChange={(e) => patchCv({ fontScale: Number(e.target.value) })}
                />
                <span className="field-hint">Bájalo si el CV se pasa de página por poco. Bajo 10pt hay parsers que saltan el texto.</span>
              </div>

              <div className="stack" style={{ gap: 8 }}>
                <Toggle label="Incluir resumen" checked={cv.showSummary} onChange={(v) => patchCv({ showSummary: v })} />
                <Toggle label="Incluir proyectos" checked={cv.showProjects} onChange={(v) => patchCv({ showProjects: v })} />
                <Toggle
                  label="Incluir certificaciones"
                  checked={cv.showCertifications}
                  onChange={(v) => patchCv({ showCertifications: v })}
                />
                <Toggle label="Incluir idiomas" checked={cv.showLanguages} onChange={(v) => patchCv({ showLanguages: v })} />
                <Toggle label="Mostrar foto" checked={cv.showPhoto} onChange={(v) => patchCv({ showPhoto: v })} />
              </div>

              <div className="field">
                <span className="field-label">Zoom de la vista previa ({Math.round(zoom * 100)}%)</span>
                <input
                  type="range"
                  min={0.4}
                  max={1}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                />
                <span className="field-hint">Solo afecta la pantalla, no el PDF.</span>
              </div>
            </div>
          </Card>

          <Card
            title="¿Calza con la oferta?"
            subtitle="Pega la descripción del aviso y compara: los filtros buscan literalmente estas palabras."
          >
            {applications.length > 0 && (
              <Select
                label="Usar una postulación guardada"
                value={cv.targetJobId ?? ''}
                onChange={(e) => patchCv({ targetJobId: e.target.value || null })}
              >
                <option value="">— Ninguna —</option>
                {applications.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.role} · {a.company}
                  </option>
                ))}
              </Select>
            )}
            <TextArea
              label="O pega aquí la descripción del cargo"
              rows={5}
              value={pastedJob}
              onChange={(e) => setPastedJob(e.target.value)}
              placeholder="Copia el texto completo del aviso…"
            />

            {jobText ? (
              <div style={{ marginTop: 14 }}>
                <div className="row" style={{ gap: 16, alignItems: 'center' }}>
                  <ScoreRing value={match.score} label="calce" size={84} />
                  <p className="muted" style={{ flex: 1, minWidth: 180, fontSize: 13.5 }}>
                    {match.score >= 75
                      ? 'Buen calce. Tu CV habla el mismo idioma que el aviso.'
                      : match.score >= 45
                        ? 'Calce parcial. Suma las palabras que faltan donde sean ciertas.'
                        : 'Calce bajo. Si el cargo te interesa, adapta el resumen y los logros antes de enviar.'}
                  </p>
                </div>

                {match.missing.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div className="field-label" style={{ marginBottom: 6 }}>
                      No aparecen en tu CV ({match.missing.length})
                    </div>
                    <div className="chips">
                      {match.missing.map((t) => (
                        <span className="badge badge-warn" key={t}>
                          {t}
                        </span>
                      ))}
                    </div>
                    <p className="field-hint" style={{ marginTop: 8 }}>
                      Agrégalas solo si son verdad. Los sistemas actuales cruzan lo que declaras
                      contra tu historial, así que una habilidad sin respaldo resta en vez de sumar.
                    </p>
                  </div>
                )}

                {match.matched.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div className="field-label" style={{ marginBottom: 6 }}>
                      Ya las tienes ({match.matched.length})
                    </div>
                    <div className="chips">
                      {match.matched.map((t) => (
                        <span className="badge badge-good" key={t}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="field-hint" style={{ marginTop: 12 }}>
                Sin una oferta cargada no hay nada que comparar.
              </p>
            )}
          </Card>
        </div>

        <div>
          <Card
            title="Vista previa"
            subtitle={targetApp ? `Comparando con: ${targetApp.role} · ${targetApp.company}` : undefined}
            actions={<Badge tone="accent">A4</Badge>}
            padded={false}
          >
            <div className="cv-wrap">
              <div className="cv-scaler" style={{ zoom }}>
                <CvDocument profile={profile} config={cv} />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
