import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Mail, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useApp } from '../state/context';
import type { CoverLetter } from '../types';
import { uid } from '../lib/utils';
import { applicationMessage } from '../lib/journey';
import { saveBlob } from '../lib/pdf';
import { isConfigured } from '../lib/ai/settings';
import { Button, ConfirmButton, CopyButton, Select, TextArea, TextInput } from '../components/ui';

export function Letters() {
  const { state, apply, ai } = useApp(),
    [id, setId] = useState(state.letters[0]?.id || ''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  const letter = state.letters.find((l) => l.id === id);
  const patch = (v: Partial<CoverLetter>) =>
    apply((s) => ({
      ...s,
      letters: s.letters.map((l) =>
        l.id === id ? { ...l, ...v, updatedAt: new Date().toISOString() } : l,
      ),
    }));
  const create = () => {
    const l: CoverLetter = {
      id: uid('letter'),
      title: 'Mi carta',
      company: '',
      role: state.profile.personal.headline,
      recipient: '',
      body: '',
      jobDescription: '',
      applicationId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    apply((s) => ({ ...s, letters: [l, ...s.letters] }));
    setId(l.id);
  };
  const draft = () => {
    if (!letter) return;
    const a = state.applications.find((a) => a.id === letter.applicationId);
    const base = a || { role: letter.role, company: letter.company };
    let body = applicationMessage(base as Parameters<typeof applicationMessage>[0], state.profile);
    if (letter.recipient) body = body.replace('Hola:', 'Hola, ' + letter.recipient + ':');
    patch({ body, title: letter.role + (letter.company ? ' · ' + letter.company : '') });
    setMessage('Borrador preparado con tus datos. Revísalo antes de enviarlo.');
  };
  const exportPdf = () => {
    if (!letter) return;
    const doc = new jsPDF(),
      lines: string[] = doc.splitTextToSize(letter.body, 165);
    let y = 25;
    doc.setFontSize(11);
    for (const l of lines) {
      if (y > 276) {
        doc.addPage();
        y = 25;
      }
      doc.text(l, 22, y);
      y += 6;
    }
    saveBlob(doc.output('blob'), 'Carta_de_presentacion.pdf');
  };
  return (
    <>
      <Link to="/cv" className="text-link">
        <ArrowLeft size={17} />
        Volver a mi currículum
      </Link>
      <div className="page-head">
        <div>
          <span className="eyebrow">Un mensaje con tus palabras</span>
          <h1>Mi carta de presentación</h1>
          <p>Úsala si la empresa pide una carta o si quieres presentarte con más detalle.</p>
        </div>
        <Button variant="primary" onClick={create}>
          <Plus size={18} />
          Nueva carta
        </Button>
      </div>
      {!letter ? (
        <section className="empty-welcome">
          <Mail size={42} />
          <h2>Cuéntales por qué te interesa.</h2>
          <p>Partiremos de tus datos. Tú revisas y decides qué enviar.</p>
          <Button variant="primary" onClick={create}>
            Preparar mi primera carta
          </Button>
        </section>
      ) : (
        <div className="split">
          <section className="form-sheet">
            <h2>¿A quién le escribes?</h2>
            <Select label="Mis cartas guardadas" value={id} onChange={(e) => setId(e.target.value)}>
              {state.letters.map((l) => (
                <option value={l.id} key={l.id}>
                  {l.title}
                </option>
              ))}
            </Select>
            <Select
              label="Usar un aviso guardado (opcional)"
              value={letter.applicationId || ''}
              onChange={(e) => {
                const a = state.applications.find((a) => a.id === e.target.value);
                patch({
                  applicationId: a?.id || null,
                  role: a?.role || letter.role,
                  company: a?.company || letter.company,
                  jobDescription: a?.jobDescription || '',
                });
              }}
            >
              <option value="">Escribir los datos</option>
              {state.applications.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.role} · {a.company}
                </option>
              ))}
            </Select>
            <TextInput
              label="Trabajo al que postulas"
              value={letter.role}
              onChange={(e) => patch({ role: e.target.value })}
            />
            <TextInput
              label="Empresa"
              value={letter.company}
              onChange={(e) => patch({ company: e.target.value })}
            />
            <TextInput
              label="Persona que la recibirá (si sabes)"
              value={letter.recipient}
              onChange={(e) => patch({ recipient: e.target.value })}
            />
            {letter.body ? (
              <ConfirmButton confirmLabel="Sí, reemplazar el borrador" onConfirm={draft}>
                Crear otro borrador con mis datos
              </ConfirmButton>
            ) : (
              <Button variant="primary" disabled={!letter.role.trim()} onClick={draft}>
                Preparar un borrador
              </Button>
            )}
            {isConfigured(ai) && (
              <details>
                <summary>Pedir ayuda al asistente opcional</summary>
                <p>
                  Se enviarán tu perfil y los datos de esta carta al servicio configurado. El
                  borrador actual se reemplazará al terminar. Revísalo para confirmar que todo sea
                  cierto.
                </p>
                <Button
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const { generateLetterWithAi } = await import('../lib/ai/extract');
                      const result = await generateLetterWithAi(
                        {
                          profile: state.profile,
                          company: letter.company,
                          role: letter.role,
                          recipient: letter.recipient,
                          source: '',
                          motivation: '',
                          jobDescription: letter.jobDescription,
                          tone: 'directo',
                        },
                        ai,
                      );
                      patch({ body: result.body });
                      setMessage(
                        result.gaps.length
                          ? result.gaps.join(' ')
                          : 'Revisa el borrador antes de enviarlo.',
                      );
                    } catch {
                      setMessage('El asistente no respondió. Puedes preparar el borrador local.');
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? 'Preparando…' : 'Enviar datos y generar borrador'}
                </Button>
              </details>
            )}
            <ConfirmButton
              confirmLabel="Sí, eliminar esta carta"
              onConfirm={() => {
                apply((s) => ({ ...s, letters: s.letters.filter((l) => l.id !== id) }));
                setId(state.letters.find((l) => l.id !== id)?.id || '');
              }}
            >
              Eliminar carta
            </ConfirmButton>
          </section>
          <section className="form-sheet">
            <span className="eyebrow">Tu borrador</span>
            <h2>Hazlo tuyo.</h2>
            <TextArea
              label="Carta de presentación"
              rows={18}
              value={letter.body}
              onChange={(e) => patch({ body: e.target.value })}
              placeholder="Prepara un borrador o escribe aquí…"
            />
            <p className="field-hint">
              Puedes agregar por qué te interesa este trabajo. Usa solo información verdadera.
            </p>
            <div className="row">
              <CopyButton text={letter.body} label="Copiar carta" />
              <Button disabled={!letter.body.trim()} onClick={exportPdf}>
                <Download size={17} />
                Descargar carta
              </Button>
            </div>
            {message && (
              <p role="status" className="notice">
                {message}
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
