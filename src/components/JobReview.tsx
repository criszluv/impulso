import { useApp } from '../state/context';
import type { Application } from '../types';

export function JobReview({ application: a }: { application: Application }) {
  const { state } = useApp(),
    pref = state.preferences;
  const topics = [
    {
      test: /licencia|conducir/i,
      label: 'Licencia de conducir',
      question:
        'El aviso menciona conducción o una licencia. Revisa la clase que piden y si la tienes.',
    },
    {
      test: /turno|nocturn|noche/i,
      label: 'Turnos',
      question: 'Revisa los horarios exactos y si puedes llegar y volver a casa.',
    },
    {
      test: /certifica|t[ií]tulo|curso/i,
      label: 'Estudios o certificados',
      question: 'Comprueba cuáles son obligatorios y cuáles son solo deseables.',
    },
    {
      test: /experiencia/i,
      label: 'Experiencia',
      question:
        'Revisa qué tareas necesitas conocer. Tu trabajo informal también puede ser relevante.',
    },
  ];
  return (
    <section className="job-review">
      <h3>Antes de postular, revisa lo importante.</h3>
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
      {a.jobDescription && (
        <ul className="review-topics">
          {topics
            .filter((t) => t.test.test(a.jobDescription))
            .map((t) => (
              <li key={t.label}>
                <strong>{t.label}.</strong> {t.question}
              </li>
            ))}
        </ul>
      )}
      <p className="field-hint">
        Esta ayuda no determina si te contratarán. Confirma los requisitos en la publicación y
        agrega a tu currículum solo lo que sea cierto.
      </p>
    </section>
  );
}
