import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Mail, Download, Sparkles } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useApp } from '../state/context';
import type { CoverLetter } from '../types';
import { newLetter } from '../lib/jobs';
import { saveBlob } from '../lib/pdf';
import { LETTER_TONES } from '../lib/ai/types';
import { AiAssist } from '../components/AiAssist';
import { Button, ConfirmButton, CopyButton, Select, TextArea, TextInput } from '../components/ui';

export function Letters() {
  const { state, apply, ai } = useApp(),
    [params, setParams] = useSearchParams();
  const id = params.get('carta') || state.letters[0]?.id || '';
  const [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [previous, setPrevious] = useState<{ id: string; body: string } | null>(null);
  const letter = state.letters.find((l) => l.id === id);
  const focusResult = useRef(false);
  useEffect(() => {
    if (!busy && focusResult.current) {
      document.getElementById('letter-body')?.focus();
      focusResult.current = false;
    }
  }, [busy, letter?.body]);
  const patch = (v: Partial<CoverLetter>) =>
    apply((s) => ({
      ...s,
      letters: s.letters.map((l) =>
        l.id === id ? { ...l, ...v, updatedAt: new Date().toISOString() } : l,
      ),
    }));
  const create = () => {
    const l = newLetter(state.preferences.role || state.profile.personal.headline);
    apply((s) => ({ ...s, letters: [l, ...s.letters] }));
    setParams({ carta: l.id });
    setMessage('');
  };
  const draft = () => {
    if (!letter) return;
    const p = state.profile.personal;
    const intro = letter.role
      ? 'Me interesa el trabajo de ' +
        letter.role +
        (letter.company ? ' en ' + letter.company : '') +
        '.'
      : 'Quisiera presentar mi perfil para futuras oportunidades laborales' +
        (letter.company ? ' en ' + letter.company : '') +
        '.';
    const body = [
      letter.recipient ? 'Hola, ' + letter.recipient + ':' : 'Hola:',
      intro,
      p.summary,
      letter.motivation,
      'Quedo disponible para conversar.',
      [p.fullName, p.phone, p.email].filter(Boolean).join('\n'),
    ]
      .filter(Boolean)
      .join('\n\n');
    setPrevious({ id, body: letter.body });
    patch({
      body,
      title: letter.role + (letter.company ? ' · ' + letter.company : '') || 'Presentación general',
    });
    setMessage('Borrador preparado con tus datos. Revísalo antes de enviarlo.');
  };
  const generate = async () => {
    if (!letter) return;
    setBusy(true);
    setMessage('');
    try {
      const { generateLetterWithAi } = await import('../lib/ai/extract');
      const result = await generateLetterWithAi(
        {
          profile: state.profile,
          company: letter.company,
          role: letter.role,
          recipient: letter.recipient,
          source: state.applications.find((a) => a.id === letter.applicationId)?.source || '',
          motivation: letter.motivation,
          jobDescription: letter.jobDescription,
          tone: letter.tone,
        },
        ai,
      );
      setPrevious({ id, body: letter.body });
      patch({
        body: result.body,
        title:
          letter.role + (letter.company ? ' · ' + letter.company : '') || 'Presentación general',
      });
      setMessage(
        result.gaps.length
          ? result.gaps.join(' ')
          : 'Carta preparada con IA. Revisa que todo sea cierto antes de enviarla.',
      );
      focusResult.current = true;
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : 'La IA no respondió. Puedes usar el borrador básico.',
      );
    } finally {
      setBusy(false);
    }
  };
  const exportPdf = () => {
    if (!letter) return;
    const doc = new jsPDF();
    doc.setFontSize(11);
    const lines: string[] = doc.splitTextToSize(letter.body, 165);
    let y = 25;
    for (const line of lines) {
      if (y > 276) {
        doc.addPage();
        y = 25;
      }
      doc.text(line, 22, y);
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
          <p>
            Con una oferta concreta o para presentarte por tu cuenta. No necesitas tener un empleo
            guardado.
          </p>
        </div>
        <Button variant="primary" disabled={busy} onClick={create}>
          <Plus size={18} />
          Nueva carta
        </Button>
      </div>
      {!letter ? (
        <>
          <AiAssist
            title="Preséntate con ayuda de IA"
            description="La IA conecta tu experiencia con el tipo de trabajo que buscas. Si tienes un aviso, también puede aprovechar su descripción."
          />
          <section className="empty-welcome">
            <Mail size={42} />
            <h2>Cuéntales qué puedes aportar.</h2>
            <p>Partiremos de tus datos. La empresa y el aviso son opcionales.</p>
            <Button variant="primary" onClick={create}>
              Preparar mi primera carta
            </Button>
          </section>
        </>
      ) : (
        <fieldset disabled={busy} className="plain-fieldset">
          <div className="split">
            <section className="form-sheet">
              <h2>¿A quién le escribes?</h2>
              <Select
                label="Mis cartas guardadas"
                value={id}
                onChange={(e) => {
                  setParams({ carta: e.target.value });
                  setMessage('');
                }}
              >
                {state.letters.map((l) => (
                  <option value={l.id} key={l.id}>
                    {l.title}
                  </option>
                ))}
              </Select>
              <TextInput
                label="Trabajo al que postulas (opcional)"
                value={letter.role}
                placeholder="Por ejemplo, atención al cliente"
                onChange={(e) => patch({ role: e.target.value })}
              />
              <TextInput
                label="Empresa (opcional)"
                value={letter.company}
                onChange={(e) => patch({ company: e.target.value })}
              />
              <TextInput
                label="Persona que la recibirá (si sabes)"
                value={letter.recipient}
                onChange={(e) => patch({ recipient: e.target.value })}
              />
              <TextArea
                label="¿Por qué te interesa? (opcional)"
                value={letter.motivation}
                placeholder="Algo que te atraiga del trabajo o que quieras aportar."
                hint="Es tu interés personal. No se usará para atribuir actividades o valores a la empresa."
                onChange={(e) => patch({ motivation: e.target.value })}
              />
              <Select
                label="Tono de la carta con IA"
                value={letter.tone}
                onChange={(e) => patch({ tone: e.target.value as CoverLetter['tone'] })}
              >
                {LETTER_TONES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
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
                    jobDescription: a ? a.jobDescription : letter.jobDescription,
                  });
                }}
              >
                <option value="">Sin aviso guardado</option>
                {state.applications.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.role} · {a.company}
                  </option>
                ))}
              </Select>
              {letter.applicationId && (
                <p className="notice">
                  Ya incluimos la descripción del aviso. La IA la usará junto con tu perfil; no
                  necesitas copiarla de nuevo.
                </p>
              )}
              <details>
                <summary>
                  {letter.jobDescription
                    ? 'Revisar la descripción del aviso'
                    : 'Agregar un aviso o requisitos (opcional)'}
                </summary>
                <TextArea
                  label="Descripción del trabajo"
                  rows={7}
                  hint="Pega las funciones y requisitos. La IA los usará como guía principal para adaptar la carta, sin atribuirte experiencia que no esté en tu CV."
                  value={letter.jobDescription}
                  onChange={(e) => patch({ jobDescription: e.target.value })}
                />
              </details>

              <AiAssist
                title="Escribe una carta con IA"
                description="Con los datos de arriba, la IA relaciona las tareas y requisitos del aviso con tu experiencia real. Tu motivación se incluye cuando encaja con ese trabajo."
              >
                {letter.body ? (
                  <ConfirmButton
                    confirmLabel="Sí, reemplazar mi texto con IA"
                    onConfirm={() => void generate()}
                  >
                    Crear otra versión con IA
                  </ConfirmButton>
                ) : (
                  <Button variant="primary" onClick={() => void generate()}>
                    <Sparkles size={18} />
                    Redactar mi carta con IA
                  </Button>
                )}
              </AiAssist>
              {busy && (
                <p role="status" className="notice">
                  La IA está leyendo tus datos y redactando. Con un modelo local puede tardar un
                  poco.
                </p>
              )}
              {message && (
                <p role="status" className="notice">
                  {message}
                </p>
              )}
              {letter.body ? (
                <ConfirmButton confirmLabel="Sí, reemplazar el borrador" onConfirm={draft}>
                  Crear otro borrador con mis datos
                </ConfirmButton>
              ) : (
                <Button onClick={draft}>Preparar un borrador</Button>
              )}
              <p className="field-hint">
                El borrador básico funciona sin IA: usa tu perfil y motivación, pero no analiza el
                aviso.
              </p>
              <ConfirmButton
                confirmLabel="Sí, eliminar esta carta"
                onConfirm={() => {
                  apply((s) => ({ ...s, letters: s.letters.filter((l) => l.id !== id) }));
                  setParams({});
                }}
              >
                Eliminar carta
              </ConfirmButton>
            </section>
            <section className="form-sheet">
              <span className="eyebrow">Tu borrador</span>
              <h2>Hazlo tuyo.</h2>
              <TextArea
                id="letter-body"
                label="Carta de presentación"
                rows={20}
                value={letter.body}
                onChange={(e) => patch({ body: e.target.value })}
                placeholder="Prepara un borrador o escribe aquí…"
              />
              <p className="field-hint">
                Revisa los datos y las frases entre corchetes. Esta carta no se envía
                automáticamente.
              </p>
              <div className="row">
                <CopyButton text={letter.body} label="Copiar carta" />
                <Button disabled={!letter.body.trim()} onClick={exportPdf}>
                  <Download size={17} />
                  Descargar carta
                </Button>
                {previous?.id === id && (
                  <Button
                    onClick={() => {
                      patch({ body: previous.body });
                      setPrevious(null);
                      setMessage('Recuperaste el texto anterior.');
                    }}
                  >
                    Recuperar texto anterior
                  </Button>
                )}
              </div>
            </section>
          </div>
        </fieldset>
      )}
    </>
  );
}
