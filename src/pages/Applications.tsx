import { useMemo, useState } from 'react';
import { useApp } from '../state/context';
import { removeById, upsert } from '../lib/list';
import type { Application, ApplicationStatus } from '../types';
import { daysSince, formatDate, uid } from '../lib/utils';
import { matchJob } from '../lib/analysis';
import {
  Badge,
  Button,
  Card,
  ConfirmButton,
  Empty,
  ScoreRing,
  Select,
  TextArea,
  TextInput,
} from '../components/ui';

const COLUMNS: Array<{ id: ApplicationStatus; label: string }> = [
  { id: 'guardada', label: 'Guardada' },
  { id: 'postulada', label: 'Postulada' },
  { id: 'entrevista', label: 'Entrevista' },
  { id: 'oferta', label: 'Oferta' },
  { id: 'rechazada', label: 'Cerrada' },
];

function newApplication(): Application {
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
  };
}

export function Applications() {
  const { state, setApplications } = useApp();
  const { applications, profile } = state;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<ApplicationStatus | null>(null);
  const [query, setQuery] = useState('');

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

  const create = () => {
    const a = newApplication();
    setApplications([a, ...applications]);
    setSelectedId(a.id);
  };

  const moveTo = (id: string, status: ApplicationStatus) => {
    const extra: Partial<Application> = { status };
    const app = applications.find((a) => a.id === id);
    if (status === 'postulada' && app && !app.appliedAt) {
      extra.appliedAt = new Date().toISOString().slice(0, 10);
    }
    patch(id, extra);
  };

  const match = selected?.jobDescription ? matchJob(selected.jobDescription, profile) : null;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Postulaciones</h1>
          <p>
            Arrastra cada tarjeta según avance el proceso. Lo importante no es la cantidad, sino que
            ninguna se quede sin próximo paso.
          </p>
        </div>
        <div className="head-actions">
          <input
            className="input"
            style={{ width: 200 }}
            placeholder="Buscar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button variant="primary" onClick={create}>
            + Nueva postulación
          </Button>
        </div>
      </div>

      {applications.length === 0 ? (
        <Card>
          <Empty
            title="Sin postulaciones registradas"
            text="Anota cada una, incluso las que todavía no envías. Ver el embudo completo ayuda a saber si el problema está en el CV o en la cantidad."
            action={
              <Button variant="primary" onClick={create}>
                Agregar la primera
              </Button>
            }
          />
        </Card>
      ) : (
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
                {items.length === 0 && <p className="faint" style={{ padding: '4px 4px 8px' }}>Vacío</p>}
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <Card
          title={`${selected.role || 'Cargo'} · ${selected.company || 'Empresa'}`}
          subtitle={`Creada el ${formatDate(selected.createdAt)}`}
          actions={
            <>
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
              onChange={(e) => patch(selected.id, { url: e.target.value })}
            />
            <TextInput
              label="Próximo paso"
              value={selected.nextStep}
              onChange={(e) => patch(selected.id, { nextStep: e.target.value })}
              placeholder="Enviar correo de seguimiento"
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
              hint="Pega el aviso completo: se usa para comparar con tu CV y para armar la carta."
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

          <div className="row" style={{ marginTop: 14 }}>
            <Badge>{COLUMNS.find((c) => c.id === selected.status)?.label}</Badge>
            {selected.salary && <Badge tone="accent">{selected.salary}</Badge>}
            {selected.url && (
              <a href={selected.url} target="_blank" rel="noreferrer" className="faint">
                Abrir aviso ↗
              </a>
            )}
          </div>
        </Card>
      )}
    </>
  );
}
