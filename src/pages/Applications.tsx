import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Bookmark,
  ExternalLink,
  CalendarDays,
  Check,
  Mail,
} from 'lucide-react';
import { useApp } from '../state/context';
import type { Application, ApplicationStatus } from '../types';
import { uid, formatDate, download } from '../lib/utils';
import {
  applicationMessage,
  calendarFile,
  localDate,
  safeUrl,
  STATUS_LABELS,
} from '../lib/journey';
import { parseJobPosting } from '../lib/import/parseJob';
import { TextInput, TextArea, Select, Button, ConfirmButton, CopyButton } from '../components/ui';
import { JobReview } from '../components/JobReview';
import { DownloadCv } from '../components/DownloadCv';

const empty = (): Application => ({
  id: uid('app'),
  company: '',
  role: '',
  location: '',
  url: '',
  source: '',
  salary: '',
  status: 'guardada',
  appliedAt: '',
  nextStep: '',
  nextStepDate: '',
  contact: '',
  notes: '',
  jobDescription: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
export function Applications() {
  const { state, apply } = useApp();
  const [params, setParams] = useSearchParams();
  const [adding, setAdding] = useState(params.has('nueva')),
    [draft, setDraft] = useState(empty),
    [error, setError] = useState('');
  const [filter, setFilter] = useState('todas'),
    [search, setSearch] = useState(''),
    [pendingSend, setPendingSend] = useState<string | null>(null),
    [recipient, setRecipient] = useState(''),
    [deleted, setDeleted] = useState<Application | null>(null),
    [readNote, setReadNote] = useState('');
  const selected = state.applications.find((a) => a.id === params.get('ver'));
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, [selected?.id]);
  const patch = (id: string, fields: Partial<Application>) =>
    apply((s) => ({
      ...s,
      applications: s.applications.map((a) =>
        a.id === id ? { ...a, ...fields, updatedAt: new Date().toISOString() } : a,
      ),
    }));
  const changeStatus = (a: Application, status: ApplicationStatus) =>
    patch(a.id, {
      status,
      ...(status === 'postulada' && !a.appliedAt ? { appliedAt: localDate() } : {}),
    });
  const create = () => {
    if (!draft.role.trim()) {
      setError('Escribe el nombre del trabajo que te interesa.');
      return;
    }
    if (draft.url && !safeUrl(draft.url)) {
      setError('El enlace debe comenzar con https:// o http://. También puedes dejarlo vacío.');
      return;
    }
    apply((s) => ({ ...s, applications: [draft, ...s.applications] }));
    setParams({ ver: draft.id });
    setAdding(false);
    setDraft(empty());
    setError('');
  };
  const readPosting = () => {
    const fields = parseJobPosting(draft.jobDescription, draft.url);
    setDraft((d) => ({
      ...d,
      role: fields.role || d.role,
      company: fields.company || d.company,
      location: fields.location || d.location,
      salary: fields.salary || d.salary,
      source: fields.source || d.source,
    }));
    setReadNote(
      'Revisa los datos: la lectura puede equivocarse. Corrige lo que haga falta antes de guardar.',
    );
  };
  const list = state.applications.filter(
    (a) =>
      (filter === 'todas' || a.status === filter) &&
      [a.company, a.role, a.location]
        .join(' ')
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  const link = selected ? safeUrl(selected.url) : null;
  const message = selected ? applicationMessage(selected, state.profile) : '';
  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Que ninguna se te olvide</span>
          <h1>Mis postulaciones</h1>
          <p>Guarda las oportunidades que te interesan y anota lo que va pasando.</p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setAdding(true);
            setParams({ nueva: '1' });
          }}
        >
          <Plus size={18} />
          Guardar un aviso
        </Button>
      </div>
      {deleted && (
        <div role="status" className="notice">
          Aviso eliminado.{' '}
          <Button
            onClick={() => {
              apply((s) => ({ ...s, applications: [deleted, ...s.applications] }));
              setDeleted(null);
            }}
          >
            Deshacer
          </Button>
        </div>
      )}
      {adding ? (
        <section className="form-sheet">
          <h2>¿Qué trabajo te interesa?</h2>
          <p>
            Guardar el aviso te permite volver a él. La postulación se envía después, en la página
            de la empresa o por correo.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create();
            }}
          >
            <div className="grid-2">
              <TextInput
                label="Nombre del trabajo"
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                placeholder="Por ejemplo: auxiliar de cocina"
              />
              <TextInput
                label="Empresa (si aparece)"
                value={draft.company}
                onChange={(e) => setDraft({ ...draft, company: e.target.value })}
              />
              <TextInput
                label="Enlace del aviso (opcional)"
                value={draft.url}
                onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                placeholder="https://…"
                hint="Pega la dirección de la página donde encontraste el trabajo."
              />
              <TextInput
                label="Comuna o ciudad (si aparece)"
                value={draft.location}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              />
            </div>
            <details>
              <summary>Tengo el texto del aviso: ayudarme a completar los datos</summary>
              <TextArea
                label="Texto del aviso"
                rows={6}
                value={draft.jobDescription}
                onChange={(e) => setDraft({ ...draft, jobDescription: e.target.value })}
                hint="Selecciona el texto en la otra página, cópialo y pégalo aquí."
              />
              <Button type="button" disabled={!draft.jobDescription.trim()} onClick={readPosting}>
                Completar con este texto
              </Button>
              {readNote && <p role="status">{readNote}</p>}
            </details>
            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}
            <div className="row">
              <Button type="submit" variant="primary">
                Guardar aviso
                <Check size={18} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setAdding(false);
                  setParams({});
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </section>
      ) : selected ? (
        <section className="application-detail">
          <button className="text-link" onClick={() => setParams({})}>
            <ArrowLeft size={16} />
            Volver a mis postulaciones
          </button>
          <div className="detail-heading">
            <div>
              <span className="pill mint">{STATUS_LABELS[selected.status]}</span>
              <h2 tabIndex={-1} ref={titleRef}>
                {selected.role || 'Trabajo sin nombre'}
              </h2>
              <p>{[selected.company, selected.location].filter(Boolean).join(' · ')}</p>
            </div>
            <Select
              label="¿En qué va?"
              value={selected.status}
              onChange={(e) => changeStatus(selected, e.target.value as ApplicationStatus)}
            >
              {Object.entries(STATUS_LABELS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </Select>
          </div>
          {selected.status === 'guardada' && (
            <section className="send-guide">
              <span className="eyebrow">Todavía no has enviado esta postulación</span>
              <h3>Vamos a preparar el envío.</h3>
              <ol className="plain-steps">
                <li>
                  Descarga tu currículum y revisa que tenga tu contacto.
                  <div className="row">
                    <DownloadCv />
                    <Link to="/cv" className="text-link">
                      Revisarlo primero
                    </Link>
                  </div>
                </li>
                <li>
                  Abre el aviso y sigue las instrucciones de la empresa.
                  {link ? (
                    <a
                      className="btn btn-subtle"
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setPendingSend(selected.id)}
                    >
                      Abrir aviso
                      <ExternalLink size={17} />
                    </a>
                  ) : (
                    <p>
                      Agrega el enlace en «Datos del aviso» o usa el correo indicado por la empresa.
                    </p>
                  )}
                </li>
                <li>Cuando hayas terminado, vuelve aquí y confirma el envío.</li>
              </ol>
              <Button variant="primary" onClick={() => setPendingSend(selected.id)}>
                Ya terminé, registrar mi envío
                <ArrowRight size={17} />
              </Button>
            </section>
          )}
          {pendingSend === selected.id && selected.status === 'guardada' && (
            <div className="confirm-send" role="region" aria-label="Confirmar postulación">
              <h3>¿Pudiste enviar tu postulación?</h3>
              <p>Confirma solo si completaste el envío en la otra página o en tu correo.</p>
              <div className="row">
                <Button
                  variant="primary"
                  onClick={() => {
                    changeStatus(selected, 'postulada');
                    setPendingSend(null);
                  }}
                >
                  Sí, ya la envié
                </Button>
                <Button onClick={() => setPendingSend(null)}>Todavía no</Button>
              </div>
            </div>
          )}
          {selected.status === 'postulada' && (
            <p className="notice">
              <Check size={18} /> Registraste el envío el {formatDate(selected.appliedAt)}. Puedes
              anotar un recordatorio para revisarlo después.
            </p>
          )}
          <JobReview application={selected} />
          <div className="grid-2">
            <section className="card">
              <div className="card-body">
                <h3>
                  <CalendarDays size={20} />
                  Mi próximo paso
                </h3>
                <TextInput
                  label="¿Qué quieres recordar?"
                  value={selected.nextStep}
                  onChange={(e) => patch(selected.id, { nextStep: e.target.value })}
                  placeholder="Por ejemplo: llamar para consultar"
                />
                <TextInput
                  label="¿Qué día?"
                  type="date"
                  value={selected.nextStepDate}
                  onChange={(e) => patch(selected.id, { nextStepDate: e.target.value })}
                />
                <Button
                  disabled={!selected.nextStepDate}
                  onClick={() =>
                    download('Recordatorio.ics', calendarFile(selected), 'text/calendar')
                  }
                >
                  Añadir a mi calendario
                </Button>
                <p className="field-hint">
                  Descarga un recordatorio para abrirlo en tu calendario. Impulso solo muestra
                  pendientes mientras lo estás usando.
                </p>
              </div>
            </section>
            <section className="card">
              <div className="card-body">
                <h3>Mis notas</h3>
                <TextArea
                  label="¿Qué pasó o qué quieres recordar?"
                  value={selected.notes}
                  onChange={(e) => patch(selected.id, { notes: e.target.value })}
                  rows={5}
                  placeholder="Con quién hablaste, qué te pidieron…"
                />
                {(selected.status === 'entrevista' || selected.status === 'oferta') && (
                  <Link className="btn btn-subtle" to="/entrevistas">
                    Preparar mi entrevista
                    <ArrowRight size={17} />
                  </Link>
                )}
              </div>
            </section>
          </div>
          <details>
            <summary>Preparar un correo para esta empresa</summary>
            <p>
              Usa el correo indicado en el aviso. Abriremos un borrador que tú puedes revisar y
              enviar.
            </p>
            <TextInput
              label="Correo de la empresa"
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="seleccion@empresa.cl"
            />
            <TextArea label="Texto para copiar" value={message} readOnly rows={8} />
            <div className="row">
              <CopyButton text={message} label="Copiar mensaje" />
              {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) && (
                <a
                  className="btn btn-primary"
                  href={
                    'mailto:' +
                    encodeURIComponent(recipient) +
                    '?subject=' +
                    encodeURIComponent('Postulación: ' + selected.role) +
                    '&body=' +
                    encodeURIComponent(message)
                  }
                >
                  <Mail size={17} />
                  Abrir mi correo
                </a>
              )}
            </div>
            <p className="notice">
              Adjunta el PDF desde la carpeta Descargas. El currículum no se adjunta automáticamente
              y abrir el borrador no envía el correo.
            </p>
            <Link to="/cartas" className="text-link">
              Preparar una carta más detallada
              <ArrowRight size={16} />
            </Link>
          </details>
          <details>
            <summary>Datos del aviso</summary>
            <div className="grid-2">
              <TextInput
                label="Trabajo"
                value={selected.role}
                onChange={(e) => patch(selected.id, { role: e.target.value })}
              />
              <TextInput
                label="Empresa"
                value={selected.company}
                onChange={(e) => patch(selected.id, { company: e.target.value })}
              />
              <TextInput
                label="Ubicación"
                value={selected.location}
                onChange={(e) => patch(selected.id, { location: e.target.value })}
              />
              <TextInput
                label="Sueldo publicado (si aparece)"
                value={selected.salary}
                onChange={(e) => patch(selected.id, { salary: e.target.value })}
              />
              <TextInput
                label="Enlace"
                value={selected.url}
                onChange={(e) => patch(selected.id, { url: e.target.value })}
              />
              <TextInput
                label="Contacto"
                value={selected.contact}
                onChange={(e) => patch(selected.id, { contact: e.target.value })}
              />
              <TextInput
                label="Fecha en que postulaste"
                type="date"
                value={selected.appliedAt}
                onChange={(e) => patch(selected.id, { appliedAt: e.target.value })}
              />
            </div>
            {selected.url && !link && (
              <p role="alert" className="error-text">
                El enlace no es válido. Debe comenzar con https:// o http://.
              </p>
            )}
            <TextArea
              label="Descripción y requisitos del trabajo"
              value={selected.jobDescription}
              onChange={(e) => patch(selected.id, { jobDescription: e.target.value })}
              rows={7}
            />
            {link && (
              <a className="text-link" target="_blank" rel="noreferrer" href={link}>
                Ver aviso original
                <ExternalLink size={16} />
              </a>
            )}
          </details>
          <ConfirmButton
            confirmLabel="Sí, eliminar este aviso"
            onConfirm={() => {
              setDeleted(selected);
              apply((s) => ({
                ...s,
                applications: s.applications.filter((a) => a.id !== selected.id),
              }));
              setParams({});
            }}
          >
            Eliminar aviso
          </ConfirmButton>
        </section>
      ) : (
        <>
          {state.applications.length > 0 ? (
            <>
              <div className="filter-bar">
                <TextInput
                  label="Buscar entre mis avisos"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Trabajo, empresa o ciudad"
                />
                <Select label="Mostrar" value={filter} onChange={(e) => setFilter(e.target.value)}>
                  <option value="todas">Todos mis avisos</option>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option value={k} key={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="application-list">
                {list.map((a) => (
                  <Link className="application-row" to={'?ver=' + a.id} key={a.id}>
                    <span className="company-avatar">
                      {(a.company || a.role || 'T')[0].toUpperCase()}
                    </span>
                    <div>
                      <h2>{a.role || 'Trabajo sin nombre'}</h2>
                      <p>{[a.company, a.location].filter(Boolean).join(' · ')}</p>
                      {a.nextStepDate && (
                        <small>
                          {a.nextStepDate < localDate() ? 'Pendiente: ' : ''}
                          {a.nextStep || 'Recordatorio'} · {formatDate(a.nextStepDate)}
                        </small>
                      )}
                    </div>
                    <span
                      className={
                        'pill ' +
                        (a.status === 'guardada'
                          ? 'yellow'
                          : a.status === 'rechazada'
                            ? 'neutral'
                            : 'mint')
                      }
                    >
                      {STATUS_LABELS[a.status]}
                    </span>
                    <ArrowRight size={19} />
                  </Link>
                ))}
                {!list.length && (
                  <p className="notice">
                    No hay avisos con ese filtro. Prueba otro nombre o muestra todos.
                  </p>
                )}
              </div>
            </>
          ) : (
            <section className="empty-welcome">
              <Bookmark size={44} />
              <h2>Aquí empieza tu lista de oportunidades.</h2>
              <p>
                Cuando encuentres un trabajo que te interese, guarda el aviso. No necesitas postular
                de inmediato.
              </p>
              <div className="row">
                <Link className="btn btn-primary" to="/buscar">
                  Buscar mi primer aviso
                  <ArrowRight size={18} />
                </Link>
                <Button onClick={() => setAdding(true)}>Ya encontré uno</Button>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
