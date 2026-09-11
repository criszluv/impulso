import { useRef, useState } from 'react';
import { useApp } from '../state/context';
import type { AppState } from '../types';
import { demoState, initialState } from '../lib/defaults';
import { download } from '../lib/utils';
import { Button, Card, ConfirmButton, Toggle } from '../components/ui';

export function Settings() {
  const { state, replaceAll, apply } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');

  const exportJson = () => {
    const name = state.profile.personal.fullName.trim().toLowerCase().replace(/\s+/g, '-') || 'perfil';
    download(`impulso-${name}-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2));
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppState;
        if (!parsed || typeof parsed !== 'object' || !parsed.profile) {
          throw new Error('formato');
        }
        replaceAll({ ...initialState, ...parsed });
        setMessage('Datos importados correctamente.');
      } catch {
        setMessage('Ese archivo no tiene el formato de una copia de Impulso.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Ajustes</h1>
          <p>Tus datos viven solo en este navegador. Si borras el historial del sitio, se van con él.</p>
        </div>
      </div>

      <Card title="Copia de seguridad" subtitle="Exporta un archivo y guárdalo donde quieras. Es tu única copia.">
        <div className="row">
          <Button variant="primary" onClick={exportJson}>
            ⤓ Exportar mis datos
          </Button>
          <Button onClick={() => fileRef.current?.click()}>⤒ Importar desde archivo</Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importJson(file);
              e.target.value = '';
            }}
          />
        </div>
        {message && (
          <p className="muted" style={{ marginTop: 12 }}>
            {message}
          </p>
        )}
      </Card>

      <Card title="Apariencia">
        <Toggle
          label="Modo oscuro"
          checked={state.theme === 'dark'}
          onChange={(v) => apply((s) => ({ ...s, theme: v ? 'dark' : 'light' }))}
        />
      </Card>

      <Card title="Datos de ejemplo" subtitle="Para ver cómo se comporta la app con un perfil completo.">
        <div className="row">
          <Button onClick={() => replaceAll(demoState())}>Cargar perfil de ejemplo</Button>
          <span className="faint">Reemplaza todo lo que tengas cargado ahora.</span>
        </div>
      </Card>

      <Card title="Empezar de cero">
        <div className="row">
          <ConfirmButton confirmLabel="Sí, borrar todo" onConfirm={() => replaceAll(initialState)}>
            Borrar todos mis datos
          </ConfirmButton>
          <span className="faint">Exporta primero si no quieres perder nada.</span>
        </div>
      </Card>

      <Card title="Sobre Impulso">
        <p className="muted" style={{ fontSize: 13.5, maxWidth: '70ch' }}>
          Impulso funciona entero en tu navegador: no hay servidor, no hay cuenta y nada de lo que
          escribes sale de tu equipo. Las sugerencias de redacción son reglas de escritura conocidas
          (verbo de acción, contexto, resultado medible), no un modelo de lenguaje: te dicen qué
          revisar, pero el criterio y la verdad de lo que escribas son tuyos.
        </p>
      </Card>
    </>
  );
}
