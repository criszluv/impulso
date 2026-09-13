import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  FileText,
  Search,
  Bookmark,
  Check,
  Sprout,
  Upload,
  CalendarDays,
} from 'lucide-react';
import { useApp } from '../state/context';
import { localDate, readyChecks } from '../lib/journey';
import { formatDate } from '../lib/utils';

export function Dashboard() {
  const { state } = useApp();
  const { profile, applications } = state;
  const checks = readyChecks(profile),
    ready = checks.every((c) => c.done);
  const started = !!profile.personal.fullName || !!profile.personal.headline;
  const pending = applications
    .filter((a) => a.nextStepDate && a.status !== 'rechazada')
    .sort((a, b) => a.nextStepDate.localeCompare(b.nextStepDate));
  const next = pending.find((a) => a.nextStepDate <= localDate());
  const name = profile.personal.fullName.split(' ')[0];
  return (
    <>
      <div className="eyebrow">
        <span className="status-dot" /> A tu ritmo, paso a paso
      </div>
      <section className="home-hero">
        <div className="hero-copy">
          <h1>
            {name ? (
              <>
                Hola, {name}.<br />
                Tu próximo paso
                <br />
                <em>empieza aquí.</em>
              </>
            ) : (
              <>
                Tu próximo trabajo
                <br />
                empieza con
                <br />
                <em>un pequeño paso.</em>
              </>
            )}
          </h1>
          <p>
            Lo que sabes hacer tiene valor. Prepara tu currículum, encuentra oportunidades y lleva
            tu búsqueda con tranquilidad.
          </p>
          <div className="row">
            <Link
              className="btn btn-primary"
              to={
                next
                  ? '/postulaciones?ver=' + next.id
                  : ready
                    ? '/buscar'
                    : started
                      ? '/empezar'
                      : '/empezar'
              }
            >
              {next
                ? 'Ver mi pendiente'
                : ready
                  ? 'Buscar oportunidades'
                  : started
                    ? 'Continuar mi currículum'
                    : 'Empezar mi currículum'}
              <ArrowRight size={19} />
            </Link>
            {!started && (
              <Link className="text-link" to="/importar">
                <Upload size={17} />
                Ya tengo un currículum
              </Link>
            )}
          </div>
          <div className="hero-note">
            <Check size={16} />
            Sin registro <span>·</span> Tú decides qué compartir
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-disc" />
          <div className="art-grid" />
          <div className="resume-art">
            <div className="art-top">
              <span className="avatar-art">{name ? name[0] : 'Tú'}</span>
              <span className="art-check">
                <Check size={19} />
              </span>
            </div>
            <b>{name ? profile.personal.fullName : 'Tu nombre, tu historia'}</b>
            <span>{profile.personal.headline || 'Todo lo que sabes hacer'}</span>
            <div className="art-rule" />
            <small>EXPERIENCIA Y HABILIDADES</small>
            <i />
            <i />
            <i className="short" />
            <div className="art-tags">
              <span>Mi experiencia</span>
              <span>Mis ganas</span>
            </div>
          </div>
          <div className="art-sticker">
            <Sprout size={23} />
            <span>
              Hay un lugar
              <br />
              <b>para tu talento.</b>
            </span>
          </div>
          <div className="art-star">✳</div>
        </div>
      </section>
      <div className="section-heading">
        <div>
          <span className="eyebrow">Tu camino</span>
          <h2>Vamos por partes.</h2>
        </div>
        <span className="muted">No necesitas hacerlo todo hoy.</span>
      </div>
      <div className="journey-grid">
        {[
          {
            n: '01',
            title: 'Cuenta lo que sabes',
            text: 'Te hacemos preguntas sencillas y armamos tu currículum contigo.',
            to: '/empezar',
            icon: FileText,
            color: 'mint',
            action: ready ? 'Revisar mis datos' : 'Crear mi currículum',
          },
          {
            n: '02',
            title: 'Encuentra tu lugar',
            text: 'Busca trabajos según tu experiencia, tu comuna y tus horarios.',
            to: '/buscar',
            icon: Search,
            color: 'peach',
            action: 'Buscar trabajo',
          },
          {
            n: '03',
            title: 'Sigue cada oportunidad',
            text: 'Recuerda dónde postulaste y qué tienes que hacer después.',
            to: '/postulaciones',
            icon: Bookmark,
            color: 'yellow',
            action: 'Ver mis postulaciones',
          },
        ].map((c) => (
          <Link to={c.to} className={'journey-card ' + c.color} key={c.n}>
            <div className="journey-top">
              <span className="icon-tile">
                <c.icon size={24} />
              </span>
              <span className="step-number">{c.n}</span>
            </div>
            <h3>{c.title}</h3>
            <p>{c.text}</p>
            <span className="card-link">
              {c.action}
              <ArrowUpRight size={19} />
            </span>
          </Link>
        ))}
      </div>
      {pending.length > 0 && (
        <section className="upcoming">
          <div className="section-heading">
            <h2>
              <CalendarDays size={23} /> Lo que viene
            </h2>
            <Link to="/postulaciones" className="text-link">
              Ver todo
              <ArrowRight size={17} />
            </Link>
          </div>
          {pending.slice(0, 3).map((a) => (
            <Link key={a.id} to={'/postulaciones?ver=' + a.id} className="task-row">
              <span className="task-date">{formatDate(a.nextStepDate)}</span>
              <span>
                <strong>{a.nextStep || 'Revisar postulación'}</strong>
                <small>
                  {a.role} · {a.company}
                </small>
              </span>
              <ArrowUpRight size={19} />
            </Link>
          ))}
        </section>
      )}
      <aside className="gentle-note">
        <Sprout size={22} />
        <p>
          <strong>Tu experiencia también cuenta.</strong> Trabajos por cuenta propia, apoyo en un
          negocio familiar, cuidados o voluntariados: podemos ayudarte a incluirlos.
        </p>
      </aside>
    </>
  );
}
