import { useState } from 'react';
import { ACTION_VERBS, reviewBullet } from '../lib/analysis';
import { buildBullet } from '../lib/writing';
import { useApp } from '../state/context';
import { isConfigured } from '../lib/ai/settings';
import { AiError } from '../lib/ai/errors';
import type { BulletRewrite } from '../lib/ai/types';
import { Button, Field, IssueList, TextInput } from './ui';

/** Editor de los logros de un cargo, con revisión en vivo y asistente XYZ. */
export function BulletEditor({
  bullets,
  onChange,
  role = '',
  company = '',
}: {
  bullets: string[];
  onChange: (next: string[]) => void;
  role?: string;
  company?: string;
}) {
  const { ai } = useApp();
  const aiReady = isConfigured(ai);
  const [openReview, setOpenReview] = useState<number | null>(null);
  const [wizard, setWizard] = useState(false);
  const [rewriting, setRewriting] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<{ index: number; data: BulletRewrite } | null>(null);
  const [aiError, setAiError] = useState('');

  const update = (index: number, value: string) => {
    const next = [...bullets];
    next[index] = value;
    onChange(next);
  };

  const improve = async (index: number) => {
    setRewriting(index);
    setAiError('');
    setSuggestions(null);
    try {
      const { rewriteBulletWithAi } = await import('../lib/ai/extract');
      const data = await rewriteBulletWithAi(bullets[index], { role, company }, ai);
      setSuggestions({ index, data });
    } catch (e) {
      setAiError(e instanceof AiError ? e.message : 'No se pudo generar la reescritura.');
    } finally {
      setRewriting(null);
    }
  };

  return (
    <Field label="Logros" hint="Uno por línea. Verbo en pasado, qué hiciste y qué resultado dejó." wide>
      <div className="stack">
        {bullets.map((b, i) => {
          const issues = reviewBullet(b);
          const worst = issues.find((x) => x.level === 'warn' || x.level === 'error');
          const open = openReview === i;
          return (
            <div key={i}>
              <div className="row" style={{ alignItems: 'flex-start', gap: 8, flexWrap: 'nowrap' }}>
                <textarea
                  className="input textarea"
                  rows={2}
                  value={b}
                  placeholder="Ej: Reduje el tiempo de respuesta del soporte de 48 a 6 horas rediseñando el flujo de tickets."
                  onChange={(e) => update(i, e.target.value)}
                  style={{ minHeight: 56 }}
                />
                <div className="stack" style={{ gap: 4, flex: 'none' }}>
                  <Button
                    size="sm"
                    variant={worst ? 'subtle' : 'ghost'}
                    title="Revisar redacción"
                    onClick={() => setOpenReview(open ? null : i)}
                  >
                    {b.trim() ? (worst ? `⚠ ${issues.filter((x) => x.level !== 'ok').length}` : '✓') : '—'}
                  </Button>
                  {aiReady && (
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Mejorar con IA"
                      disabled={!b.trim() || rewriting !== null}
                      onClick={() => void improve(i)}
                    >
                      {rewriting === i ? '…' : '✦'}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Eliminar logro"
                    onClick={() => onChange(bullets.filter((_, j) => j !== i))}
                  >
                    ×
                  </Button>
                </div>
              </div>
              {open && b.trim() && (
                <div style={{ marginTop: 8 }}>
                  <IssueList issues={issues} />
                </div>
              )}
              {suggestions?.index === i && (
                <div className="item" style={{ marginTop: 8, marginBottom: 0 }}>
                  <div className="item-head">
                    <h3>Tres formas de decirlo</h3>
                    <span className="spacer" />
                    <Button size="sm" variant="ghost" onClick={() => setSuggestions(null)}>
                      Cerrar
                    </Button>
                  </div>
                  <div className="item-body stack" style={{ gap: 10 }}>
                    {suggestions.data.options.map((option) => (
                      <div className="stat" key={option.text}>
                        <p style={{ fontSize: 13.5 }}>{option.text}</p>
                        <span style={{ display: 'block', marginTop: 6 }}>{option.note}</span>
                        <div className="row" style={{ marginTop: 8 }}>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              update(i, option.text);
                              setSuggestions(null);
                            }}
                          >
                            Usar esta
                          </Button>
                        </div>
                      </div>
                    ))}
                    {suggestions.data.missing.length > 0 && (
                      <div className="issue issue-tip">
                        <span className="issue-icon">i</span>
                        <div>
                          <strong>Datos que faltan para que quede sólido</strong>
                          <p>
                            No se inventaron cifras. Si tienes estos números, agrégalos tú:{' '}
                            {suggestions.data.missing.join(' · ')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {aiError && (
          <div className="issue issue-error">
            <span className="issue-icon">✕</span>
            <div>
              <strong>{aiError}</strong>
            </div>
          </div>
        )}

        <div className="row">
          <Button size="sm" onClick={() => onChange([...bullets, ''])}>
            + Agregar logro
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setWizard((v) => !v)}>
            {wizard ? 'Cerrar asistente' : '✦ Asistente de redacción'}
          </Button>
        </div>

        {wizard && (
          <BulletWizard
            onDone={(text) => {
              onChange([...bullets, text]);
              setWizard(false);
            }}
          />
        )}
      </div>
    </Field>
  );
}

function BulletWizard({ onDone }: { onDone: (text: string) => void }) {
  const [verb, setVerb] = useState('');
  const [what, setWhat] = useState('');
  const [how, setHow] = useState('');
  const [result, setResult] = useState('');

  const preview = buildBullet({ verb, what, how, result });

  return (
    <div className="item" style={{ marginBottom: 0 }}>
      <div className="item-head">
        <h3>Asistente de logro</h3>
        <span className="faint">Responde las tres preguntas y arma la frase por ti.</span>
      </div>
      <div className="item-body stack">
        <Field label="1. Verbo de acción" hint="Elige uno o escribe el tuyo." wide>
          <input
            className="input"
            value={verb}
            onChange={(e) => setVerb(e.target.value)}
            placeholder="Reduje"
          />
          <div className="stack" style={{ gap: 6, marginTop: 8 }}>
            {Object.entries(ACTION_VERBS).map(([group, verbs]) => (
              <div key={group}>
                <div className="faint" style={{ marginBottom: 3 }}>
                  {group}
                </div>
                <div className="chips">
                  {verbs.map((v) => (
                    <button type="button" className="chip" key={v} onClick={() => setVerb(v)}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Field>

        <TextInput
          label="2. ¿Qué hiciste exactamente?"
          wide
          value={what}
          onChange={(e) => setWhat(e.target.value)}
          placeholder="el tiempo de respuesta del soporte"
        />
        <TextInput
          label="3. ¿Cómo lo lograste?"
          wide
          hint="La herramienta, el método o el cambio que introdujiste. Puedes dejarlo vacío."
          value={how}
          onChange={(e) => setHow(e.target.value)}
          placeholder="un rediseño del flujo de tickets"
        />
        <TextInput
          label="4. ¿Qué resultado dejó? (con cifra)"
          wide
          hint="Lo más importante. Un porcentaje, un monto, un plazo o un número de personas."
          value={result}
          onChange={(e) => setResult(e.target.value)}
          placeholder="pasar de 48 a 6 horas promedio"
        />

        {preview && (
          <div className="issue issue-tip">
            <span className="issue-icon">✦</span>
            <div>
              <strong>Borrador</strong>
              <p style={{ color: 'var(--text)' }}>{preview}</p>
            </div>
          </div>
        )}

        <div className="row">
          <Button variant="primary" size="sm" disabled={!preview} onClick={() => onDone(preview)}>
            Agregar al cargo
          </Button>
        </div>
      </div>
    </div>
  );
}
