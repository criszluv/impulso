import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../state/context';
import { CvDocument } from '../cv/CvDocument';
import { cvStats, matchJob, profileCompleteness } from '../lib/analysis';
import type { TemplateId } from '../types';
import { Badge, Button, Card, Empty, ScoreRing, Select, TextArea, Toggle } from '../components/ui';

const TEMPLATES: Array<{ id: TemplateId; name: string; detail: string }> = [
  { id: 'moderno', name: 'Moderno', detail: 'Dos columnas. Cabe más en una página.' },
  { id: 'clasico', name: 'Clásico', detail: 'Una columna, centrado. El más seguro para banca, salud o sector público.' },
  { id: 'compacto', name: 'Compacto', detail: 'Una columna densa. Para cuando tienes mucha experiencia.' },
];

const ACCENTS = ['#4d8bff', '#0f766e', '#7c3aed', '#b45309', '#be123c', '#1f2937'];

export function CvBuilder() {
  const { state, patchCv } = useApp();
  const { profile, cv, applications } = state;
  const [pastedJob, setPastedJob] = useState('');
  const [zoom, setZoom] = useState(0.75);

  const stats = cvStats(profile);
  const completeness = profileCompleteness(profile);

  const targetApp = applications.find((a) => a.id === cv.targetJobId) ?? null;
  const jobText = pastedJob.trim() || targetApp?.jobDescription || '';
  const match = useMemo(() => matchJob(jobText, profile), [jobText, profile]);

  const hasProfile = Boolean(profile.personal.fullName || profile.experience.length);

  if (!hasProfile) {
    return (
      <>
        <div className="page-head">
          <h1>Constructor de CV</h1>
        </div>
        <Card>
          <Empty
            title="Primero necesitas un perfil"
            text="El CV se arma solo con los datos de tu perfil. Carga al menos tu nombre y una experiencia."
            action={
              <Link to="/perfil">
                <Button variant="primary">Ir al perfil</Button>
              </Link>
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
            Ajusta el formato, revisa que calce con la oferta y exporta a PDF. Usa «Guardar como
            PDF» en el diálogo de impresión: sale igual a lo que ves acá.
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
                    <b style={{ fontSize: 14 }}>{t.name}</b>
                    <span>{t.detail}</span>
                  </button>
                ))}
              </div>

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
              </div>

              <div className="field">
                <span className="field-label">Tamaño de letra ({Math.round(cv.fontScale * 100)}%)</span>
                <input
                  type="range"
                  min={0.85}
                  max={1.15}
                  step={0.05}
                  value={cv.fontScale}
                  onChange={(e) => patchCv({ fontScale: Number(e.target.value) })}
                />
                <span className="field-hint">Bájalo si el CV se pasa de una página por poco.</span>
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

          <Card title="Revisión rápida" subtitle="Señales que miran los reclutadores en los primeros 10 segundos.">
            <div className="grid">
              <div className="stat">
                <b>{stats.estimatedPages}</b>
                <span>{stats.estimatedPages === 1 ? 'página estimada' : 'páginas estimadas'}</span>
              </div>
              <div className="stat">
                <b>
                  {stats.bulletsWithMetrics}/{stats.bullets}
                </b>
                <span>logros con cifras</span>
              </div>
              <div className="stat">
                <b>{completeness.score}%</b>
                <span>perfil completo</span>
              </div>
            </div>

            <div className="stack" style={{ marginTop: 14 }}>
              {stats.estimatedPages > 2 && (
                <div className="issue issue-warn">
                  <span className="issue-icon">!</span>
                  <div>
                    <strong>El CV se está yendo largo</strong>
                    <p>Con menos de 10 años de experiencia, una página basta; dos es el techo razonable.</p>
                  </div>
                </div>
              )}
              {stats.bullets > 0 && stats.bulletsWithMetrics / stats.bullets < 0.5 && (
                <div className="issue issue-warn">
                  <span className="issue-icon">!</span>
                  <div>
                    <strong>Menos de la mitad de tus logros tiene cifras</strong>
                    <p>Revisa cada uno en el perfil: el botón de revisión te dice cuál falta.</p>
                  </div>
                </div>
              )}
              {stats.repeatedVerbs.length > 0 && (
                <div className="issue issue-tip">
                  <span className="issue-icon">i</span>
                  <div>
                    <strong>Verbos repetidos</strong>
                    <p>
                      {stats.repeatedVerbs
                        .slice(0, 3)
                        .map((v) => `«${v.verb}» ×${v.count}`)
                        .join(', ')}
                      . Variar el verbo hace que cada logro se lea distinto.
                    </p>
                  </div>
                </div>
              )}
              {stats.estimatedPages <= 2 && stats.repeatedVerbs.length === 0 && stats.bulletsWithMetrics >= stats.bullets / 2 && (
                <div className="issue issue-ok">
                  <span className="issue-icon">✓</span>
                  <div>
                    <strong>Sin observaciones</strong>
                    <p>Largo razonable, logros medidos y verbos variados.</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card
            title="¿Calza con la oferta?"
            subtitle="Pega la descripción del aviso y compara: los filtros automáticos buscan literalmente estas palabras."
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
                      Agrégalas solo si son verdad. Inflar el CV con palabras que no puedes defender
                      en la entrevista es la forma más rápida de quedar fuera.
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
