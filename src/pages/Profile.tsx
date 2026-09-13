import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../state/context';
import { moveItem, removeById } from '../lib/list';
import type { Certification, Education, Experience, LanguageItem, LanguageLevel, Project, SkillGroup } from '../types';
import { uid } from '../lib/utils';
import { reviewSummary } from '../lib/analysis';
import { linkedinAbout, linkedinHeadlines, summaryVariants } from '../lib/writing';
import { BulletEditor } from '../components/BulletEditor';
import {
  Badge,
  Button,
  Card,
  ConfirmButton,
  CopyButton,
  Empty,
  IssueList,
  Select,
  TagInput,
  TextArea,
  TextInput,
  Toggle,
} from '../components/ui';

const LEVELS: LanguageLevel[] = ['Básico', 'Intermedio', 'Avanzado', 'Nativo'];

function ItemShell({
  title,
  subtitle,
  onUp,
  onDown,
  onRemove,
  children,
}: {
  title: string;
  subtitle?: string;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="item">
      <div className="item-head">
        <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
          {open ? '▾' : '▸'}
        </Button>
        <h3>{title}</h3>
        {subtitle && <span className="faint">{subtitle}</span>}
        <span className="spacer" />
        <Button size="sm" variant="ghost" onClick={onUp} title="Subir">
          ↑
        </Button>
        <Button size="sm" variant="ghost" onClick={onDown} title="Bajar">
          ↓
        </Button>
        <ConfirmButton onConfirm={onRemove}>Eliminar</ConfirmButton>
      </div>
      {open && <div className="item-body">{children}</div>}
    </div>
  );
}

