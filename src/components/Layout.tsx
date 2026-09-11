import { NavLink, Outlet } from 'react-router-dom';
import { useApp } from '../state/context';
import { profileCompleteness } from '../lib/analysis';
import { Button } from './ui';

const LINKS = [
  { to: '/', icon: '◎', label: 'Inicio', end: true },
  { to: '/perfil', icon: '☰', label: 'Perfil profesional' },
  { to: '/cv', icon: '▤', label: 'Constructor de CV' },
  { to: '/cartas', icon: '✉', label: 'Cartas' },
  { to: '/postulaciones', icon: '⊞', label: 'Postulaciones' },
  { to: '/entrevistas', icon: '◗', label: 'Entrevistas' },
  { to: '/ajustes', icon: '⚙', label: 'Ajustes' },
];

export function Layout() {
  const { state, apply, saved } = useApp();
  const completeness = profileCompleteness(state.profile);
  const activeApps = state.applications.filter((a) => a.status !== 'rechazada').length;

  const counts: Record<string, number> = {
    '/postulaciones': activeApps,
    '/cartas': state.letters.length,
    '/entrevistas': state.answers.length,
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">I</div>
          <div>
            <strong>Impulso</strong>
            <small>Busca trabajo</small>
          </div>
        </div>

        <nav className="nav">
          <span className="nav-label">Menú</span>
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              <span className="nav-icon" aria-hidden="true">
                {l.icon}
              </span>
              {l.label}
              {counts[l.to] ? <span className="nav-count">{counts[l.to]}</span> : null}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="faint">Perfil completo al {completeness.score}%</div>
          <div
            style={{
              height: 5,
              borderRadius: 3,
              background: 'var(--ring-bg)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${completeness.score}%`,
                height: '100%',
                background: completeness.score >= 80 ? 'var(--good)' : 'var(--accent)',
                transition: 'width .3s',
              }}
            />
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => apply((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))}
          >
            {state.theme === 'dark' ? '☀ Modo claro' : '☾ Modo oscuro'}
          </Button>
          <span className="faint">Todo se guarda en este navegador.</span>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>

      {saved && <div className="saved-pill">Guardado ✓</div>}
    </div>
  );
}
