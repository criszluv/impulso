import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, CircleHelp, Pencil } from 'lucide-react';
import { useApp } from '../state/context';
import type { Application } from '../types';
import { compareJob } from '../lib/jobComparison';
import { Button, TextArea } from './ui';

export function JobReview({ application: a }: { application: Application }) {
  const { state, apply } = useApp(),
    pref = state.preferences;
  const result = useMemo(
    () => compareJob(a.jobDescription, state.profile, state.cv),
    [a.jobDescription, state.profile, state.cv],
  );
  const [edit, setEdit] = useState(!a.jobDescription.trim());
  const labels = {
    related: 'Información relacionada en tu CV',
    missing: 'No aparece en las secciones revisadas',
    review: 'Necesita tu revisión',
  };
  const update = (text: string) =>
    apply((s) => ({
      ...s,
      applications: s.applications.map((x) =>
        x.id === a.id ? { ...x, jobDescription: text, updatedAt: new Date().toISOString() } : x,
      ),
    }));
  return (
    <section className="job-review" aria-label="Comparación del aviso con mi currículum">
      <div className="section-heading">
        <h2>¿Qué puedes destacar para este trabajo?</h2>
        <span className="pill mint">Comparación local</span>
      </div>
      <p>
        Comparamos temas del aviso con la información que incluyes en tu currículum. Cada
        coincidencia muestra de dónde sale.
      </p>
      {!a.jobDescription.trim() && (
        <p className="notice">
          Añade la descripción y los requisitos para comparar este aviso con tu CV. El título del
          puesto por sí solo no basta.
        </p>
      )}
      {edit || !a.jobDescription.trim() ? (
        <>
          <TextArea
            label="Aviso para comparar con mi CV"
            value={a.jobDescription}
            onChange={(e) => {
              setEdit(true);
              update(e.target.value);
            }}
            rows={7}
            hint="Pega lo que dice el aviso. La comparación se actualiza aquí y no envía tus datos a un servicio externo."
          />
          <Button onClick={() => setEdit(false)} disabled={!a.jobDescription.trim()}>
            Terminar de editar el aviso
          </Button>
        </>
      ) : (
        <Button onClick={() => setEdit(true)}>Revisar o editar el texto del aviso</Button>
      )}
      {a.jobDescription.trim() && !result.hasProfile && (
        <p className="notice">
          Tu CV todavía no tiene experiencia, estudios o habilidades para comparar.{' '}
          <Link to="/empezar">Completar mi currículum</Link>. No sacamos conclusiones por la falta
          de datos.
        </p>
      )}
      {!!a.jobDescription.trim() && result.hasProfile && (
        <>
          {result.items.length > 0 ? (
            <>
              <div className="comparison-counts" aria-label="Resumen de temas reconocidos">
                <div>
                  <strong>{result.counts.related}</strong>
                  <span>Con información relacionada</span>
                </div>
                <div>
                  <strong>{result.counts.missing}</strong>
                  <span>Sin información visible</span>
                </div>
                <div>
                  <strong>{result.counts.review}</strong>
                  <span>Para revisar contigo</span>
                </div>
              </div>
              <p className="field-hint">
                Reconocimos {result.items.length} temas. Estos números no son una nota ni una
                probabilidad de contratación. Una coincidencia de texto no confirma que cumplas el
                requisito.
              </p>
              <div className="comparison-items">
                {result.items.map((item) => (
                  <article className="comparison-item" key={item.id}>
                    <div className="row">
                      <span
                        className={
                          'pill ' +
                          (item.status === 'related'
                            ? 'mint'
                            : item.status === 'missing'
                              ? 'peach'
                              : 'yellow')
                        }
                      >
                        {item.status === 'related' ? <Check size={15} /> : <CircleHelp size={15} />}{' '}
                        {labels[item.status]}
                      </span>
                    </div>
                    <h3>{item.label}</h3>
                    <p>
                      <strong>En el aviso:</strong> «{item.quote}»
                    </p>
                    {item.evidence.length > 0 ? (
                      <div className="comparison-evidence">
                        <strong>En tu currículum:</strong>
                        {item.evidence.map((e, i) => (
                          <p key={i}>
                            «{e.text}» <small>— {e.section}</small>
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="muted">
                        No encontramos información sobre este tema en las secciones revisadas. Eso
                        no significa que no sepas hacerlo.
                      </p>
                    )}
                    <p>
                      <strong>Siguiente paso:</strong> {item.suggestion}
                    </p>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <p className="notice">
              No reconocimos temas suficientes para una comparación automática. Lee el aviso
              completo y compáralo con tus tareas y estudios; esto no indica falta de
              compatibilidad.
            </p>
          )}
          {result.other.length > 0 && (
            <details>
              <summary>Otros requisitos que conviene revisar</summary>
              <ul>
                {result.other.map((text, i) => (
                  <li key={i}>{text}</li>
                ))}
              </ul>
              <p className="field-hint">No evaluamos automáticamente estas frases.</p>
            </details>
          )}
          <div className="row">
            <Link className="btn btn-subtle" to="/perfil">
              <Pencil size={17} />
              Mejorar los datos de mi CV
            </Link>
            <Link className="text-link" to="/cv">
              Ver mi currículum
            </Link>
          </div>
          <details>
            <summary>Cómo interpretar esta comparación</summary>
            <p>
              La revisión reconoce un conjunto limitado de temas frecuentes en español e inglés.
              Busca información en tu perfil, tareas, habilidades, estudios y las secciones que
              tienes visibles en el CV. No cuenta como experiencia el cargo que dices querer
              conseguir.
            </p>
            <p>
              Los idiomas, títulos, permisos y años de experiencia requieren tu revisión: hay que
              comprobar nivel, especialidad, vigencia y fechas. No comprobamos equivalencias de
              títulos ni acumulamos duraciones de trabajos que podrían solaparse. No usamos datos
              personales para valorar tu candidatura.
            </p>
            <p>
              Lee también el aviso completo: puede contener requisitos que esta revisión no haya
              reconocido. Agrega a tu CV únicamente información verdadera y conserva lo que la
              empresa necesita saber.
            </p>
          </details>
        </>
      )}
      <h3 className="comparison-logistics">Antes de enviar, revisa también</h3>
      <dl className="job-facts">
        <div>
          <dt>Lugar del trabajo</dt>
          <dd>{a.location || 'No está anotado. Revísalo en el aviso.'}</dd>
        </div>
        <div>
          <dt>Sueldo publicado</dt>
          <dd>{a.salary || 'No está anotado. Puedes consultarlo a la empresa.'}</dd>
        </div>
        <div>
          <dt>Tu disponibilidad</dt>
          <dd>
            {[pref.schedule, pref.travel].filter(Boolean).join(' · ') ||
              'Piensa en los horarios y traslados que puedes hacer.'}
          </dd>
        </div>
      </dl>
    </section>
  );
}
