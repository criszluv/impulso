import { Link } from 'react-router-dom';
import { useApp } from '../state/context';
import { cvStats, profileCompleteness, totalExperienceMonths } from '../lib/analysis';
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

export function Dashboard() {
  const { state, replaceAll } = useApp();
  const { profile, applications } = state;
  const completeness = profileCompleteness(profile);
  const stats = cvStats(profile);
  const pending = completeness.items.filter((i) => !i.done);

  const active = applications.filter((a) => a.status !== 'rechazada');
  const interviews = applications.filter((a) => a.status === 'entrevista' || a.status === 'oferta');

  const upcoming = applications
    .filter((a) => a.nextStepDate && a.status !== 'rechazada')
    .sort((a, b) => a.nextStepDate.localeCompare(b.nextStepDate))
    .slice(0, 5);

  const stale = applications.filter((a) => {
    if (a.status !== 'postulada' || !a.appliedAt) return false;
    const d = daysSince(a.appliedAt);
    return d !== null && d >= 7;
  });

  const isEmpty = !profile.personal.fullName && applications.length === 0;
  const firstName = profile.personal.fullName.split(' ')[0];

  if (isEmpty) {
    return (
      <>
        <div className="page-head">
          <div>
            <h1>Bienvenido a Impulso</h1>
            <p>
              Un espacio para ordenar tu búsqueda de trabajo: armas tu perfil una vez, y desde ahí
              salen el CV, las cartas y el seguimiento de cada postulación. Todo se guarda en este
              navegador, sin cuentas ni servidores.
            </p>
          </div>
        </div>
        <Card>
          <Empty
            title="Empieza por tu perfil"
            text="Carga tus datos, experiencia y habilidades una sola vez. Si prefieres ver cómo funciona antes de escribir nada, puedes cargar un perfil de ejemplo y borrarlo después."
            action={
              <div className="row" style={{ justifyContent: 'center' }}>
                <Link to="/perfil">
                  <Button variant="primary">Crear mi perfil</Button>
                </Link>
                <Button onClick={() => replaceAll(demoState())}>Ver con datos de ejemplo</Button>
              </div>
            }
          />
        </Card>
        <div className="grid">
          {[
            { t: 'Redacción asistida', d: 'Convierte «encargado de atención al cliente» en un logro con verbo, contexto y cifra.' },
            { t: 'CV a la medida', d: 'Tres plantillas listas para imprimir a PDF, y un comparador contra la oferta real.' },
            { t: 'Nada se pierde', d: 'Cada postulación con su estado, su próximo paso y el recordatorio de hacer seguimiento.' },
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
              <div style={{ marginTop: 12 }}>
                <Link to="/perfil">
                  <Button size="sm">Ir al perfil</Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Números" subtitle="Tu búsqueda en cifras.">
          <div className="grid">
            <div className="stat">
              <b>{active.length}</b>
              <span>postulaciones activas</span>
            </div>
            <div className="stat">
              <b>{interviews.length}</b>
              <span>en entrevista u oferta</span>
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

      {stale.length > 0 && (
        <Card
          title="Sin respuesta hace más de una semana"
          subtitle="Un correo corto de seguimiento reactiva más procesos de los que uno cree."
        >
          <ul className="checklist">
            {stale.map((a) => (
              <li key={a.id}>
                <span className="mark">!</span>
                <div style={{ flex: 1 }}>
                  <span className="label">
                    <strong>{a.role}</strong> en {a.company}
                  </span>
                  <small>Postulaste hace {daysSince(a.appliedAt)} días</small>
                </div>
                <Link to="/postulaciones">
                  <Button size="sm" variant="ghost">
                    Abrir
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
