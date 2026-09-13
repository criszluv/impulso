import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CircleHelp } from 'lucide-react';
import { useApp } from '../state/context';
import { TextInput, TextArea, Select, Button } from '../components/ui';
import { uid } from '../lib/utils';

const roles = [
  'Atención al cliente',
  'Cocina',
  'Aseo',
  'Bodega',
  'Construcción',
  'Cuidados',
  'Administración',
  'Mi primer trabajo',
];
const suggestions: Record<string, string[]> = {
  Cocina: [
    'Preparación de alimentos',
    'Limpieza de cocina',
    'Atención de pedidos',
    'Higiene de alimentos',
  ],
  Aseo: [
    'Limpieza de espacios',
    'Uso de productos de limpieza',
    'Orden de materiales',
    'Trabajo en equipo',
  ],
  Bodega: ['Recepción de productos', 'Preparación de pedidos', 'Inventario', 'Carga y descarga'],
  Construcción: [
    'Uso de herramientas',
    'Preparación de materiales',
    'Pintura',
    'Trabajo en equipo',
  ],
  Cuidados: [
    'Acompañamiento',
    'Apoyo en alimentación',
    'Organización de rutinas',
    'Comunicación con familias',
  ],
  Administración: [
    'Atención de público',
    'Organización de documentos',
    'Correo electrónico',
    'Planillas de cálculo',
  ],
  'Atención al cliente': [
    'Atención de clientes',
    'Reposición de productos',
    'Manejo de caja',
    'Resolución de consultas',
  ],
};
const titles = [
  '¿En qué te gustaría trabajar?',
  '¿Dónde buscas trabajo?',
  '¿Qué horarios te acomodan?',
  'Cuéntanos algo que hayas hecho.',
  '¿Qué sabes hacer?',
  '¿Cómo pueden contactarte?',
];
const subtitles = [
  'Puedes elegir una idea o escribir otra. Siempre podrás cambiarla.',
  'Puede ser tu comuna o una ciudad cercana.',
  'Elige lo que puedas compatibilizar con tu día a día.',
  'También cuentan trabajos por tu cuenta, cuidados y ayuda en un negocio familiar.',
  'Marca solo lo que sabes hacer. No necesitas certificados para comenzar.',
  'Estos datos irán en tu currículum. Basta un teléfono o un correo.',
];
export function Onboarding() {
  const { state, apply, patchPersonal, setProfileList } = useApp();
  const pref = state.preferences,
    p = state.profile.personal,
    step = pref.step;
  const [error, setError] = useState(''),
    [help, setHelp] = useState(false),
    [skill, setSkill] = useState('');
  const navigate = useNavigate(),
    heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  const patchPref = (patch: Partial<typeof pref>) =>
    apply((s) => ({ ...s, preferences: { ...s.preferences, ...patch } }));
  const skills = state.profile.skills.flatMap((s) => s.items);
  const toggleSkill = (value: string) => {
    if (skills.includes(value))
      setProfileList(
        'skills',
        state.profile.skills.map((g) => ({ ...g, items: g.items.filter((s) => s !== value) })),
      );
    else {
      const groups = [...state.profile.skills],
        i = groups.findIndex((g) => g.id === 'guided-skills');
      if (i < 0) groups.push({ id: 'guided-skills', name: 'Habilidades', items: [value] });
      else groups[i] = { ...groups[i], items: [...groups[i].items, value] };
      setProfileList('skills', groups);
    }
  };
  const exp = state.profile.experience[0];
  const addExperience = () => {
    patchPref({ experience: 'si' });
    if (!exp)
      setProfileList('experience', [
        {
          id: uid('exp'),
          role: '',
          company: '',
          location: p.city,
          startDate: '',
          endDate: '',
          current: false,
          bullets: [],
          tech: [],
        },
      ]);
  };
  const next = () => {
    setError('');
    setHelp(false);
    if (step === 0 && !p.headline.trim()) {
      setError('Escribe un trabajo o elige una de las ideas.');
      return;
    }
    if (step === 1 && !p.city.trim()) {
      setError('Escribe la comuna o ciudad donde buscas.');
      return;
    }
    if (step === 3 && exp && !exp.role.trim()) {
      setError(
        'Escribe qué trabajo o actividad hacías. Si lo prefieres, puedes dejarlo para después.',
      );
      return;
    }
    if (step === 5) {
      if (!p.fullName.trim()) {
        setError('Escribe tu nombre para el currículum.');
        return;
      }
      if (!p.phone.trim() && !p.email.trim()) {
        setError('Agrega un teléfono o un correo para que puedan contactarte.');
        return;
      }
      if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) {
        setError('Revisa el correo. Por ejemplo: maria@correo.cl');
        return;
      }
      if (p.phone && p.phone.replace(/\D/g, '').length < 8) {
        setError('Revisa el teléfono: parece que faltan números.');
        return;
      }
      apply((s) => ({
        ...s,
        preferences: { ...s.preferences, completed: true },
        profile: {
          ...s.profile,
          personal: {
            ...s.profile.personal,
            summary:
              s.profile.personal.summary ||
              'Busco trabajo en ' +
                s.profile.personal.headline.toLowerCase() +
                '.' +
                (skills.length ? ' Puedo aportar en ' + skills.slice(0, 5).join(', ') + '.' : '') +
                (pref.schedule ? ' Disponibilidad: ' + pref.schedule.toLowerCase() + '.' : ''),
          },
        },
      }));
      navigate('/cv');
      return;
    }
    patchPref({ step: step + 1 });
  };
  return (
    <div className="wizard-layout">
      <aside className="wizard-aside">
        <Link to="/" className="text-link">
          <ArrowLeft size={17} />
          Volver al inicio
        </Link>
        <h2>
          Tu historia,
          <br />
          <em>bien contada.</em>
        </h2>
        <p>No necesitas saber redactar un currículum. Vamos a hacerlo juntos.</p>
        <ol className="wizard-steps">
          {[
            'Tu trabajo ideal',
            'Dónde buscas',
            'Tus horarios',
            'Tu experiencia',
            'Lo que sabes',
            'Tu contacto',
          ].map((t, i) => (
            <li key={t} className={i === step ? 'current' : i < step ? 'finished' : ''}>
              <span>{i < step ? <Check size={14} /> : i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
        <Link to="/importar" className="text-link">
          ¿Ya tienes un currículum? Súbelo
        </Link>
      </aside>
      <section className="wizard-panel">
        <div className="eyebrow">Paso {step + 1} de 6</div>
        <h1 ref={heading} tabIndex={-1}>
          {titles[step]}
        </h1>
        <p className="lead">{subtitles[step]}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
        >
          {step === 0 && (
            <>
              <TextInput
                label="Quiero trabajar en…"
                value={p.headline}
                onChange={(e) => {
                  patchPersonal({ headline: e.target.value });
                  patchPref({ role: e.target.value });
                }}
                placeholder="Por ejemplo: auxiliar de cocina"
                autoComplete="organization-title"
              />
              <div className="choice-chips">
                {roles.map((r) => (
                  <button
                    className={p.headline === r ? 'selected' : ''}
                    type="button"
                    key={r}
                    onClick={() => {
                      patchPersonal({ headline: r });
                      patchPref({ role: r });
                    }}
                    aria-pressed={p.headline === r}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <TextInput
                label="Comuna o ciudad"
                value={p.city}
                onChange={(e) => {
                  patchPersonal({ city: e.target.value });
                  patchPref({ city: e.target.value });
                }}
                autoComplete="address-level2"
                placeholder="Por ejemplo: Osorno"
              />
              <Select
                label="¿Hasta dónde puedes trasladarte?"
                value={pref.travel}
                onChange={(e) => patchPref({ travel: e.target.value })}
              >
                <option value="">Lo decidiré según el trabajo</option>
                <option>Solo en mi comuna</option>
                <option>También a comunas cercanas</option>
                <option>Puedo cambiarme de ciudad</option>
                <option>Busco trabajar desde casa</option>
              </Select>
            </>
          )}
          {step === 2 && (
            <div className="option-list">
              {[
                'Jornada completa',
                'Media jornada',
                'Solo fines de semana',
                'Por turnos',
                'Horario flexible',
                'Aún no lo sé',
              ].map((s) => (
                <label key={s} className={pref.schedule === s ? 'selected' : ''}>
                  <input
                    type="radio"
                    name="schedule"
                    value={s}
                    checked={pref.schedule === s}
                    onChange={() => patchPref({ schedule: s })}
                  />
                  <span>{s}</span>
                </label>
              ))}
            </div>
          )}
          {step === 3 && (
            <>
              <div className="row">
                <Button type="button" onClick={addExperience}>
                  Sí, quiero contar una experiencia
                </Button>
                {!exp && (
                  <Button
                    type="button"
                    variant={pref.experience === 'no' ? 'primary' : 'ghost'}
                    onClick={() => patchPref({ experience: 'no' })}
                  >
                    Busco mi primer trabajo
                  </Button>
                )}
              </div>
              {exp && (
                <div className="stack">
                  <TextInput
                    label="¿Qué trabajo o actividad hacías?"
                    value={exp.role}
                    placeholder="Por ejemplo: ayudante en un almacén"
                    onChange={(e) =>
                      setProfileList(
                        'experience',
                        state.profile.experience.map((x) =>
                          x.id === exp.id ? { ...x, role: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <TextInput
                    label="¿Dónde? (opcional)"
                    value={exp.company}
                    placeholder="Empresa, negocio familiar o por mi cuenta"
                    onChange={(e) =>
                      setProfileList(
                        'experience',
                        state.profile.experience.map((x) =>
                          x.id === exp.id ? { ...x, company: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <TextArea
                    label="¿Qué tareas hacías?"
                    value={exp.bullets.join('\n')}
                    placeholder="Atendía clientes, ordenaba los productos y ayudaba en caja."
                    hint="Escríbelo con tus palabras. No hacen falta cifras."
                    onChange={(e) =>
                      setProfileList(
                        'experience',
                        state.profile.experience.map((x) =>
                          x.id === exp.id ? { ...x, bullets: e.target.value.split('\n') } : x,
                        ),
                      )
                    }
                  />
                  <Link to="/perfil" className="text-link">
                    Tengo más experiencias o quiero agregar fechas
                  </Link>
                  {!exp.role.trim() &&
                    !exp.company.trim() &&
                    !exp.bullets.some((b) => b.trim()) && (
                      <Button
                        type="button"
                        onClick={() => {
                          setProfileList('experience', state.profile.experience.slice(1));
                          patchPref({ experience: 'no', step: 4 });
                          setError('');
                        }}
                      >
                        Dejar esta experiencia vacía para después
                      </Button>
                    )}
                </div>
              )}
              {pref.experience === 'no' && !exp && (
                <p className="notice">
                  Está bien. Podemos destacar tus habilidades y estudios para tu primer trabajo.
                </p>
              )}
            </>
          )}
          {step === 4 && (
            <>
              <div className="choice-chips">
                {[
                  ...new Set([
                    ...(suggestions[p.headline] || [
                      'Atención de personas',
                      'Organización',
                      'Uso de herramientas',
                      'Trabajo en equipo',
                      'Manejo de computador',
                    ]),
                    ...skills,
                  ]),
                ].map((s) => (
                  <button
                    type="button"
                    aria-pressed={skills.includes(s)}
                    className={skills.includes(s) ? 'selected' : ''}
                    key={s}
                    onClick={() => toggleSkill(s)}
                  >
                    {skills.includes(s) && <Check size={14} />} {s}
                  </button>
                ))}
              </div>
              <div className="inline-add">
                <TextInput
                  label="Agregar algo más"
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                  placeholder="Por ejemplo: costura"
                />
                <Button
                  type="button"
                  disabled={!skill.trim()}
                  onClick={() => {
                    if (!skills.includes(skill.trim())) toggleSkill(skill.trim());
                    setSkill('');
                  }}
                >
                  Agregar
                </Button>
              </div>
              <details>
                <summary>Agregar mis estudios (opcional)</summary>
                <TextInput
                  label="Estudios o curso"
                  value={state.profile.education[0]?.degree || ''}
                  placeholder="Enseñanza media completa, curso de cocina…"
                  onChange={(e) => {
                    const old = state.profile.education[0];
                    setProfileList(
                      'education',
                      old
                        ? state.profile.education.map((x) =>
                            x.id === old.id ? { ...x, degree: e.target.value } : x,
                          )
                        : [
                            {
                              id: uid('edu'),
                              degree: e.target.value,
                              institution: '',
                              location: '',
                              startDate: '',
                              endDate: '',
                              current: false,
                              detail: '',
                            },
                          ],
                    );
                  }}
                />
              </details>
            </>
          )}
          {step === 5 && (
            <div className="stack">
              <TextInput
                label="Nombre completo"
                value={p.fullName}
                autoComplete="name"
                onChange={(e) => patchPersonal({ fullName: e.target.value })}
              />
              <TextInput
                label="Teléfono"
                type="tel"
                autoComplete="tel"
                value={p.phone}
                onChange={(e) => patchPersonal({ phone: e.target.value })}
                placeholder="+56 9 1234 5678"
              />
              <TextInput
                label="Correo electrónico (si tienes)"
                type="email"
                autoComplete="email"
                value={p.email}
                onChange={(e) => patchPersonal({ email: e.target.value })}
                placeholder="nombre@correo.cl"
              />
              <p className="field-hint">No pedimos tu RUT ni tu dirección exacta.</p>
            </div>
          )}
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
          <div className="wizard-actions">
            {step > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setError('');
                  setHelp(false);
                  patchPref({ step: step - 1 });
                }}
              >
                <ArrowLeft size={17} />
                Atrás
              </Button>
            )}
            <Button type="submit" variant="primary">
              {step === 5 ? 'Ver mi currículum' : 'Continuar'}
              <ArrowRight size={18} />
            </Button>
          </div>
        </form>
        <button className="help-trigger" onClick={() => setHelp(!help)} aria-expanded={help}>
          <CircleHelp size={17} />
          No sé qué poner
        </button>
        {help && (
          <p className="notice">
            {
              [
                'Piensa en una tarea que te gustaría hacer: atender personas, cocinar, limpiar, conducir o reparar cosas. Puedes escribir una, aunque nunca hayas tenido ese cargo.',
                'Escribe el nombre del lugar donde puedes trabajar. No hace falta una dirección.',
                'Si todavía no tienes un horario definido, elige «Aún no lo sé».',
                'Por ejemplo: «Ayudaba en un negocio familiar. Atendía personas y ordenaba los productos». Si nunca has trabajado, puedes continuar.',
                'Puedes incluir cosas que aprendiste en casa o por tu cuenta. Elige solo las que realmente sabes hacer.',
                'Revisa que el número esté bien escrito y que puedas recibir llamadas. Si no tienes correo, deja ese campo vacío.',
              ][step]
            }
          </p>
        )}
      </section>
    </div>
  );
}
