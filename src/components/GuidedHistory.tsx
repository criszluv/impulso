import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Education, Experience } from '../types';
import type { GuidedError } from '../lib/guided';
import {
  hasEducation,
  hasExperience,
  newEducation,
  newExperience,
  newestFirst,
} from '../lib/guided';
import { formatRange } from '../lib/utils';
import { Button, ConfirmButton, TextArea, TextInput, Toggle } from './ui';

function RecordCard({
  id,
  title,
  subtitle,
  initialOpen,
  focusId,
  error,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  initialOpen: boolean;
  focusId: string;
  error: GuidedError | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(initialOpen),
    ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (error ? error.id !== id : focusId !== id) return;
    // Open the native disclosure before focusing its previously hidden input.
    if (ref.current) ref.current.open = true;
    const frame = requestAnimationFrame(() => {
      const input =
        error?.id === id
          ? document.getElementById(id + '-' + error.field)
          : ref.current?.querySelector('input');
      input?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [id, focusId, error]);
  return (
    <details
      ref={ref}
      className="guided-record"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>
        <span>{title}</span>
        <small>
          {subtitle || 'Completa los datos que recuerdes'} · {open ? 'Minimizar' : 'Abrir'}
        </small>
      </summary>
      {children}
    </details>
  );
}
type Common = { error: GuidedError | null; onEdited: () => void };
export function GuidedExperience({
  records,
  onChange,
  error,
  onEdited,
}: Common & { records: Experience[]; onChange: (r: Experience[]) => void }) {
  const [focusId, setFocusId] = useState(''),
    [removed, setRemoved] = useState<{ record: Experience; index: number } | null>(null);
  const add = () => {
    const e = newExperience();
    onChange([...records, e]);
    setFocusId(e.id);
    onEdited();
  };
  const edit = (id: string, patch: Partial<Experience>) => {
    onChange(records.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };
  return (
    <>
      <p className="field-hint">
        Añade cada trabajo aquí. Puedes minimizar sus datos y seguir con otro. Las fechas son
        opcionales; empieza por la experiencia más reciente.
      </p>
      {records.map((e, i) => {
        const remove = () => {
          setRemoved({ record: e, index: i });
          onChange(records.filter((x) => x.id !== e.id));
          onEdited();
        };
        return (
          <RecordCard
            key={e.id}
            id={e.id}
            title={'Experiencia ' + (i + 1) + (e.role ? ' · ' + e.role : '')}
            subtitle={[e.company, formatRange(e.startDate, e.endDate, e.current)]
              .filter(Boolean)
              .join(' · ')}
            initialOpen={i === records.length - 1}
            focusId={focusId}
            error={error}
          >
            <TextInput
              id={e.id + '-role'}
              label="Cargo o actividad"
              value={e.role}
              onChange={(v) => edit(e.id, { role: v.target.value })}
              placeholder="Ayudante de cocina, cuidado de personas…"
              aria-invalid={error?.id === e.id && error.field === 'role'}
            />
            <TextInput
              label="Empresa o dónde lo hacías (opcional)"
              value={e.company}
              onChange={(v) => edit(e.id, { company: v.target.value })}
              placeholder="Empresa, negocio familiar o por mi cuenta"
            />
            <TextInput
              label="Ciudad o lugar de trabajo (opcional)"
              value={e.location}
              onChange={(v) => edit(e.id, { location: v.target.value })}
            />
            <div className="history-dates">
              <TextInput
                id={e.id + '-startDate'}
                type="month"
                label="Inicio de esta experiencia (opcional)"
                value={e.startDate}
                onChange={(v) => edit(e.id, { startDate: v.target.value })}
                aria-invalid={error?.id === e.id && error.field === 'startDate'}
              />
              <TextInput
                id={e.id + '-endDate'}
                type="month"
                label="Fin de esta experiencia (opcional)"
                value={e.endDate}
                disabled={e.current}
                onChange={(v) => edit(e.id, { endDate: v.target.value })}
                aria-invalid={error?.id === e.id && error.field === 'endDate'}
              />
            </div>
            <Toggle
              label="Sigo trabajando aquí"
              checked={e.current}
              onChange={(current) => edit(e.id, { current, endDate: current ? '' : e.endDate })}
            />
            <TextArea
              label="¿Qué tareas hacías?"
              value={e.bullets.join('\n')}
              hint="Una tarea por línea. Escribe lo que hacías de verdad; no hacen falta cifras."
              onChange={(v) => edit(e.id, { bullets: v.target.value.split('\n') })}
            />
            {hasExperience(e) ? (
              <ConfirmButton confirmLabel="Sí, quitar esta experiencia" onConfirm={remove}>
                Quitar esta experiencia
              </ConfirmButton>
            ) : (
              <Button onClick={remove}>Quitar cuadro vacío</Button>
            )}
          </RecordCard>
        );
      })}
      <div className="row">
        <Button onClick={add}>
          {records.length ? 'Añadir otra experiencia' : 'Sí, quiero contar una experiencia'}
        </Button>
        {records.length > 1 && (
          <Button
            onClick={() => {
              onChange(newestFirst(records));
              onEdited();
            }}
          >
            Ordenar experiencias por fecha
          </Button>
        )}
      </div>
      {removed && (
        <p className="notice" role="status">
          Experiencia quitada.{' '}
          <Button
            onClick={() => {
              const list = [...records];
              list.splice(Math.min(removed.index, list.length), 0, removed.record);
              onChange(list);
              setFocusId(removed.record.id);
              setRemoved(null);
            }}
          >
            Deshacer
          </Button>
        </p>
      )}
    </>
  );
}
export function GuidedEducation({
  records,
  onChange,
  error,
  onEdited,
}: Common & { records: Education[]; onChange: (r: Education[]) => void }) {
  const [focusId, setFocusId] = useState(''),
    [removed, setRemoved] = useState<{ record: Education; index: number } | null>(null);
  const add = () => {
    const e = newEducation();
    onChange([...records, e]);
    setFocusId(e.id);
    onEdited();
  };
  const edit = (id: string, patch: Partial<Education>) =>
    onChange(records.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  return (
    <section className="guided-education">
      <h2>Mis estudios</h2>
      <p className="field-hint">
        Opcional. Puedes incluir educación escolar, formación profesional, universidad y cursos,
        aunque sigan en curso.
      </p>
      {records.map((e, i) => {
        const remove = () => {
          setRemoved({ record: e, index: i });
          onChange(records.filter((x) => x.id !== e.id));
          onEdited();
        };
        return (
          <RecordCard
            key={e.id}
            id={e.id}
            title={'Estudio ' + (i + 1) + (e.degree ? ' · ' + e.degree : '')}
            subtitle={[e.institution, formatRange(e.startDate, e.endDate, e.current, 'En curso')]
              .filter(Boolean)
              .join(' · ')}
            initialOpen={i === records.length - 1}
            focusId={focusId}
            error={error}
          >
            <TextInput
              id={e.id + '-degree'}
              label="Estudios, título o curso"
              value={e.degree}
              onChange={(v) => edit(e.id, { degree: v.target.value })}
              placeholder="Bachillerato, técnico en cocina, curso de Excel…"
              aria-invalid={error?.id === e.id && error.field === 'degree'}
            />
            <TextInput
              label="Institución o centro de estudios (opcional)"
              value={e.institution}
              onChange={(v) => edit(e.id, { institution: v.target.value })}
            />
            <TextInput
              label="Sede o ciudad (opcional)"
              value={e.location}
              onChange={(v) => edit(e.id, { location: v.target.value })}
            />
            <div className="history-dates">
              <TextInput
                id={e.id + '-startDate'}
                type="month"
                label="Inicio de estos estudios (opcional)"
                value={e.startDate}
                onChange={(v) => edit(e.id, { startDate: v.target.value })}
                aria-invalid={error?.id === e.id && error.field === 'startDate'}
              />
              <TextInput
                id={e.id + '-endDate'}
                type="month"
                label="Fin de estos estudios (opcional)"
                value={e.endDate}
                disabled={e.current}
                onChange={(v) => edit(e.id, { endDate: v.target.value })}
                aria-invalid={error?.id === e.id && error.field === 'endDate'}
              />
            </div>
            <Toggle
              label="Sigo estudiando"
              checked={e.current}
              onChange={(current) => edit(e.id, { current, endDate: current ? '' : e.endDate })}
            />
            <TextArea
              label="Algo que quieras destacar de estos estudios (opcional)"
              value={e.detail}
              onChange={(v) => edit(e.id, { detail: v.target.value })}
            />
            {hasEducation(e) ? (
              <ConfirmButton confirmLabel="Sí, quitar estos estudios" onConfirm={remove}>
                Quitar estos estudios
              </ConfirmButton>
            ) : (
              <Button onClick={remove}>Quitar cuadro vacío</Button>
            )}
          </RecordCard>
        );
      })}
      <div className="row">
        <Button onClick={add}>
          {records.length ? 'Añadir otros estudios' : 'Agregar mis estudios'}
        </Button>
        {records.length > 1 && (
          <Button
            onClick={() => {
              onChange(newestFirst(records));
              onEdited();
            }}
          >
            Ordenar estudios por fecha
          </Button>
        )}
      </div>
      {removed && (
        <p className="notice" role="status">
          Estudio quitado.{' '}
          <Button
            onClick={() => {
              const list = [...records];
              list.splice(Math.min(removed.index, list.length), 0, removed.record);
              onChange(list);
              setFocusId(removed.record.id);
              setRemoved(null);
            }}
          >
            Deshacer
          </Button>
        </p>
      )}
    </section>
  );
}
