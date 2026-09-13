import { Suspense, useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ArrowUpRight,
  House,
  FileText,
  Search,
  Bookmark,
  CircleHelp,
  ShieldCheck,
} from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';
import { useApp } from '../state/context';

const links = [
  { to: '/', label: 'Inicio', mobile: 'Inicio', icon: House, end: true },
  { to: '/cv', label: 'Mi currículum', mobile: 'Currículum', icon: FileText },
  { to: '/buscar', label: 'Buscar trabajo', mobile: 'Buscar', icon: Search },
  { to: '/postulaciones', label: 'Mis postulaciones', mobile: 'Mis trabajos', icon: Bookmark },
];
export function Layout() {
  const { saved, saveError } = useApp();
  const location = useLocation();
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    main.current?.focus();
  }, [location.pathname]);
  const cvRoute = ['/perfil', '/empezar', '/importar'].includes(location.pathname);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <header className="site-header">
        <Link to="/" className="brand" aria-label="Impulso, inicio">
          <span className="brand-symbol">
            <ArrowUpRight size={24} strokeWidth={3} />
          </span>
          impulso<span className="brand-dot">.</span>
        </Link>
        <nav aria-label="Navegación principal" className="desktop-nav">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                isActive || (l.to === '/cv' && cvRoute) ? 'active' : ''
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <Link className="help-link" to="/ajustes">
          <CircleHelp size={19} />
          <span>Ayuda y mis datos</span>
        </Link>
      </header>
      <main id="contenido" ref={main} tabIndex={-1} className="main">
        {saveError && (
          <div className="save-warning" role="alert">
            <strong>No está guardado.</strong> {saveError}{' '}
            <Link to="/ajustes">Proteger mis datos</Link>
          </div>
        )}
        <ErrorBoundary key={location.pathname}>
          <Suspense
            fallback={
              <p role="status" className="notice">
                Abriendo tu siguiente paso…
              </p>
            }
          >
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <footer className="site-footer">
        <span>
          <ShieldCheck size={17} />
          Tus datos se guardan en este navegador.
        </span>
        <Link to="/ajustes">
          Hacer una copia de seguridad <ArrowUpRight size={15} />
        </Link>
      </footer>
      <nav className="mobile-nav" aria-label="Navegación móvil">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => (isActive || (l.to === '/cv' && cvRoute) ? 'active' : '')}
          >
            <l.icon size={21} />
            <span>{l.mobile}</span>
          </NavLink>
        ))}
      </nav>
      <div className="saved-pill" role="status" aria-live="polite">
        {saved && !saveError ? 'Cambios guardados en este navegador' : ''}
      </div>
    </div>
  );
}
