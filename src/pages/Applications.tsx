import { useMemo, useState } from 'react';
import { useApp } from '../state/context';
import { removeById, upsert } from '../lib/list';
import type { Application, ApplicationStatus } from '../types';
import { daysSince, formatDate, uid } from '../lib/utils';
import { matchJob } from '../lib/analysis';
import { parseJobPosting, sourceFromUrl } from '../lib/import/parseJob';
import {
  Button,
  Card,
  ConfirmButton,
  Empty,
  ScoreRing,
  Select,
  TextArea,
  TextInput,
} from '../components/ui';

const COLUMNS: Array<{ id: ApplicationStatus; label: string; hint: string }> = [
  { id: 'guardada', label: 'Guardada', hint: 'Te interesa, pero todavía no la envías.' },
  { id: 'postulada', label: 'Postulada', hint: 'Ya enviaste el CV. Esperando respuesta.' },
  { id: 'entrevista', label: 'Entrevista', hint: 'Te contactaron y hay proceso en curso.' },
  { id: 'oferta', label: 'Oferta', hint: 'Llegó una propuesta concreta.' },
  { id: 'rechazada', label: 'Cerrada', hint: 'Te dijeron que no, o decidiste bajarte.' },
];

function newApplication(patch: Partial<Application> = {}): Application {
  const now = new Date().toISOString();
  return {
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
    createdAt: now,
    updatedAt: now,
    ...patch,
  };
}

