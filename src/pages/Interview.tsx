import { useState } from 'react';
import { useApp } from '../state/context';
import { removeById, upsert } from '../lib/list';
import type { StarAnswer } from '../types';
import { uid } from '../lib/utils';
import { INTERVIEW_QUESTIONS, QUESTIONS_TO_ASK } from '../lib/writing';
import { Badge, Button, Card, ConfirmButton, CopyButton, Empty, TextArea, TextInput } from '../components/ui';

function starText(a: StarAnswer): string {
  return [
    a.situation && `Situación: ${a.situation}`,
    a.task && `Tarea: ${a.task}`,
    a.action && `Acción: ${a.action}`,
    a.result && `Resultado: ${a.result}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function Interview() {
  const { state, setAnswers } = useApp();
  const { answers } = state;
  const [openId, setOpenId] = useState<string | null>(null);

  const addAnswer = (question: string) => {
    const a: StarAnswer = { id: uid('star'), question, situation: '', task: '', action: '', result: '' };
    setAnswers([a, ...answers]);
    setOpenId(a.id);
  };

  const patch = (id: string, p: Partial<StarAnswer>) => {
    const a = answers.find((x) => x.id === id);
    if (!a) return;
    setAnswers(upsert(answers, { ...a, ...p }));
  };

  const answered = new Set(answers.map((a) => a.question));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Preparación de entrevistas</h1>
          <p>
            Las respuestas se improvisan mal. Escribe las cuatro o cinco historias que puedes contar
            y vas a poder adaptarlas a casi cualquier pregunta.
          </p>
        </div>
      </div>

      <Card
        title="Tus respuestas"
        subtitle="Método STAR: Situación, Tarea, Acción, Resultado. La Acción es la parte que más pesa."
        actions={
          <Button size="sm" variant="primary" onClick={() => addAnswer('')}>
            + Respuesta en blanco
          </Button>
        }
      >
        {answers.length === 0 ? (
          <Empty
            title="Todavía no preparas ninguna"
            text="Elige una pregunta del banco de abajo y escríbela. Con cuatro historias bien armadas cubres la mayoría de las entrevistas."
          />
        ) : (
          answers.map((a) => {
            const open = openId === a.id;
            const filled = [a.situation, a.task, a.action, a.result].filter((v) => v.trim()).length;
            return (
              <div className="item" key={a.id}>
                <div className="item-head">
                  <Button size="sm" variant="ghost" onClick={() => setOpenId(open ? null : a.id)}>
                    {open ? '▾' : '▸'}
                  </Button>
                  <h3>{a.question || 'Pregunta sin título'}</h3>
                  <Badge tone={filled === 4 ? 'good' : filled > 0 ? 'warn' : 'neutral'}>{filled}/4</Badge>
                  <span className="spacer" />
                  <CopyButton text={`${a.question}\n\n${starText(a)}`} label="Copiar" />
                  <ConfirmButton onConfirm={() => setAnswers(removeById(answers, a.id))}>Eliminar</ConfirmButton>
                </div>
                {open && (
                  <div className="item-body">
                    <div className="grid" style={{ gridTemplateColumns: '1fr' }}>
                      <TextInput
                        label="Pregunta"
                        value={a.question}
                        onChange={(e) => patch(a.id, { question: e.target.value })}
                      />
                      <TextArea
                        label="Situación"
                        rows={2}
                        value={a.situation}
                        onChange={(e) => patch(a.id, { situation: e.target.value })}
                        hint="Dónde y cuándo. Dos frases bastan."
                      />
                      <TextArea
                        label="Tarea"
                        rows={2}
                        value={a.task}
                        onChange={(e) => patch(a.id, { task: e.target.value })}
                        hint="Qué había que lograr y por qué era difícil."
                      />
                      <TextArea
                        label="Acción"
                        rows={3}
                        value={a.action}
                        onChange={(e) => patch(a.id, { action: e.target.value })}
                        hint="Lo que hiciste tú. Habla en primera persona singular, no en «nosotros»."
                      />
                      <TextArea
                        label="Resultado"
                        rows={2}
                        value={a.result}
                        onChange={(e) => patch(a.id, { result: e.target.value })}
                        hint="Con cifra si se puede, y qué aprendiste."
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </Card>

      <Card title="Banco de preguntas" subtitle="Las que más se repiten, con el criterio detrás de cada una.">
        <div className="stack" style={{ gap: 8 }}>
          {INTERVIEW_QUESTIONS.map((q) => (
            <div className="item" key={q.question} style={{ marginBottom: 0 }}>
              <div className="item-head">
                <Badge tone="accent">{q.category}</Badge>
                <h3>{q.question}</h3>
                <span className="spacer" />
                {answered.has(q.question) ? (
                  <Badge tone="good">Preparada</Badge>
                ) : (
                  <Button size="sm" onClick={() => addAnswer(q.question)}>
                    Preparar
                  </Button>
                )}
              </div>
              <div className="item-body" style={{ paddingTop: 10, paddingBottom: 10 }}>
                <p className="muted" style={{ fontSize: 13.5 }}>
                  {q.tip}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card
        title="Preguntas que conviene hacer tú"
        subtitle="Al final siempre preguntan si tienes dudas. Decir que no es una oportunidad perdida."
      >
        <ul className="checklist">
          {QUESTIONS_TO_ASK.map((q) => (
            <li key={q}>
              <span className="mark">?</span>
              <span className="label">{q}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
