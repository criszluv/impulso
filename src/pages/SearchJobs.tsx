import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Search, BookmarkPlus, Mail, ArrowLeft } from 'lucide-react';
import { useApp } from '../state/context';
import { TextInput, Select, Button } from '../components/ui';
import {
  countries,
  countryCode,
  fetchOffers,
  filterOffers,
  offerApplication,
  newLetter,
  portalSearches,
} from '../lib/jobs';
import type { JobFeed, JobOffer } from '../lib/jobs';

export function SearchJobs() {
  const { state, apply } = useApp(),
    nav = useNavigate(),
    p = state.preferences;
  const patch = (v: Partial<typeof p>) =>
    apply((s) => ({ ...s, preferences: { ...s.preferences, ...v } }));
  const [role, setRole] = useState(p.role || state.profile.personal.headline);
  const [country, setCountry] = useState(
    p.country || countryCode(state.profile.personal.country) || '*',
  );
  const [city, setCity] = useState(p.country ? p.city : p.city || state.profile.personal.city);
  const [schedule, setSchedule] = useState(
    ['Jornada completa', 'Media jornada'].includes(p.schedule) ? p.schedule : '',
  );
  const [feed, setFeed] = useState<JobFeed | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [query, setQuery] = useState({ role, country, city, schedule }),
    [selected, setSelected] = useState<JobOffer | null>(null);
  const [limit, setLimit] = useState(12),
    [message, setMessage] = useState('');
  const heading = useRef<HTMLHeadingElement>(null),
    resultsHeading = useRef<HTMLHeadingElement>(null);
  const results = filterOffers(feed?.jobs || [], query);
  const changed =
    query.role !== role ||
    query.country !== country ||
    query.city !== city ||
    query.schedule !== schedule;
  const search = async () => {
    setBusy(true);
    setError('');
    setSelected(null);
    setMessage('');
    setLimit(12);
    setQuery({ role, country, city, schedule });
    patch({ role, country, city, schedule });
    try {
      setFeed(await fetchOffers(AbortSignal.timeout(25000)));
    } catch (e) {
      setFeed(null);
      setError(
        e instanceof Error ? e.message : 'No pudimos cargar las ofertas. Inténtalo de nuevo.',
      );
    } finally {
      setBusy(false);
      requestAnimationFrame(() => resultsHeading.current?.focus());
    }
  };
  const save = (job: JobOffer) => {
    const existing = state.applications.find((a) => a.url === job.url);
    if (existing) return existing;
    const application = offerApplication(job);
    apply((s) => ({ ...s, applications: [application, ...s.applications] }));
    setMessage('Oferta guardada con su descripción. Todavía no has postulado.');
    return application;
  };
  const createLetter = (job: JobOffer) => {
    const a = save(job),
      letter = newLetter('', a);
    apply((s) => ({ ...s, letters: [letter, ...s.letters] }));
    nav('/cartas?carta=' + letter.id);
  };
  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Una oportunidad a la vez</span>
          <h1>Encuentra tu próximo trabajo.</h1>
          <p>Explora ofertas, guarda las que te interesan y prepara tu postulación aquí.</p>
        </div>
        <span className="page-icon peach">
          <Search size={29} />
        </span>
      </div>
      <form
        className="search-panel"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <div className="grid">
          <TextInput
            label="¿Qué trabajo buscas?"
            value={role}
            placeholder="Ventas, soporte, diseño…"
            onChange={(e) => setRole(e.target.value)}
          />
          <Select
            label="País donde quieres trabajar"
            hint="España, Chile y otros países. Este destino no cambia los datos de tu CV."
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setCity('');
            }}
          >
            <option value="*">Todos los países</option>
            {countries.map((c) => (
              <option value={c.code} key={c.code}>
                {c.name}
              </option>
            ))}
          </Select>
          <TextInput
            label="Ciudad (opcional)"
            value={city}
            list="search-cities"
            placeholder={
              countries.find((c) => c.code === country)?.cities[0] || 'Escribe una ciudad'
            }
            onChange={(e) => setCity(e.target.value)}
          />
          <datalist id="search-cities">
            {countries
              .find((c) => c.code === country)
              ?.cities.map((c) => (
                <option value={c} key={c} />
              ))}
          </datalist>
          <Select label="Horario" value={schedule} onChange={(e) => setSchedule(e.target.value)}>
            <option value="">Cualquier horario</option>
            <option>Jornada completa</option>
            <option>Media jornada</option>
          </Select>
        </div>
        <p className="field-hint">
          Las ofertas dentro de Impulso son remotas. Filtramos por el país o la región indicada en
          el aviso; la ciudad se usa al ampliar la búsqueda en portales. Comprueba las condiciones
          de residencia e idioma.
        </p>
        <Button type="submit" variant="primary" disabled={busy}>
          <Search size={18} />
          {busy ? 'Buscando ofertas…' : 'Ver ofertas en Impulso'}
        </Button>
        {changed && feed && (
          <p className="field-hint" role="status">
            Cambiaste los filtros. Presiona «Ver ofertas en Impulso» para aplicarlos.
          </p>
        )}
      </form>
      <div className="section-heading">
        <h2 ref={resultsHeading} tabIndex={-1}>
          Ofertas dentro de Impulso
        </h2>
        <Link to="/postulaciones?nueva=1" className="text-link">
          <BookmarkPlus size={17} />
          Guardar otro aviso
        </Link>
      </div>
      {!feed && !busy && !error && (
        <aside className="notice">
          Busca sin registrarte. Leemos ofertas públicas de Remotive y Jobicy; no compartimos tu
          currículum. Esta selección de avisos recientes no cubre todos los trabajos ni todos los
          rubros. Puedes dejar el cargo vacío para explorar.
        </aside>
      )}
      {busy && (
        <p role="status" className="notice">
          Consultando las fuentes de empleo…
        </p>
      )}
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      {feed && !busy && (
        <>
          <p className="field-hint">
            {results.length} ofertas en esta selección
            {query.role ? ' para «' + query.role + '»' : ''}. Los textos conservan el idioma
            original; muchos están en inglés.
          </p>
          <div className="feed-sources">
            {feed.sources.map((s) => (
              <p key={s.name}>
                <strong>{s.name}</strong> ·{' '}
                {s.status === 'error'
                  ? 'No disponible en este momento.'
                  : (s.status === 'stale' ? 'Sin conexión: mostramos la última copia. ' : '') +
                    'Consultado: ' +
                    new Date(s.fetchedAt).toLocaleString()}
                {s.name === 'Remotive' && ' · Publicación con 24 h de retraso.'}
              </p>
            ))}
          </div>
          {selected ? (
            <section className="form-sheet job-detail">
              <Button
                onClick={() => {
                  setSelected(null);
                  requestAnimationFrame(() =>
                    document.getElementById('offer-' + selected.id)?.focus(),
                  );
                }}
              >
                <ArrowLeft size={17} />
                Volver a los resultados
              </Button>
              <span className="pill mint">Remoto</span>
              <h2 ref={heading} tabIndex={-1}>
                {selected.title}
              </h2>
              <p>
                <strong>{selected.company}</strong> ·{' '}
                {selected.location || 'Ubicación por confirmar'}
              </p>
              <p>
                {selected.salary || 'Sueldo no informado'}
                {selected.type ? ' · ' + selected.type.replace(/[_-]/g, ' ') : ''}
              </p>
              <p>
                Fuente:{' '}
                <a className="text-link" href={selected.url} target="_blank" rel="noreferrer">
                  {selected.source}
                  <ArrowUpRight size={16} />
                </a>
              </p>
              <div className="row">
                <Button
                  variant="primary"
                  disabled={state.applications.some((a) => a.url === selected.url)}
                  onClick={() => save(selected)}
                >
                  <BookmarkPlus size={17} />
                  {state.applications.some((a) => a.url === selected.url)
                    ? 'Oferta guardada'
                    : 'Guardar esta oferta'}
                </Button>
                <Button onClick={() => createLetter(selected)}>
                  <Mail size={17} />
                  Preparar carta para esta oferta
                </Button>
              </div>
              <p className="notice">
                Guardar o preparar una carta no envía tu candidatura. Cuando estés listo, abre el
                aviso original para comprobar que siga vigente y postular.
              </p>
              <div className="job-description">
                {selected.description ||
                  'La fuente no incluye una descripción. Revisa el aviso original.'}
              </div>
              <a className="btn btn-primary" href={selected.url} target="_blank" rel="noreferrer">
                Ver aviso original y postular
                <ArrowUpRight size={18} />
              </a>
            </section>
          ) : (
            <>
              {results.length === 0 ? (
                <section className="empty-welcome">
                  <Search size={32} />
                  <h3>No hay coincidencias en esta selección.</h3>
                  <p>
                    Prueba un cargo más general o su nombre en inglés. Para trabajos presenciales o
                    más opciones en tu ciudad, usa los portales de abajo.
                  </p>
                </section>
              ) : (
                <div className="portal-grid">
                  {results.slice(0, limit).map((j) => (
                    <article className="portal-card" key={j.id}>
                      <span className="pill mint">
                        Remoto · {j.location || 'Ubicación por confirmar'}
                      </span>
                      <h3>{j.title}</h3>
                      <p>
                        {j.company}
                        <br />
                        {j.salary || 'Sueldo no informado'}
                      </p>
                      <Button
                        id={'offer-' + j.id}
                        variant="primary"
                        onClick={() => {
                          setSelected(j);
                          setMessage('');
                          requestAnimationFrame(() => heading.current?.focus());
                        }}
                      >
                        Leer oferta aquí
                      </Button>
                      <a className="text-link" href={j.url} target="_blank" rel="noreferrer">
                        Fuente: {j.source}
                        <ArrowUpRight size={15} />
                      </a>
                    </article>
                  ))}
                </div>
              )}
              {results.length > limit && (
                <Button onClick={() => setLimit((v) => v + 12)}>Mostrar más ofertas</Button>
              )}
            </>
          )}
        </>
      )}
      {message && (
        <p className="notice" role="status">
          {message} <Link to="/postulaciones">Ver mis postulaciones</Link>
        </p>
      )}
      <section className="form-sheet">
        <span className="eyebrow">Más opciones, también presenciales</span>
        <h2>Amplía la búsqueda en portales</h2>
        <p>
          Usamos el país, la ciudad, el cargo y el horario que escribiste arriba. Estos enlaces
          abren Google con resultados del portal elegido; el bloque especial de empleos depende de
          Google y de la región.
        </p>
        <div className="row">
          {portalSearches(role, city, country, schedule).map((p) => (
            <a
              className="btn btn-subtle"
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noreferrer"
            >
              Buscar en {p.name}
              <ArrowUpRight size={16} />
            </a>
          ))}
        </div>
        <p className="field-hint">
          Si encuentras un aviso allí, puedes guardarlo en «Mis postulaciones» pegando su enlace y
          descripción.
        </p>
      </section>
    </>
  );
}
