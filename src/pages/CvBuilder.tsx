import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Pencil, Upload, FileText, Check } from 'lucide-react';
import { useApp } from '../state/context';
import { readyChecks } from '../lib/journey';
import { buildCvPdf } from '../lib/pdf';
import { DownloadCv } from '../components/DownloadCv';
import { PdfPreview } from '../components/PdfPreview';
import { Select, Toggle } from '../components/ui';
import { CvDocument } from '../cv/CvDocument';
import type { CvFont, TemplateId } from '../types';

export function CvBuilder() {
  const { state, patchCv } = useApp(),
    { profile, cv } = state;
  const hasProfile = !!profile.personal.fullName || !!profile.personal.headline;
  const checks = readyChecks(profile),
    missing = checks.filter((c) => !c.done);
  const blob = useMemo(() => buildCvPdf(profile, cv), [profile, cv]);
  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Tu experiencia tiene valor</span>
          <h1>Mi currículum</h1>
          <p>
            {hasProfile
              ? 'Revisa tus datos. Cuando esté listo, descárgalo y úsalo para postular.'
              : 'Vamos a convertir lo que sabes hacer en tu primer currículum.'}
          </p>
        </div>
        <span className="page-icon mint">
          <FileText size={28} />
        </span>
      </div>
      {!hasProfile ? (
        <section className="empty-welcome">
          <FileText size={46} />
          <h2>Un currículum hecho contigo.</h2>
          <p>
            Responde unas preguntas sencillas. No necesitas experiencia previa ni saber cómo
            redactarlo.
          </p>
          <div className="row">
            <Link to="/empezar" className="btn btn-primary">
              Crear mi currículum
              <ArrowRight size={18} />
            </Link>
            <Link to="/importar" className="btn btn-subtle">
              <Upload size={18} />
              Ya tengo uno
            </Link>
          </div>
        </section>
      ) : (
        <>
          <div className="cv-workspace">
            <aside className="cv-controls">
              <div className="card">
                <div className="card-body">
                  <h2>Tu información</h2>
                  <ul className="readiness-list">
                    {checks.map((c) => (
                      <li key={c.label}>
                        <span className={c.done ? 'check-done' : 'check-pending'}>
                          {c.done ? <Check size={15} /> : '·'}
                        </span>
                        {c.label}
                      </li>
                    ))}
                  </ul>
                  {missing.length > 0 && (
                    <p className="field-hint">
                      Puedes descargar un borrador y completar lo que falta después.
                    </p>
                  )}
                  <Link className="btn btn-subtle" to="/perfil">
                    <Pencil size={17} />
                    Editar mis datos
                  </Link>
                  <Link className="text-link" to="/empezar">
                    Prefiero hacerlo paso a paso
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
              <div className="card">
                <div className="card-body">
                  <h2>Elige un estilo</h2>
                  <div className="template-options">
                    {[
                      { id: 'ats', name: 'Esencial' },
                      { id: 'clasico', name: 'Con color' },
                      { id: 'compacto', name: 'Compacto' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        aria-pressed={
                          cv.template === t.id || (cv.template === 'moderno' && t.id === 'clasico')
                        }
                        onClick={() => patchCv({ template: t.id as TemplateId })}
                        className={cv.template === t.id ? 'selected' : ''}
                      >
                        <span className={'mini-page ' + t.id}>
                          <i />
                          <i />
                          <i />
                          <i />
                        </span>
                        {t.name}
                      </button>
                    ))}
                  </div>
                  <details>
                    <summary>Personalizar el documento</summary>
                    <Select
                      label="Letra"
                      value={cv.font}
                      onChange={(e) => patchCv({ font: e.target.value as CvFont })}
                    >
                      <option value="arial">Arial</option>
                      <option value="calibri">Calibri (PDF: sans serif)</option>
                      <option value="georgia">Georgia (PDF: serif)</option>
                      <option value="times">Times</option>
                    </Select>
                    <label className="field">
                      <span className="field-label">Color del documento</span>
                      <input
                        type="color"
                        aria-label="Color del documento"
                        value={cv.accent}
                        onChange={(e) => patchCv({ accent: e.target.value })}
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">Tamaño de letra</span>
                      <input
                        aria-label="Tamaño de letra"
                        type="range"
                        min=".85"
                        max="1.15"
                        step=".05"
                        value={cv.fontScale}
                        onChange={(e) => patchCv({ fontScale: Number(e.target.value) })}
                      />
                    </label>
                    <Toggle
                      label="Incluir resumen"
                      checked={cv.showSummary}
                      onChange={(v) => patchCv({ showSummary: v })}
                    />
                    <Toggle
                      label="Incluir proyectos"
                      checked={cv.showProjects}
                      onChange={(v) => patchCv({ showProjects: v })}
                    />
                    <Toggle
                      label="Incluir cursos y certificaciones"
                      checked={cv.showCertifications}
                      onChange={(v) => patchCv({ showCertifications: v })}
                    />
                    <Toggle
                      label="Incluir idiomas"
                      checked={cv.showLanguages}
                      onChange={(v) => patchCv({ showLanguages: v })}
                    />
                    {profile.personal.photo && (
                      <Toggle
                        label="Incluir foto"
                        checked={cv.showPhoto}
                        onChange={(v) => patchCv({ showPhoto: v })}
                      />
                    )}
                  </details>
                </div>
              </div>
              <div className="stack">
                <DownloadCv />
                <DownloadCv share />
                <p className="field-hint">Se descarga un PDF. No necesitas una impresora.</p>
                <details>
                  <summary>Qué revisar antes de enviar</summary>
                  <ul className="plain-steps">
                    <li>
                      Presenta primero tus experiencias más recientes. Puedes ordenarlas por fecha
                      en la guía.
                    </li>
                    <li>
                      Destaca tareas y estudios relacionados con el aviso. Usa ejemplos verdaderos y
                      lenguaje claro.
                    </li>
                    <li>
                      Revisa fechas, ortografía y datos de contacto. La foto sigue siendo opcional.
                    </li>
                  </ul>
                  <a
                    className="text-link"
                    href="https://europass.europa.eu/es/create-europass-cv"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Orientaciones de Europass para preparar un CV
                  </a>
                </details>
              </div>
            </aside>
            <section className="preview-panel" aria-label="Vista previa del currículum">
              <div className="preview-heading">
                <span>Así se verá tu currículum</span>
                <span className="pill mint">PDF</span>
              </div>
              <PdfPreview blob={blob} />
              <details>
                <summary>Leer el contenido como texto</summary>
                <CvDocument profile={profile} config={cv} />
              </details>
            </section>
          </div>
          <section className="next-action">
            <div>
              <span className="eyebrow">El siguiente paso</span>
              <h2>Tu currículum puede abrir una puerta.</h2>
              <p>Busca un aviso y te ayudamos a preparar la postulación.</p>
            </div>
            <Link to="/buscar" className="btn btn-primary">
              Buscar trabajo
              <ArrowRight size={18} />
            </Link>
          </section>
          <div className="row">
            <Link className="text-link" to="/cartas">
              Preparar una carta de presentación
              <ArrowRight size={16} />
            </Link>
            <Link className="text-link" to="/importar">
              Traer datos de otro currículum
              <Upload size={16} />
            </Link>
          </div>
        </>
      )}
    </>
  );
}
