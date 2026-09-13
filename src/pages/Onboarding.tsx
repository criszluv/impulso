import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CircleHelp } from 'lucide-react';
import { useApp } from '../state/context';
import { TextInput, Select, Button } from '../components/ui';
import { countries } from '../lib/jobs';
import { GuidedExperience, GuidedEducation } from '../components/GuidedHistory';
import { hasExperience, hasEducation, historyError, updateHomeLocation } from '../lib/guided';
import type { GuidedError } from '../lib/guided';

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
  '¿Dónde vives?',
  '¿Qué horarios te acomodan?',
  'Cuéntanos algo que hayas hecho.',
  '¿Qué sabes hacer?',
  '¿Cómo pueden contactarte?',
];
const subtitles = [
  'Puedes elegir una idea o escribir otra. Siempre podrás cambiarla.',
  'Tu país y ciudad irán en el currículum. Después puedes buscar empleo en otro lugar.',
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
    [skill, setSkill] = useState(''),
    [recordError, setRecordError] = useState<GuidedError | null>(null);
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
  const clearHistoryError = () => {
    setRecordError(null);
    setError('');
  };
  const updateLocation = (v: Partial<Pick<typeof p, 'country' | 'city'>>) =>
    apply((s) => updateHomeLocation(s, v));
  const next = () => {
    setError('');
    setHelp(false);
    if (step === 0 && !p.headline.trim()) {
      setError('Escribe un trabajo o elige una de las ideas.');
      return;
    }
    if ((step === 1 || step === 5) && !p.country.trim()) {
      setError('Elige el país donde vives.');
      if (step === 5) patchPref({ step: 1 });
      requestAnimationFrame(() => document.getElementById('home-country')?.focus());
      return;
    }
    if (step === 1 && !p.city.trim()) {
      setError('Escribe la comuna o ciudad donde buscas.');
      return;
    }
    if (step === 3 || step === 4) {
      const problem = historyError(step === 3 ? state.profile.experience : state.profile.education);
      if (problem) {
        setRecordError(problem);
        setError(problem.message);
        return;
      }
      setRecordError(null);
      if (step === 3) {
        const records = state.profile.experience.filter(hasExperience);
        setProfileList('experience', records);
        patchPref({ experience: records.length ? 'si' : 'no' });
      } else setProfileList('education', state.profile.education.filter(hasEducation));
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
        setError('Revisa el correo. Por ejemplo: maria@correo.com');
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
            'Tu ubicación',
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
          noValidate
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
              <Select
                id="home-country"
                label="País donde vives"
                value={p.country}
                autoComplete="country-name"
                onChange={(e) => updateLocation({ country: e.target.value })}
              >
                <option value="">Elige tu país</option>
                {p.country && !countries.some((c) => c.name === p.country) && (
                  <option value={p.country}>{p.country}</option>
                )}
                {[...countries]
                  .sort((a, b) => a.name.localeCompare(b.name, 'es'))
                  .map((c) => (
                    <option key={c.code} value={c.name}>
                      {c.name}
                    </option>
                  ))}
              </Select>
              <TextInput
                label="Comuna o ciudad"
                value={p.city}
                onChange={(e) => updateLocation({ city: e.target.value })}
                autoComplete="address-level2"
                placeholder={
                  countries.find((c) => c.name === p.country)?.cities[0] || 'Por ejemplo: Madrid'
                }
                list="home-cities"
              />
              <datalist id="home-cities">
                {countries
                  .find((c) => c.name === p.country)
                  ?.cities.map((c) => (
                    <option key={c} value={c} />
                  ))}
              </datalist>
              <p className="field-hint">
                Revisa que la ciudad corresponda al país elegido. El destino de búsqueda se puede
                cambiar en «Buscar trabajo».
              </p>
              <Select
                label="¿Hasta dónde puedes trasladarte?"
                value={pref.travel}
                onChange={(e) => patchPref({ travel: e.target.value })}
              >
                <option value="">Lo decidiré según el trabajo</option>
                <option>Solo en mi ciudad</option>
                <option>También a localidades cercanas</option>
                {['Solo en mi comuna', 'También a comunas cercanas'].includes(pref.travel) && (
                  <option>{pref.travel}</option>
                )}
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
              <GuidedExperience
                records={state.profile.experience}
                error={recordError}
                onEdited={clearHistoryError}
                onChange={(records) => {
                  setProfileList('experience', records);
                  patchPref({ experience: records.length ? 'si' : 'no' });
                }}
              />
              {state.profile.experience.length === 0 && (
                <>
                  <Button
                    variant={pref.experience === 'no' ? 'primary' : 'ghost'}
                    onClick={() => patchPref({ experience: 'no' })}
                  >
                    Busco mi primer trabajo
                  </Button>
                  {pref.experience === 'no' && (
                    <p className="notice">
                      Está bien. Podemos destacar tus habilidades y estudios para tu primer trabajo.
                    </p>
                  )}
                </>
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
              <GuidedEducation
                records={state.profile.education}
                onChange={(records) => setProfileList('education', records)}
                error={recordError}
                onEdited={clearHistoryError}
              />
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
                placeholder={
                  p.country === 'España'
                    ? '+34 612 345 678'
                    : p.country === 'Chile'
                      ? '+56 9 1234 5678'
                      : 'Incluye el código de tu país'
                }
              />
              <TextInput
                label="Correo electrónico (si tienes)"
                type="email"
                autoComplete="email"
                value={p.email}
                onChange={(e) => patchPersonal({ email: e.target.value })}
                placeholder="nombre@correo.com"
              />
              <p className="field-hint">
                No hace falta tu documento de identidad ni tu dirección exacta.
              </p>
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
                  setRecordError(null);
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
