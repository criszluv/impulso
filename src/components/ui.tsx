import { useId, useState } from 'react';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import type { Issue } from '../lib/analysis';

export function Card({
  title,
  subtitle,
  actions,
  children,
  padded = true,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <section className="card">
      {(title || actions) && (
        <header className="card-head">
          <div>
            {title && <h2 className="card-title">{title}</h2>}
            {subtitle && <p className="card-sub">{subtitle}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      <div className={padded ? 'card-body' : ''}>{children}</div>
    </section>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'subtle';
  size?: 'sm' | 'md';
};

export function Button({ variant = 'subtle', size = 'md', className = '', ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={`btn btn-${variant} btn-${size} ${className}`.trim()}
      {...rest}
    />
  );
}

export function Field({
  label,
  hint,
  children,
  wide,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  wide?: boolean;
  htmlFor?: string;
}) {
  const groupId = useId();
  return (
    <div
      className={'field ' + (wide ? 'field-wide' : '')}
      role={htmlFor ? undefined : 'group'}
      aria-labelledby={htmlFor ? undefined : groupId}
    >
      {htmlFor ? (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
        </label>
      ) : (
        <span id={groupId} className="field-label">
          {label}
        </span>
      )}
      {children}
      {hint && (
        <span className="field-hint" id={htmlFor ? htmlFor + '-hint' : undefined}>
          {hint}
        </span>
      )}
    </div>
  );
}
type TextProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  wide?: boolean;
};
export function TextInput({ label, hint, wide, ...rest }: TextProps) {
  const uid = useId(),
    id = rest.id || uid;
  return (
    <Field label={label} hint={hint} wide={wide} htmlFor={id}>
      <input
        className="input"
        {...rest}
        id={id}
        aria-describedby={hint ? id + '-hint' : undefined}
      />
    </Field>
  );
}
type AreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string };
export function TextArea({ label, hint, rows = 4, ...rest }: AreaProps) {
  const uid = useId(),
    id = rest.id || uid;
  return (
    <Field label={label} hint={hint} wide htmlFor={id}>
      <textarea
        className="input textarea"
        rows={rows}
        {...rest}
        id={id}
        aria-describedby={hint ? id + '-hint' : undefined}
      />
    </Field>
  );
}
type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string };
export function Select({ label, hint, children, ...rest }: SelectProps) {
  const uid = useId(),
    id = rest.id || uid;
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <select
        className="input"
        {...rest}
        id={id}
        aria-describedby={hint ? id + '-hint' : undefined}
      >
        {children}
      </select>
    </Field>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: string; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

/** Entrada de etiquetas: Enter o coma confirma, Retroceso borra la última. */
export function TagInput({
  label,
  value,
  onChange,
  placeholder = 'Escribe y presiona Enter',
  hint,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  hint?: string;
}) {
  const [draft, setDraft] = useState('');

  const commit = (raw: string) => {
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const part of parts) {
      if (!next.some((v) => v.toLowerCase() === part.toLowerCase())) next.push(part);
    }
    onChange(next);
    setDraft('');
  };

  return (
    <Field label={label} hint={hint} wide>
      <div className="tag-input">
        {value.map((tag) => (
          <span className="tag" key={tag}>
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== tag))}
              aria-label={`Quitar ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          aria-label={label}
          className="tag-field"
          value={draft}
          placeholder={value.length ? '' : placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              commit(draft);
            } else if (e.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
        />
      </div>
    </Field>
  );
}

export function ScoreRing({
  value,
  label,
  size = 96,
}: {
  value: number;
  label?: string;
  size?: number;
}) {
  const tone = value >= 80 ? 'good' : value >= 50 ? 'mid' : 'low';
  return (
    <div className={`ring ring-${tone}`} style={{ width: size, height: size }}>
      <div
        className="ring-fill"
        style={{ background: `conic-gradient(var(--ring) ${value * 3.6}deg, var(--ring-bg) 0deg)` }}
      />
      <div className="ring-inner">
        <strong>{value}</strong>
        {label && <small>{label}</small>}
      </div>
    </div>
  );
}

const ICONS: Record<string, string> = { error: '✕', warn: '!', tip: 'i', ok: '✓' };

export function IssueList({ issues }: { issues: Issue[] }) {
  if (!issues.length) return null;
  return (
    <ul className="issues">
      {issues.map((issue, i) => (
        <li key={`${issue.message}-${i}`} className={`issue issue-${issue.level}`}>
          <span className="issue-icon" aria-hidden="true">
            {ICONS[issue.level]}
          </span>
          <div>
            <strong>{issue.message}</strong>
            {issue.hint && <p>{issue.hint}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

/** Botón que pide confirmación en el propio botón antes de ejecutar. */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = '¿Seguro?',
}: {
  onConfirm: () => void;
  children: ReactNode;
  confirmLabel?: string;
}) {
  const [armed, setArmed] = useState(false);
  return (
    <Button
      variant={armed ? 'danger' : 'ghost'}
      size="sm"
      onBlur={() => setArmed(false)}
      onClick={() => {
        if (armed) {
          onConfirm();
          setArmed(false);
        } else {
          setArmed(true);
        }
      }}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}

export function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false),
    [error, setError] = useState(false);
  return (
    <span>
      <Button
        size="sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setDone(true);
            setError(false);
          } catch {
            setError(true);
          }
        }}
      >
        {done ? 'Copiado' : label}
      </Button>
      {error && (
        <span className="field-hint" role="status">
          No se pudo copiar automáticamente. Selecciona el texto y usa la opción Copiar de tu
          dispositivo.
        </span>
      )}
    </span>
  );
}