export function Applications() {
  const { state, setApplications } = useApp();
  const { applications, profile } = state;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<ApplicationStatus | null>(null);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [jobUrl, setJobUrl] = useState('');
  const [jobText, setJobText] = useState('');
  const [readNotes, setReadNotes] = useState<string[]>([]);

  const selected = applications.find((a) => a.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter((a) =>
      `${a.company} ${a.role} ${a.location} ${a.notes}`.toLowerCase().includes(q),
    );
  }, [applications, query]);

  const patch = (id: string, p: Partial<Application>) => {
    const app = applications.find((a) => a.id === id);
    if (!app) return;
    setApplications(upsert(applications, { ...app, ...p, updatedAt: new Date().toISOString() }));
  };

  const moveTo = (id: string, status: ApplicationStatus) => {
    const extra: Partial<Application> = { status };
    const app = applications.find((a) => a.id === id);
    if (status === 'postulada' && app && !app.appliedAt) {
      extra.appliedAt = new Date().toISOString().slice(0, 10);
    }
    patch(id, extra);
  };

  const createBlank = () => {
    const a = newApplication();
    setApplications([a, ...applications]);
    setSelectedId(a.id);
    setAdding(false);
  };

  const createFromPosting = () => {
    const parsedJob = parseJobPosting(jobText, jobUrl);
    const a = newApplication({
      role: parsedJob.role,
      company: parsedJob.company,
      location: parsedJob.location,
      salary: parsedJob.salary,
      source: parsedJob.source || sourceFromUrl(jobUrl),
      url: jobUrl.trim(),
      jobDescription: jobText.trim(),
    });
    setApplications([a, ...applications]);
    setSelectedId(a.id);
    setReadNotes(parsedJob.notes);
    setAdding(false);
    setJobUrl('');
    setJobText('');
  };

  const match = selected?.jobDescription ? matchJob(selected.jobDescription, profile) : null;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Postulaciones</h1>
          <p>
            Es el registro de cada trabajo al que postulaste: en qué estado va, qué sigue y cuándo.
            Sirve para dos cosas concretas: que ninguna oportunidad se enfríe por olvido, y ver en
            qué parte del proceso se está cayendo tu búsqueda.
          </p>
        </div>
        <div className="head-actions">
          {applications.length > 0 && (
            <input
              className="input"
              style={{ width: 180 }}
              placeholder="Buscar…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
          <Button variant="primary" onClick={() => setAdding((v) => !v)}>
            {adding ? 'Cerrar' : '+ Agregar desde un aviso'}
          </Button>
        </div>
      </div>

      {adding && (
        <Card
          title="Pega el aviso"
          subtitle="Se llenan solos el cargo, la empresa, la ubicación y el sueldo, y el texto queda guardado para comparar con tu CV."
          actions={
            <Button size="sm" variant="ghost" onClick={createBlank}>
              Prefiero llenarlo a mano
            </Button>
          }
        >
          <div className="grid">
            <TextInput
              label="Enlace del aviso"
              wide
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://www.linkedin.com/jobs/view/..."
              hint="Se guarda para que lo abras con un clic más adelante."
            />
            <TextArea
              label="Texto del aviso"
              rows={9}
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              placeholder="Abre el aviso, selecciona todo el texto de la publicación y pégalo aquí…"
            />
          </div>

          <div className="issue issue-tip" style={{ marginTop: 12 }}>
            <span className="issue-icon">i</span>
            <div>
              <strong>¿Por qué hay que pegar el texto y no basta el enlace?</strong>
              <p>
                Impulso corre entero en tu navegador y los portales de empleo bloquean que otra
                página lea sus avisos. Traerlos pasando por un servidor intermedio significaría
                mandarle a un tercero a qué postulas, y eso no compensa. Copiar y pegar toma cinco
                segundos y el texto completo es justamente lo que necesita el comparador con tu CV.
              </p>
            </div>
          </div>

          <div className="row" style={{ marginTop: 14 }}>
            <Button variant="primary" disabled={!jobText.trim() && !jobUrl.trim()} onClick={createFromPosting}>
              Leer y crear postulación
            </Button>
          </div>
        </Card>
      )}

      {readNotes.length > 0 && (
        <div className="stack" style={{ gap: 8, marginBottom: 16 }}>
          {readNotes.map((n) => (
            <div className="issue issue-warn" key={n}>
              <span className="issue-icon">!</span>
              <div>
                <strong>{n}</strong>
              </div>
            </div>
          ))}
        </div>
      )}

      {applications.length === 0 ? (
        <Card>
          <Empty
            title="Sin postulaciones registradas"
            text="Anota cada una, incluso las que todavía no envías. Ver el embudo completo es lo que te dice si el problema está en el CV o en la cantidad de envíos."
            action={
              <div className="row" style={{ justifyContent: 'center' }}>
                <Button variant="primary" onClick={() => setAdding(true)}>
                  Agregar desde un aviso
                </Button>
                <Button onClick={createBlank}>Crear una vacía</Button>
              </div>
            }
          />
        </Card>
      ) : (
        <Card
          title="Tu tablero"
          subtitle="Arrastra cada tarjeta cuando el proceso avance, o cámbiale el estado desde la ficha."
          padded={false}
        >
          <div className="card-body">
            <div className="board">
              {COLUMNS.map((col) => {
                const items = filtered.filter((a) => a.status === col.id);
                return (
                  <div
                    key={col.id}
                    className={`column ${dragOver === col.id ? 'drop' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(col.id);
                    }}
                    onDragLeave={() => setDragOver((c) => (c === col.id ? null : c))}
                    onDrop={(e) => {
                      e.preventDefault();
                      const id = e.dataTransfer.getData('text/plain');
                      if (id) moveTo(id, col.id);
                      setDragOver(null);
                    }}
                  >
                    <div className="column-head">
                      <span>{col.label}</span>
                      <span>{items.length}</span>
                    </div>
                    <p className="column-hint">{col.hint}</p>
                    {items.map((a) => {
                      const d = a.appliedAt ? daysSince(a.appliedAt) : null;
                      return (
                        <div
                          key={a.id}
                          className="job-card"
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData('text/plain', a.id)}
                          onClick={() => setSelectedId(a.id === selectedId ? null : a.id)}
                          style={{ borderColor: a.id === selectedId ? 'var(--accent)' : undefined }}
                        >
                          <strong>{a.role || 'Cargo sin nombre'}</strong>
                          <div className="co">{a.company || 'Empresa'}</div>
                          <div className="meta">
                            {a.location && <span>{a.location}</span>}
                            {d !== null && <span>hace {d} d</span>}
                            {a.nextStepDate && <span>→ {formatDate(a.nextStepDate)}</span>}
                          </div>
                        </div>
                      );
                    })}
                    {items.length === 0 && (
                      <p className="faint" style={{ padding: '4px 4px 8px' }}>
                        Vacío
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {selected && (
        <Card
          title={`${selected.role || 'Cargo'} · ${selected.company || 'Empresa'}`}
          subtitle={`Creada el ${formatDate(selected.createdAt)}`}
          actions={
            <>
              {selected.url && (
                <a href={selected.url} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="ghost">
                    Abrir aviso ↗
                  </Button>
                </a>
              )}
              <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>
                Cerrar
              </Button>
              <ConfirmButton
                onConfirm={() => {
                  setApplications(removeById(applications, selected.id));
                  setSelectedId(null);
                }}
              >
                Eliminar
              </ConfirmButton>
            </>
          }
        >
          <div className="grid">
            <TextInput
              label="Empresa"
              value={selected.company}
              onChange={(e) => patch(selected.id, { company: e.target.value })}
            />
            <TextInput label="Cargo" value={selected.role} onChange={(e) => patch(selected.id, { role: e.target.value })} />
            <TextInput
              label="Ubicación"
              value={selected.location}
              onChange={(e) => patch(selected.id, { location: e.target.value })}
              placeholder="Remoto · Santiago"
            />
            <Select
              label="Estado"
              value={selected.status}
              onChange={(e) => moveTo(selected.id, e.target.value as ApplicationStatus)}
            >
              {COLUMNS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
            <TextInput
              label="Fecha de postulación"
              type="date"
              value={selected.appliedAt}
              onChange={(e) => patch(selected.id, { appliedAt: e.target.value })}
            />
            <TextInput
              label="Fuente"
              value={selected.source}
              onChange={(e) => patch(selected.id, { source: e.target.value })}
              placeholder="LinkedIn, referido, web de la empresa…"
            />
            <TextInput
              label="Renta ofrecida o esperada"
              value={selected.salary}
              onChange={(e) => patch(selected.id, { salary: e.target.value })}
            />
            <TextInput
              label="Enlace al aviso"
              value={selected.url}
              onChange={(e) => patch(selected.id, { url: e.target.value, source: selected.source || sourceFromUrl(e.target.value) })}
            />
            <TextInput
              label="Próximo paso"
              value={selected.nextStep}
              onChange={(e) => patch(selected.id, { nextStep: e.target.value })}
              placeholder="Enviar correo de seguimiento"
              hint="Lo más importante de la ficha: sin próximo paso, la postulación se enfría sola."
            />
            <TextInput
              label="¿Cuándo?"
              type="date"
              value={selected.nextStepDate}
              onChange={(e) => patch(selected.id, { nextStepDate: e.target.value })}
            />
            <TextInput
              label="Contacto"
              value={selected.contact}
              onChange={(e) => patch(selected.id, { contact: e.target.value })}
              placeholder="Nombre · correo"
            />
            <TextArea
              label="Notas"
              rows={3}
              value={selected.notes}
              onChange={(e) => patch(selected.id, { notes: e.target.value })}
              hint="Qué te preguntaron, con quién hablaste, qué quedó pendiente."
            />
            <TextArea
              label="Descripción del cargo"
              rows={6}
              value={selected.jobDescription}
              onChange={(e) => patch(selected.id, { jobDescription: e.target.value })}
              hint="El texto del aviso. Se usa para comparar con tu CV y para armar la carta de presentación."
            />
          </div>

          {match && match.total > 0 && (
            <div style={{ marginTop: 16 }}>
              <div className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
                <ScoreRing value={match.score} label="calce" size={80} />
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div className="field-label" style={{ marginBottom: 6 }}>
                    Palabras del aviso que no están en tu perfil
                  </div>
                  {match.missing.length === 0 ? (
                    <p className="muted">Ninguna: tu perfil cubre el vocabulario del aviso.</p>
                  ) : (
                    <div className="chips">
                      {match.missing.map((t) => (
                        <span className="badge badge-warn" key={t}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {selected.status === 'postulada' && selected.appliedAt && (daysSince(selected.appliedAt) ?? 0) >= 7 && (
            <div className="issue issue-tip" style={{ marginTop: 16 }}>
              <span className="issue-icon">i</span>
              <div>
                <strong>Van {daysSince(selected.appliedAt)} días sin novedad</strong>
                <p>
                  Es buen momento para un correo corto: recuerda tu interés, agrega algo nuevo (un
                  proyecto, una idea sobre el cargo) y cierra con una pregunta concreta.
                </p>
              </div>
            </div>
          )}
        </Card>
      )}
    </>
  );
}
