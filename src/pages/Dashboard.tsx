import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../state/context';
import { cvStats, profileCompleteness, totalExperienceMonths } from '../lib/analysis';
import { atsReview } from '../lib/ats';
import { Badge, Button, Card, Empty, ScoreRing } from '../components/ui';
import { daysSince, formatDate, humanDuration } from '../lib/utils';
import { demoState } from '../lib/defaults';

const STATUS_LABEL: Record<string, string> = {
  guardada: 'Guardada',
  postulada: 'Postulada',
  entrevista: 'En entrevista',
  oferta: 'Oferta',
  rechazada: 'Cerrada',
};

interface NextStep {
  title: string;
  detail: string;
  action: string;
  to: string;
}

export function Dashboard() {
  const { state, replaceAll } = useApp();
  const navigate = useNavigate();
  const { profile, applications } = state;
  const completeness = profileCompleteness(profile);
  const stats = cvStats(profile);
  const ats = atsReview(profile, state.cv);
  const pending = completeness.items.filter((i) => !i.done);

  const active = applications.filter((a) => a.status !== 'rechazada');
  const interviews = applications.filter((a) => a.status === 'entrevista' || a.status === 'oferta');
  const sent = applications.filter((a) => a.status !== 'guardada');

  const upcoming = applications
    .filter((a) => a.nextStepDate && a.status !== 'rechazada')
    .sort((a, b) => a.nextStepDate.localeCompare(b.nextStepDate))
    .slice(0, 5);

  const overdue = upcoming.filter((a) => (daysSince(a.nextStepDate) ?? -1) > 0);

  const stale = applications.filter((a) => {
    if (a.status !== 'postulada' || !a.appliedAt) return false;
    const d = daysSince(a.appliedAt);
    return d !== null && d >= 7;
  });

  const isEmpty = !profile.personal.fullName && applications.length === 0;
  const firstName = profile.personal.fullName.split(' ')[0];

  // ---------- Primera vez ----------
  if (isEmpty) {
    return (
      <>
        <div className="page-head">
          <div>
            <h1>Bienvenido a Impulso</h1>
            <p>
              Ordena tu búsqueda de trabajo en un solo lugar. Lo primero es tener tu información
              cargada; desde ahí salen el CV, las cartas y el seguimiento de cada postulación.
            </p>
          </div>
        </div>

        <Card title="¿Por dónde empiezas?" subtitle="Lo más rápido es traer algo que ya tengas escrito.">
          <div className="grid">
            <button type="button" className="stat source-card" onClick={() => navigate('/importar')} style={pickStyle}>
              <span className="source-icon" aria-hidden="true">
                ▤
              </span>
              <b style={{ fontSize: 15 }}>Tengo un CV</b>
              <span>Súbelo en PDF o Word y lo reparte en las secciones. Tarda unos segundos.</span>
            </button>
            <button type="button" className="stat source-card" onClick={() => navigate('/importar')} style={pickStyle}>
              <span className="source-icon" aria-hidden="true">
                in
              </span>
              <b style={{ fontSize: 15 }}>Tengo LinkedIn</b>
              <span>Con la copia de datos de LinkedIn se traen cargos, estudios y aptitudes.</span>
            </button>
            <button type="button" className="stat source-card" onClick={() => navigate('/perfil')} style={pickStyle}>
              <span className="source-icon" aria-hidden="true">
                ✎
              </span>
              <b style={{ fontSize: 15 }}>Empiezo de cero</b>
              <span>El perfil te guía campo por campo, y el asistente arma los logros por ti.</span>
            </button>
          </div>

          <div className="row" style={{ marginTop: 16 }}>
            <Button variant="ghost" onClick={() => replaceAll(demoState())}>
              Solo quiero mirar: cargar un ejemplo
            </Button>
          </div>
        </Card>

        <div className="grid">
          {[
            { t: 'Nada sale de tu equipo', d: 'Sin cuentas ni servidores. Tus datos quedan en este navegador y puedes exportarlos cuando quieras.' },
            { t: 'CV con el formato que pasa los filtros', d: 'Plantilla de una columna, que es lo que los sistemas de reclutamiento leen bien hoy.' },
            { t: 'Redacción con criterio', d: 'Te dice cuándo un logro no tiene cifras o suena a descripción de cargo, y cómo arreglarlo.' },
          ].map((f) => (
            <div className="stat" key={f.t}>
              <b style={{ fontSize: 15 }}>{f.t}</b>
              <span>{f.d}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  // ---------- Qué conviene hacer ahora ----------
  const nextStep = ((): NextStep => {
    if (overdue.length) {
      return {
        title: `Tienes ${overdue.length} ${overdue.length === 1 ? 'paso atrasado' : 'pasos atrasados'}`,
        detail: `${overdue[0].nextStep || 'Un pendiente'} en ${overdue[0].company}, agendado para el ${formatDate(overdue[0].nextStepDate)}.`,
        action: 'Ver postulaciones',
        to: '/postulaciones',
      };
    }
    if (completeness.score < 70) {
      return {
        title: 'Termina tu perfil',
        detail: pending[0]?.label
          ? `Lo siguiente: ${pending[0].label.toLowerCase()}. ${pending[0].hint}`
          : 'Faltan datos para que el CV tenga con qué competir.',
        action: 'Ir al perfil',
        to: '/perfil',
      };
    }
    if (ats.score < 75) {
      return {
        title: 'Tu CV todavía no pasa bien los filtros',
        detail: `Va en ${ats.score}%. ${ats.checks.find((c) => !c.ok)?.detail ?? ''}`,
        action: 'Revisar el CV',
        to: '/cv',
      };
    }
    if (!applications.length) {
      return {
        title: 'Registra tu primera postulación',
        detail: 'Pega el enlace y el texto del aviso: se llenan los datos solos y puedes comparar el aviso con tu CV.',
        action: 'Agregar postulación',
        to: '/postulaciones',
      };
    }
    if (stale.length) {
      return {
        title: `${stale.length} ${stale.length === 1 ? 'postulación lleva' : 'postulaciones llevan'} más de una semana sin respuesta`,
        detail: 'Un correo corto de seguimiento reactiva más procesos de los que uno cree.',
        action: 'Ver cuáles',
        to: '/postulaciones',
      };
    }
    if (interviews.length) {
      return {
        title: 'Prepara tus entrevistas',
        detail: 'Tienes procesos avanzando. Escribe las historias que vas a contar antes de que te las pregunten.',
        action: 'Ir a entrevistas',
        to: '/entrevistas',
      };
    }
    return {
      title: 'Sigue postulando',
      detail: 'El perfil y el CV están en forma. Ahora es cuestión de volumen y de adaptar el CV a cada aviso.',
      action: 'Agregar postulación',
      to: '/postulaciones',
    };
  })();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{firstName ? `Hola, ${firstName}` : 'Tu búsqueda'}</h1>
          <p>Esto es lo que tienes en marcha hoy.</p>
        </div>
        <div className="head-actions">
          <Link to="/postulaciones">
            <Button variant="primary">Agregar postulación</Button>
          </Link>
          <Link to="/cv">
            <Button>Ver mi CV</Button>
          </Link>
        </div>
      </div>

      <div className="next-step">
        <span className="num" aria-hidden="true">
          →
        </span>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h3>{nextStep.title}</h3>
          <p>{nextStep.detail}</p>
        </div>
        <Link to={nextStep.to}>
          <Button variant="primary">{nextStep.action}</Button>
        </Link>
      </div>

      <Card title="Tu embudo" subtitle="Dónde se está cayendo el proceso.">
        <div className="funnel">
          <div className="funnel-step">
            <b>{applications.length}</b>
            <span>registradas</span>
          </div>
          <div className="funnel-step">
            <b>{sent.length}</b>
            <span>enviadas</span>
            <small>{applications.length ? `${Math.round((sent.length / applications.length) * 100)}% de las guardadas` : '—'}</small>
          </div>
          <div className="funnel-step">
            <b>{interviews.length}</b>
            <span>con entrevista</span>
            <small>{sent.length ? `${Math.round((interviews.length / sent.length) * 100)}% de respuesta` : 'sin datos aún'}</small>
          </div>
          <div className="funnel-step">
            <b>{applications.filter((a) => a.status === 'oferta').length}</b>
            <span>ofertas</span>
          </div>
        </div>
        {sent.length >= 8 && interviews.length === 0 && (
          <div className="issue issue-warn" style={{ marginTop: 14 }}>
            <span className="issue-icon">!</span>
            <div>
              <strong>{sent.length} envíos sin una sola entrevista</strong>
              <p>
                Cuando pasa esto, el problema casi nunca es la cantidad: es el CV o el calce con los
                avisos. Revisa el comparador antes de seguir enviando.
              </p>
            </div>
          </div>
        )}
      </Card>

      <div className="split">
        <Card title="Estado de tu perfil" subtitle="Lo que falta para que el CV compita de verdad.">
          <div className="row" style={{ gap: 18, alignItems: 'flex-start' }}>
            <ScoreRing value={completeness.score} label="completo" />
            <div style={{ flex: 1, minWidth: 200 }}>
              {pending.length === 0 ? (
                <p className="muted">
                  Perfil completo. Ahora el trabajo está en afinar la redacción de cada logro.
                </p>
              ) : (
                <ul className="checklist">
                  {pending.slice(0, 4).map((item) => (
                    <li key={item.label}>
                      <span className="mark">○</span>
                      <div>
                        <span className="label">{item.label}</span>
                        <small>{item.hint}</small>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="row" style={{ marginTop: 12 }}>
                <Link to="/perfil">
                  <Button size="sm">Ir al perfil</Button>
                </Link>
                <Link to="/importar">
                  <Button size="sm" variant="ghost">
                    Importar más datos
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Números" subtitle="Tu búsqueda en cifras.">
          <div className="grid">
            <div className="stat">
              <b>{ats.score}%</b>
              <span>compatible con filtros</span>
            </div>
            <div className="stat">
              <b>{active.length}</b>
              <span>postulaciones activas</span>
            </div>
            <div className="stat">
              <b>
                {stats.bulletsWithMetrics}/{stats.bullets}
              </b>
              <span>logros con cifras</span>
            </div>
            <div className="stat">
              <b>{humanDuration(totalExperienceMonths(profile)) || '—'}</b>
              <span>experiencia acumulada</span>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Próximos pasos" subtitle="Lo que agendaste en cada postulación.">
        {upcoming.length === 0 ? (
          <Empty
            title="No tienes pasos agendados"
            text="Cuando postules, anota el próximo paso y su fecha. Es lo que evita que una oportunidad se enfríe sola."
            action={
              <Link to="/postulaciones">
                <Button size="sm">Ir a postulaciones</Button>
              </Link>
            }
          />
        ) : (
          <ul className="checklist">
            {upcoming.map((a) => {
              const d = daysSince(a.nextStepDate);
              const late = d !== null && d > 0;
              return (
                <li key={a.id}>
                  <span className="mark">→</span>
                  <div style={{ flex: 1 }}>
                    <span className="label">
                      <strong>{a.role}</strong> en {a.company}
                    </span>
                    <small>
                      {a.nextStep || 'Sin descripción'} · {formatDate(a.nextStepDate)}
                    </small>
                  </div>
                  <Badge tone={late ? 'bad' : 'accent'}>{late ? 'Atrasado' : STATUS_LABEL[a.status]}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}

const pickStyle = {
  textAlign: 'left' as const,
  cursor: 'pointer',
  font: 'inherit',
  color: 'inherit',
};