export function ProfilePage() {
  const { state, patchPersonal, setProfileList } = useApp();
  const { profile } = state;
  const p = profile.personal;
  const [showVariants, setShowVariants] = useState(false);
  const [target, setTarget] = useState('');

  const summaryIssues = reviewSummary(p.summary);
  const variants = summaryVariants(profile, target);

  const patchAt = <T extends { id: string }>(
    key: 'experience' | 'education' | 'skills' | 'languages' | 'projects' | 'certifications',
    list: T[],
    id: string,
    patch: Partial<T>,
  ) => {
    setProfileList(
      key,
      list.map((item) => (item.id === id ? { ...item, ...patch } : item)) as never,
    );
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Perfil profesional</h1>
          <p>
            Esto es la fuente de verdad: el CV, las cartas y el análisis de ofertas se arman con lo
            que escribas acá. Vale la pena hacerlo bien una vez.
          </p>
        </div>
        <div className="head-actions">
          <Link to="/importar">
            <Button>↥ Importar desde mi CV o LinkedIn</Button>
          </Link>
        </div>
      </div>

      {!p.fullName && !profile.experience.length && (
        <div className="next-step">
          <span className="num" aria-hidden="true">
            ↥
          </span>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h3>¿Tienes un CV o un perfil de LinkedIn?</h3>
            <p>
              Cárgalo y llega todo repartido en las secciones de abajo, listo para corregir. Es
              bastante más rápido que llenar los campos uno por uno.
            </p>
          </div>
          <Link to="/importar">
            <Button variant="primary">Importar</Button>
          </Link>
        </div>
      )}

      <Card title="Datos personales" subtitle="Lo que va en la cabecera del CV.">
        <div className="grid">
          <TextInput
            label="Nombre completo"
            value={p.fullName}
            onChange={(e) => patchPersonal({ fullName: e.target.value })}
            placeholder="María Paz González"
          />
          <TextInput
            label="Titular profesional"
            hint="El cargo que buscas, no necesariamente el que tienes."
            value={p.headline}
            onChange={(e) => patchPersonal({ headline: e.target.value })}
            placeholder="Analista de Datos · SQL y Power BI"
          />
          <TextInput
            label="Correo"
            type="email"
            value={p.email}
            onChange={(e) => patchPersonal({ email: e.target.value })}
            placeholder="nombre.apellido@correo.com"
          />
          <TextInput
            label="Teléfono"
            value={p.phone}
            onChange={(e) => patchPersonal({ phone: e.target.value })}
            placeholder="+56 9 1234 5678"
          />
          <TextInput label="Ciudad" value={p.city} onChange={(e) => patchPersonal({ city: e.target.value })} />
          <TextInput label="País" value={p.country} onChange={(e) => patchPersonal({ country: e.target.value })} />
          <TextInput
            label="LinkedIn"
            value={p.linkedin}
            onChange={(e) => patchPersonal({ linkedin: e.target.value })}
            placeholder="linkedin.com/in/tuusuario"
          />
          <TextInput
            label="GitHub o portafolio"
            value={p.github}
            onChange={(e) => patchPersonal({ github: e.target.value })}
            placeholder="github.com/tuusuario"
          />
          <TextInput
            label="Sitio web"
            value={p.website}
            onChange={(e) => patchPersonal({ website: e.target.value })}
          />
          <div className="field">
            <span className="field-label">Foto (opcional)</span>
            <div className="row">
              {p.photo && <img src={p.photo} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />}
              <input
                type="file"
                accept="image/*"
                className="input"
                style={{ padding: 6, fontSize: 12 }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => patchPersonal({ photo: String(reader.result) });
                  reader.readAsDataURL(file);
                }}
              />
              {p.photo && (
                <Button size="sm" variant="ghost" onClick={() => patchPersonal({ photo: '' })}>
                  Quitar
                </Button>
              )}
            </div>
            <span className="field-hint">En Chile es común incluirla; en procesos internacionales, mejor no.</span>
          </div>
        </div>
      </Card>

      <Card
        title="Resumen profesional"
        subtitle="Las tres a cinco líneas que más se leen. Quién eres, qué has logrado y qué buscas."
        actions={
          <Button size="sm" onClick={() => setShowVariants((v) => !v)}>
            {showVariants ? 'Ocultar propuestas' : '✦ Proponer redacción'}
          </Button>
        }
      >
        <TextArea
          label="Tu resumen"
          rows={5}
          value={p.summary}
          onChange={(e) => patchPersonal({ summary: e.target.value })}
          placeholder="Contadora con 6 años en cierres mensuales para empresas de retail…"
        />
        <div style={{ marginTop: 12 }}>
          <IssueList issues={summaryIssues} />
        </div>

        {showVariants && (
          <div style={{ marginTop: 16 }}>
            <TextInput
              label="¿Qué buscas ahora?"
              wide
              hint="Opcional. Se usa para cerrar el resumen. Ej: «un rol donde pueda liderar un equipo pequeño»."
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
            <div className="stack" style={{ marginTop: 12 }}>
              {variants.map((v) => (
                <div className="item" key={v.name} style={{ marginBottom: 0 }}>
                  <div className="item-head">
                    <h3>{v.name}</h3>
                    <span className="faint">{v.description}</span>
                    <span className="spacer" />
                    <Button size="sm" variant="primary" onClick={() => patchPersonal({ summary: v.text })}>
                      Usar
                    </Button>
                  </div>
                  <div className="item-body">
                    <p style={{ fontSize: 14 }}>{v.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="faint" style={{ marginTop: 10 }}>
              Son borradores armados con tus propios datos. Edítalos: lo que suena a plantilla se nota.
            </p>
          </div>
        )}
      </Card>

      <Card
        title="Experiencia"
        subtitle="De lo más reciente a lo más antiguo."
        actions={
          <Button
            size="sm"
            variant="primary"
            onClick={() =>
              setProfileList('experience', [
                {
                  id: uid('exp'),
                  role: '',
                  company: '',
                  location: '',
                  startDate: '',
                  endDate: '',
                  current: false,
                  bullets: [''],
                  tech: [],
                } satisfies Experience,
                ...profile.experience,
              ])
            }
          >
            + Agregar cargo
          </Button>
        }
      >
        {profile.experience.length === 0 ? (
          <Empty
            title="Sin experiencia cargada"
            text="Cuentan las prácticas, los trabajos por proyecto, el voluntariado y lo que hayas construido por tu cuenta."
          />
        ) : (
          profile.experience.map((e, index) => (
            <ItemShell
              key={e.id}
              title={e.role || 'Cargo sin nombre'}
              subtitle={e.company}
              onUp={() => setProfileList('experience', moveItem(profile.experience, index, -1))}
              onDown={() => setProfileList('experience', moveItem(profile.experience, index, 1))}
              onRemove={() => setProfileList('experience', removeById(profile.experience, e.id))}
            >
              <div className="grid">
                <TextInput
                  label="Cargo"
                  value={e.role}
                  onChange={(ev) => patchAt('experience', profile.experience, e.id, { role: ev.target.value })}
                />
                <TextInput
                  label="Empresa"
                  value={e.company}
                  onChange={(ev) => patchAt('experience', profile.experience, e.id, { company: ev.target.value })}
                />
                <TextInput
                  label="Ubicación"
                  value={e.location}
                  onChange={(ev) => patchAt('experience', profile.experience, e.id, { location: ev.target.value })}
                  placeholder="Santiago · Remoto"
                />
                <TextInput
                  label="Desde"
                  type="month"
                  value={e.startDate}
                  onChange={(ev) => patchAt('experience', profile.experience, e.id, { startDate: ev.target.value })}
                />
                <TextInput
                  label="Hasta"
                  type="month"
                  value={e.endDate}
                  disabled={e.current}
                  onChange={(ev) => patchAt('experience', profile.experience, e.id, { endDate: ev.target.value })}
                />
                <div className="field" style={{ justifyContent: 'flex-end' }}>
                  <Toggle
                    label="Trabajo aquí actualmente"
                    checked={e.current}
                    onChange={(v) => patchAt('experience', profile.experience, e.id, { current: v })}
                  />
                </div>
                <BulletEditor
                  bullets={e.bullets}
                  onChange={(next) => patchAt('experience', profile.experience, e.id, { bullets: next })}
                />
                <TagInput
                  label="Herramientas y tecnologías"
                  value={e.tech}
                  onChange={(next) => patchAt('experience', profile.experience, e.id, { tech: next })}
                  hint="Aparecen bajo el cargo y ayudan a calzar con las ofertas."
                />
              </div>
            </ItemShell>
          ))
        )}
      </Card>

      <Card
        title="Formación"
        actions={
          <Button
            size="sm"
            variant="primary"
            onClick={() =>
              setProfileList('education', [
                ...profile.education,
                {
                  id: uid('edu'),
                  degree: '',
                  institution: '',
                  location: '',
                  startDate: '',
                  endDate: '',
                  current: false,
                  detail: '',
                } satisfies Education,
              ])
            }
          >
            + Agregar
          </Button>
        }
      >
        {profile.education.length === 0 ? (
          <Empty title="Sin formación cargada" text="Títulos, carreras técnicas, diplomados o cursos relevantes." />
        ) : (
          profile.education.map((e, index) => (
            <ItemShell
              key={e.id}
              title={e.degree || 'Formación'}
              subtitle={e.institution}
              onUp={() => setProfileList('education', moveItem(profile.education, index, -1))}
              onDown={() => setProfileList('education', moveItem(profile.education, index, 1))}
              onRemove={() => setProfileList('education', removeById(profile.education, e.id))}
            >
              <div className="grid">
                <TextInput
                  label="Título o programa"
                  value={e.degree}
                  onChange={(ev) => patchAt('education', profile.education, e.id, { degree: ev.target.value })}
                />
                <TextInput
                  label="Institución"
                  value={e.institution}
                  onChange={(ev) => patchAt('education', profile.education, e.id, { institution: ev.target.value })}
                />
                <TextInput
                  label="Ubicación"
                  value={e.location}
                  onChange={(ev) => patchAt('education', profile.education, e.id, { location: ev.target.value })}
                />
                <TextInput
                  label="Desde"
                  type="month"
                  value={e.startDate}
                  onChange={(ev) => patchAt('education', profile.education, e.id, { startDate: ev.target.value })}
                />
                <TextInput
                  label="Hasta"
                  type="month"
                  value={e.endDate}
                  disabled={e.current}
                  onChange={(ev) => patchAt('education', profile.education, e.id, { endDate: ev.target.value })}
                />
                <div className="field" style={{ justifyContent: 'flex-end' }}>
                  <Toggle
                    label="En curso"
                    checked={e.current}
                    onChange={(v) => patchAt('education', profile.education, e.id, { current: v })}
                  />
                </div>
                <TextArea
                  label="Detalle"
                  rows={2}
                  value={e.detail}
                  onChange={(ev) => patchAt('education', profile.education, e.id, { detail: ev.target.value })}
                  hint="Tesis, distinciones o menciones. Si no aporta, déjalo vacío."
                />
              </div>
            </ItemShell>
          ))
        )}
      </Card>

      <Card
        title="Habilidades"
        subtitle="Agrúpalas por categoría: los filtros automáticos y los reclutadores las leen mejor así."
        actions={
          <Button
            size="sm"
            variant="primary"
            onClick={() =>
              setProfileList('skills', [
                ...profile.skills,
                { id: uid('sk'), name: 'Nueva categoría', items: [] } satisfies SkillGroup,
              ])
            }
          >
            + Agregar categoría
          </Button>
        }
      >
        {profile.skills.length === 0 ? (
          <Empty title="Sin habilidades" text="Por ejemplo: «Herramientas», «Idiomas técnicos», «Gestión»." />
        ) : (
          profile.skills.map((g, index) => (
            <ItemShell
              key={g.id}
              title={g.name}
              subtitle={`${g.items.length} ${g.items.length === 1 ? 'habilidad' : 'habilidades'}`}
              onUp={() => setProfileList('skills', moveItem(profile.skills, index, -1))}
              onDown={() => setProfileList('skills', moveItem(profile.skills, index, 1))}
              onRemove={() => setProfileList('skills', removeById(profile.skills, g.id))}
            >
              <div className="grid">
                <TextInput
                  label="Categoría"
                  value={g.name}
                  onChange={(ev) => patchAt('skills', profile.skills, g.id, { name: ev.target.value })}
                />
                <TagInput
                  label="Habilidades"
                  value={g.items}
                  onChange={(next) => patchAt('skills', profile.skills, g.id, { items: next })}
                />
              </div>
            </ItemShell>
          ))
        )}
      </Card>

      <Card
        title="Idiomas"
        actions={
          <Button
            size="sm"
            variant="primary"
            onClick={() =>
              setProfileList('languages', [
                ...profile.languages,
                { id: uid('lang'), name: '', level: 'Intermedio' } satisfies LanguageItem,
              ])
            }
          >
            + Agregar
          </Button>
        }
      >
        {profile.languages.length === 0 ? (
          <Empty title="Sin idiomas" text="Indica el nivel real: en la entrevista lo van a probar." />
        ) : (
          <div className="stack">
            {profile.languages.map((l) => (
              <div className="row" key={l.id} style={{ alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <TextInput
                    label="Idioma"
                    value={l.name}
                    onChange={(ev) => patchAt('languages', profile.languages, l.id, { name: ev.target.value })}
                  />
                </div>
                <div style={{ width: 170 }}>
                  <Select
                    label="Nivel"
                    value={l.level}
                    onChange={(ev) =>
                      patchAt('languages', profile.languages, l.id, { level: ev.target.value as LanguageLevel })
                    }
                  >
                    {LEVELS.map((lv) => (
                      <option key={lv} value={lv}>
                        {lv}
                      </option>
                    ))}
                  </Select>
                </div>
                <ConfirmButton onConfirm={() => setProfileList('languages', removeById(profile.languages, l.id))}>
                  Eliminar
                </ConfirmButton>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card
        title="Proyectos"
        subtitle="Especialmente útil si tienes poca experiencia formal."
        actions={
          <Button
            size="sm"
            variant="primary"
            onClick={() =>
              setProfileList('projects', [
                ...profile.projects,
                { id: uid('prj'), name: '', url: '', description: '', tech: [] } satisfies Project,
              ])
            }
          >
            + Agregar
          </Button>
        }
      >
        {profile.projects.length === 0 ? (
          <Empty title="Sin proyectos" text="Un proyecto propio bien explicado vale más que tres cursos sin aplicar." />
        ) : (
          profile.projects.map((pr, index) => (
            <ItemShell
              key={pr.id}
              title={pr.name || 'Proyecto'}
              onUp={() => setProfileList('projects', moveItem(profile.projects, index, -1))}
              onDown={() => setProfileList('projects', moveItem(profile.projects, index, 1))}
              onRemove={() => setProfileList('projects', removeById(profile.projects, pr.id))}
            >
              <div className="grid">
                <TextInput
                  label="Nombre"
                  value={pr.name}
                  onChange={(ev) => patchAt('projects', profile.projects, pr.id, { name: ev.target.value })}
                />
                <TextInput
                  label="Enlace"
                  value={pr.url}
                  onChange={(ev) => patchAt('projects', profile.projects, pr.id, { url: ev.target.value })}
                />
                <TextArea
                  label="Descripción"
                  rows={2}
                  value={pr.description}
                  onChange={(ev) => patchAt('projects', profile.projects, pr.id, { description: ev.target.value })}
                  hint="Qué problema resuelve y algún número: usuarios, tiempo ahorrado, descargas."
                />
                <TagInput
                  label="Tecnologías"
                  value={pr.tech}
                  onChange={(next) => patchAt('projects', profile.projects, pr.id, { tech: next })}
                />
              </div>
            </ItemShell>
          ))
        )}
      </Card>

      <Card
        title="Certificaciones"
        actions={
          <Button
            size="sm"
            variant="primary"
            onClick={() =>
              setProfileList('certifications', [
                ...profile.certifications,
                { id: uid('cert'), name: '', issuer: '', date: '', url: '' } satisfies Certification,
              ])
            }
          >
            + Agregar
          </Button>
        }
      >
        {profile.certifications.length === 0 ? (
          <Empty title="Sin certificaciones" text="Incluye solo las que tengan peso para el cargo que buscas." />
        ) : (
          <div className="stack">
            {profile.certifications.map((c) => (
              <div className="row" key={c.id} style={{ alignItems: 'flex-end' }}>
                <div style={{ flex: 2, minWidth: 180 }}>
                  <TextInput
                    label="Certificación"
                    value={c.name}
                    onChange={(ev) => patchAt('certifications', profile.certifications, c.id, { name: ev.target.value })}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <TextInput
                    label="Emisor"
                    value={c.issuer}
                    onChange={(ev) => patchAt('certifications', profile.certifications, c.id, { issuer: ev.target.value })}
                  />
                </div>
                <div style={{ width: 150 }}>
                  <TextInput
                    label="Fecha"
                    type="month"
                    value={c.date}
                    onChange={(ev) => patchAt('certifications', profile.certifications, c.id, { date: ev.target.value })}
                  />
                </div>
                <ConfirmButton
                  onConfirm={() => setProfileList('certifications', removeById(profile.certifications, c.id))}
                >
                  Eliminar
                </ConfirmButton>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card
        title="Tu perfil en LinkedIn"
        subtitle="Mismo contenido, otro tono: aquí sí se escribe en primera persona."
      >
        <div className="field-label" style={{ marginBottom: 8 }}>
          Titulares posibles
        </div>
        <div className="stack" style={{ gap: 8 }}>
          {linkedinHeadlines(profile).map((h) => (
            <div className="row" key={h} style={{ flexWrap: 'nowrap', gap: 8 }}>
              <div className="input" style={{ flex: 1, background: 'var(--bg-soft)' }}>
                {h}
              </div>
              <CopyButton text={h} />
            </div>
          ))}
        </div>

        <div className="field-label" style={{ margin: '18px 0 8px' }}>
          Sección «Acerca de»
        </div>
        <div
          className="input"
          style={{ whiteSpace: 'pre-wrap', background: 'var(--bg-soft)', minHeight: 120 }}
        >
          {linkedinAbout(profile)}
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <CopyButton text={linkedinAbout(profile)} label="Copiar «Acerca de»" />
          <span className="faint">
            Se arma con tu resumen y tus logros con cifras. Ajústalo antes de pegarlo.
          </span>
        </div>
      </Card>

      <div className="row" style={{ justifyContent: 'center', marginTop: 8 }}>
        <Badge tone="accent">Los cambios se guardan solos en este navegador</Badge>
      </div>
    </>
  );
}
