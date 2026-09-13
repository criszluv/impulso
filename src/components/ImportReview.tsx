import type { ParsedCv } from '../lib/import/parseCv';
import { TextInput, TextArea, Toggle } from './ui';
export function ImportReview({
  parsed,
  onChange,
}: {
  parsed: ParsedCv;
  onChange: (p: ParsedCv) => void;
}) {
  return (
    <details>
      <summary>Corregir los datos detectados antes de guardar</summary>
      <div className="grid">
        {(
          [
            ['fullName', 'Nombre completo'],
            ['headline', 'Cargo o profesión'],
            ['email', 'Correo'],
            ['phone', 'Teléfono'],
            ['city', 'Ciudad'],
            ['country', 'País'],
          ] as const
        ).map(([key, label]) => (
          <TextInput
            key={key}
            label={label}
            value={parsed.personal[key] || ''}
            onChange={(e) =>
              onChange({ ...parsed, personal: { ...parsed.personal, [key]: e.target.value } })
            }
          />
        ))}
      </div>
      <TextArea
        label="Resumen detectado"
        value={parsed.personal.summary || ''}
        onChange={(e) =>
          onChange({ ...parsed, personal: { ...parsed.personal, summary: e.target.value } })
        }
      />
      {parsed.experience.map((e, i) => {
        const edit = (v: Partial<typeof e>) =>
          onChange({
            ...parsed,
            experience: parsed.experience.map((x, n) => (n === i ? { ...x, ...v } : x)),
          });
        return (
          <fieldset key={e.id}>
            <legend>Trabajo {i + 1}</legend>
            <div className="grid">
              <TextInput
                label={'Cargo del trabajo ' + (i + 1)}
                value={e.role}
                onChange={(v) => edit({ role: v.target.value })}
              />
              <TextInput
                label={'Empresa del trabajo ' + (i + 1)}
                value={e.company}
                onChange={(v) => edit({ company: v.target.value })}
              />
              <TextInput
                type="month"
                label={'Inicio del trabajo ' + (i + 1)}
                value={e.startDate}
                onChange={(v) => edit({ startDate: v.target.value })}
              />
              <TextInput
                type="month"
                label={'Fin del trabajo ' + (i + 1)}
                value={e.endDate}
                disabled={e.current}
                onChange={(v) => edit({ endDate: v.target.value })}
              />
            </div>
            <Toggle
              label={'Sigo en el trabajo ' + (i + 1)}
              checked={e.current}
              onChange={(v) => edit({ current: v, endDate: v ? '' : e.endDate })}
            />
            <TextArea
              label={'Tareas del trabajo ' + (i + 1)}
              hint="Una tarea por línea."
              value={e.bullets.join('\n')}
              onChange={(v) => edit({ bullets: v.target.value.split('\n') })}
            />
          </fieldset>
        );
      })}
      {parsed.education.map((e, i) => {
        const edit = (v: Partial<typeof e>) =>
          onChange({
            ...parsed,
            education: parsed.education.map((x, n) => (n === i ? { ...x, ...v } : x)),
          });
        return (
          <fieldset key={e.id}>
            <legend>Estudios {i + 1}</legend>
            <TextInput
              label={'Título ' + (i + 1)}
              value={e.degree}
              onChange={(v) => edit({ degree: v.target.value })}
            />
            <TextInput
              label={'Centro de estudios ' + (i + 1)}
              value={e.institution}
              onChange={(v) => edit({ institution: v.target.value })}
            />
            <div className="grid">
              <TextInput
                type="month"
                label={'Inicio de estudios ' + (i + 1)}
                value={e.startDate}
                onChange={(v) => edit({ startDate: v.target.value })}
              />
              <TextInput
                type="month"
                label={'Fin de estudios ' + (i + 1)}
                value={e.endDate}
                onChange={(v) => edit({ endDate: v.target.value })}
              />
            </div>
          </fieldset>
        );
      })}
      <p className="field-hint">
        Al guardar se abrirá tu perfil, donde puedes revisar también habilidades, idiomas y otras
        secciones.
      </p>
    </details>
  );
}
