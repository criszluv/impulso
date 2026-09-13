import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Search, MapPin, BookmarkPlus, ExternalLink } from 'lucide-react';
import { useApp } from '../state/context';
import { TextInput, Select, CopyButton } from '../components/ui';

export function SearchJobs() {
  const { state, apply } = useApp();
  const p = state.preferences;
  const patch = (v: Partial<typeof p>) =>
    apply((s) => ({ ...s, preferences: { ...s.preferences, ...v } }));
  const [role, setRole] = useState(p.role || state.profile.personal.headline);
  const [city, setCity] = useState(p.city || state.profile.personal.city);
  const query = [
    role,
    city,
    p.schedule === 'Aún no lo sé' ? '' : p.schedule,
    p.travel === 'Busco trabajar desde casa' ? 'remoto' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const portals = [
    {
      name: 'Bolsa Nacional de Empleo',
      domain: 'bne.cl',
      url: 'https://www.bne.cl/',
      tag: 'Servicio público',
      detail: 'Ofertas de distintos rubros y orientación para tu búsqueda.',
      color: 'mint',
    },
    {
      name: 'Chiletrabajos',
      domain: 'chiletrabajos.cl',
      url: 'https://www.chiletrabajos.cl/',
      tag: 'Distintos rubros',
      detail: 'Encuentra avisos de empresas y revisa cómo postular.',
      color: 'peach',
    },
  ];
  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Una oportunidad a la vez</span>
          <h1>Encuentra tu próximo trabajo.</h1>
          <p>Cuéntanos qué buscas. Te ayudamos a llegar a los avisos.</p>
        </div>
        <span className="page-icon peach">
          <Search size={29} />
        </span>
      </div>
      <section className="search-panel">
        <div className="grid">
          <TextInput
            label="¿Qué trabajo buscas?"
            value={role}
            placeholder="Cocina, ventas, bodega…"
            onChange={(e) => {
              setRole(e.target.value);
              patch({ role: e.target.value });
            }}
          />
          <TextInput
            label="¿En qué comuna o ciudad?"
            value={city}
            placeholder="Osorno"
            onChange={(e) => {
              setCity(e.target.value);
              patch({ city: e.target.value });
            }}
          />
          <Select
            label="Horario"
            value={p.schedule}
            onChange={(e) => patch({ schedule: e.target.value })}
          >
            <option value="">Cualquier horario</option>
            {[
              'Jornada completa',
              'Media jornada',
              'Solo fines de semana',
              'Por turnos',
              'Horario flexible',
              'Aún no lo sé',
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </div>
        <p className="field-hint">
          <MapPin size={15} /> {p.travel || 'Revisa la ubicación y el traslado antes de postular.'}{' '}
          <Link to="/empezar">Cambiar mis preferencias</Link>
        </p>
      </section>
      <div className="section-heading">
        <h2>Elige dónde buscar</h2>
        <span className="muted">Se abre otra página. Impulso queda aquí.</span>
      </div>
      <div className="portal-grid">
        {portals.map((p) => (
          <article className="portal-card" key={p.domain}>
            <span className={'pill ' + p.color}>{p.tag}</span>
            <h2>{p.name}</h2>
            <p>{p.detail}</p>
            <a
              className="btn btn-primary"
              target="_blank"
              rel="noreferrer"
              href={
                'https://www.google.com/search?q=' +
                encodeURIComponent('site:' + p.domain + ' ' + query + ' empleo')
              }
            >
              Buscar mis opciones
              <ArrowUpRight size={18} />
            </a>
            <small>Búsqueda en Google de avisos de {p.name}.</small>
            <a href={p.url} target="_blank" rel="noreferrer" className="text-link">
              Ir directo al portal
              <ExternalLink size={14} />
            </a>
          </article>
        ))}
      </div>
      <aside className="notice">
        <strong>Estos resultados todavía no se leen dentro de Impulso.</strong> Comprueba en el
        aviso si sigue disponible, el sueldo, los horarios y los requisitos. Los filtros son
        palabras de búsqueda; no garantizan que todos los resultados cumplan tus preferencias.
      </aside>
      <section className="next-action">
        <div>
          <span className="eyebrow">Cuando encuentres uno</span>
          <h2>Guarda lo que te interesa.</h2>
          <p>Copia el enlace del aviso y vuelve aquí. Te ayudamos a preparar el envío.</p>
        </div>
        <Link className="btn btn-primary" to="/postulaciones?nueva=1">
          <BookmarkPlus size={19} />
          Guardar un aviso
        </Link>
      </section>
      <details>
        <summary>Necesito ayuda para buscar y copiar un aviso</summary>
        <ol className="plain-steps">
          <li>Presiona «Buscar mis opciones». Se abrirá una pestaña con resultados.</li>
          <li>Abre un aviso y revisa el lugar, el horario y los requisitos.</li>
          <li>En la barra de direcciones, selecciona el enlace y elige «Copiar».</li>
          <li>Vuelve a Impulso, presiona «Guardar un aviso» y pega el enlace.</li>
        </ol>
        <p>Si prefieres buscar directamente en el portal, puedes copiar estas palabras:</p>
        <CopyButton text={query} label="Copiar mi búsqueda" />
      </details>
    </>
  );
}
