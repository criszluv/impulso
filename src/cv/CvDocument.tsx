import type { CSSProperties } from 'react';
import type { CvConfig, Profile } from '../types';
import { FONT_STACKS } from './fonts';
import { formatMonth, formatRange } from '../lib/utils';

interface Props {
  profile: Profile;
  config: CvConfig;
}

function Contact({ profile }: { profile: Profile }) {
  const p = profile.personal;
  const bits = [
    p.email,
    p.phone,
    [p.city, p.country].filter(Boolean).join(', '),
    p.linkedin,
    p.github,
    p.website,
  ].filter(Boolean);
  return (
    <div className="cv-contact">
      {bits.map((b) => (
        <span key={b}>{b}</span>
      ))}
    </div>
  );
}

function ExperienceSection({ profile }: { profile: Profile }) {
  if (!profile.experience.length) return null;
  return (
    <section className="cv-section">
      <h2>Experiencia</h2>
      {profile.experience.map((e) => (
        <article className="cv-entry" key={e.id}>
          <div className="cv-entry-head">
            <strong>{e.role || 'Cargo'}</strong>
            <span className="when">{formatRange(e.startDate, e.endDate, e.current)}</span>
          </div>
          <div className="where">{[e.company, e.location].filter(Boolean).join(' · ')}</div>
          {e.bullets.filter(Boolean).length > 0 && (
            <ul>
              {e.bullets.filter(Boolean).map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          )}
          {e.tech.length > 0 && <div className="cv-tech">{e.tech.join(' · ')}</div>}
        </article>
      ))}
    </section>
  );
}

function EducationSection({ profile }: { profile: Profile }) {
  if (!profile.education.length) return null;
  return (
    <section className="cv-section">
      <h2>Educación</h2>
      {profile.education.map((e) => (
        <article className="cv-entry" key={e.id}>
          <div className="cv-entry-head">
            <strong>{e.degree || 'Título'}</strong>
            <span className="when">{formatRange(e.startDate, e.endDate, e.current)}</span>
          </div>
          <div className="where">{[e.institution, e.location].filter(Boolean).join(' · ')}</div>
          {e.detail && <div className="cv-tech">{e.detail}</div>}
        </article>
      ))}
    </section>
  );
}

function SkillsSection({ profile, inline }: { profile: Profile; inline?: boolean }) {
  const groups = profile.skills.filter((g) => g.items.length);
  if (!groups.length) return null;
  return (
    <section className="cv-section">
      <h2>Habilidades</h2>
      {groups.map((g) =>
        inline ? (
          <div className="cv-skill-row" key={g.id}>
            <b>{g.name}</b>
            <span>{g.items.join(', ')}</span>
          </div>
        ) : (
          <div className="cv-entry" key={g.id}>
            <b className="cv-subhead">{g.name}</b>
            <div>{g.items.join(', ')}</div>
          </div>
        ),
      )}
    </section>
  );
}

function LanguagesSection({ profile }: { profile: Profile }) {
  if (!profile.languages.length) return null;
  return (
    <section className="cv-section">
      <h2>Idiomas</h2>
      {profile.languages.map((l) => (
        <div className="cv-skill-row" key={l.id}>
          <b>{l.name}</b>
          <span>{l.level}</span>
        </div>
      ))}
    </section>
  );
}

function ProjectsSection({ profile }: { profile: Profile }) {
  if (!profile.projects.length) return null;
  return (
    <section className="cv-section">
      <h2>Proyectos</h2>
      {profile.projects.map((p) => (
        <article className="cv-entry" key={p.id}>
          <div className="cv-entry-head">
            <strong>{p.name}</strong>
            {p.url && <span className="when">{p.url}</span>}
          </div>
          {p.description && <div>{p.description}</div>}
          {p.tech.length > 0 && <div className="cv-tech">{p.tech.join(' · ')}</div>}
        </article>
      ))}
    </section>
  );
}

function CertificationsSection({ profile }: { profile: Profile }) {
  if (!profile.certifications.length) return null;
  return (
    <section className="cv-section">
      <h2>Certificaciones</h2>
      {profile.certifications.map((c) => (
        <div className="cv-entry" key={c.id}>
          <div className="cv-entry-head">
            <strong>{c.name}</strong>
            <span className="when">{formatMonth(c.date)}</span>
          </div>
          {c.issuer && <div className="where">{c.issuer}</div>}
        </div>
      ))}
    </section>
  );
}

function Summary({ profile }: { profile: Profile }) {
  if (!profile.personal.summary.trim()) return null;
  return (
    <section className="cv-section">
      <h2>Perfil</h2>
      <p>{profile.personal.summary}</p>
    </section>
  );
}

export function CvDocument({ profile, config }: Props) {
  const p = profile.personal;
  const style = {
    '--cv-accent': config.template === 'ats' ? '#000000' : config.accent,
    '--cv-scale': config.fontScale,
    '--cv-font': FONT_STACKS[config.font] ?? FONT_STACKS.calibri,
  } as CSSProperties;

  const head = (
    <header className="cv-head">
      {config.showPhoto && p.photo && <img className="cv-photo" src={p.photo} alt="" />}
      <div style={{ minWidth: 0, flex: 1 }}>
        <h1 className="cv-name">{p.fullName || 'Tu nombre'}</h1>
        {p.headline && <div className="cv-headline">{p.headline}</div>}
        <Contact profile={profile} />
      </div>
    </header>
  );

  /**
   * Orden recomendado para filtros automáticos: contacto, resumen,
   * habilidades, experiencia, educación, certificaciones.
   */
  if (config.template === 'ats') {
    return (
      <article className="cv-page cv-ats" style={style}>
        {head}
        {config.showSummary && <Summary profile={profile} />}
        <SkillsSection profile={profile} inline />
        <ExperienceSection profile={profile} />
        <EducationSection profile={profile} />
        {config.showCertifications && <CertificationsSection profile={profile} />}
        {config.showLanguages && <LanguagesSection profile={profile} />}
        {config.showProjects && <ProjectsSection profile={profile} />}
      </article>
    );
  }

  if (config.template === 'moderno') {
    return (
      <article className="cv-page cv-moderno" style={style}>
        {head}
        <div className="cv-two-col" style={{ marginTop: 18 }}>
          <div>
            {config.showSummary && <Summary profile={profile} />}
            <ExperienceSection profile={profile} />
            {config.showProjects && <ProjectsSection profile={profile} />}
          </div>
          <aside className="cv-aside">
            <SkillsSection profile={profile} />
            <EducationSection profile={profile} />
            {config.showLanguages && <LanguagesSection profile={profile} />}
            {config.showCertifications && <CertificationsSection profile={profile} />}
          </aside>
        </div>
      </article>
    );
  }

  return (
    <article className={`cv-page cv-${config.template}`} style={style}>
      {head}
      {config.showSummary && <Summary profile={profile} />}
      <ExperienceSection profile={profile} />
      <EducationSection profile={profile} />
      <SkillsSection profile={profile} inline />
      {config.showProjects && <ProjectsSection profile={profile} />}
      {config.showLanguages && <LanguagesSection profile={profile} />}
      {config.showCertifications && <CertificationsSection profile={profile} />}
    </article>
  );
}
