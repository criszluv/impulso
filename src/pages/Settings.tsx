import { useRef, useState } from 'react';
import { useApp } from '../state/context';
import type { AppState } from '../types';
import { demoState, initialState } from '../lib/defaults';
import { download } from '../lib/utils';
import { AI_MODELS, hasAiKey } from '../lib/ai/settings';
import type { AiModel } from '../lib/ai/settings';
import { testConnection } from '../lib/ai/client';
import { Badge, Button, Card, ConfirmButton, Select, Toggle } from '../components/ui';

export function Settings() {
  const { state, replaceAll, apply, ai, setAi } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

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

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testConnection(ai);
    setTestResult(
      result.ok
        ? { ok: true, message: 'Conexión correcta. La lectura con IA ya está disponible.' }
        : { ok: false, message: result.message },
    );
    setTesting(false);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Ajustes</h1>
          <p>Tus datos viven solo en este navegador. Si borras el historial del sitio, se van con él.</p>
        </div>
      </div>

      <Card
        title="Asistente con IA (opcional)"
        subtitle="Mejora bastante la precisión al leer un CV o un aviso, y permite pedir sugerencias de redacción."
        actions={hasAiKey(ai) ? <Badge tone="good">Activo</Badge> : <Badge>Sin configurar</Badge>}
      >
        <p className="muted" style={{ fontSize: 13.5, maxWidth: '72ch', marginBottom: 16 }}>
          El lector que trae la app funciona sin conexión y sin costo, pero adivina la estructura del
          documento con reglas, y en un CV con columnas, tablas o encabezados poco comunes se
          equivoca. Con una clave de la API de Claude, el mismo texto lo interpreta un modelo y los
          datos caen donde corresponde. La lectura sin IA se queda como alternativa siempre
          disponible.
        </p>

        <div className="grid">
          <div className="field field-wide">
            <span className="field-label">Clave de la API de Anthropic</span>
            <div className="row" style={{ flexWrap: 'nowrap', gap: 8 }}>
              <input
                className="input"
                type={showKey ? 'text' : 'password'}
                autoComplete="off"
                spellCheck={false}
                value={ai.apiKey}
                onChange={(e) => {
                  setAi({ ...ai, apiKey: e.target.value });
                  setTestResult(null);
                }}
                placeholder="sk-ant-..."
              />
              <Button size="sm" variant="ghost" onClick={() => setShowKey((v) => !v)}>
                {showKey ? 'Ocultar' : 'Ver'}
              </Button>
            </div>
            <span className="field-hint">
              Se crea en{' '}
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
                console.anthropic.com
              </a>
              . Es tu clave y tú pagas el consumo: leer un CV cuesta del orden de unos centavos de
              dólar.
            </span>
          </div>

          <Select
            label="Modelo"
            value={ai.model}
            onChange={(e) => {
              setAi({ ...ai, model: e.target.value as AiModel });
              setTestResult(null);
            }}
            hint={AI_MODELS.find((m) => m.id === ai.model)?.detail}
          >
            {AI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="row" style={{ marginTop: 14 }}>
          <Button variant="primary" disabled={!hasAiKey(ai) || testing} onClick={() => void runTest()}>
            {testing ? 'Probando…' : 'Probar conexión'}
          </Button>
          {hasAiKey(ai) && (
            <ConfirmButton confirmLabel="Sí, borrar la clave" onConfirm={() => setAi({ ...ai, apiKey: '' })}>
              Quitar clave
            </ConfirmButton>
          )}
        </div>

        {testResult && (
          <div className={`issue issue-${testResult.ok ? 'ok' : 'error'}`} style={{ marginTop: 14 }}>
            <span className="issue-icon">{testResult.ok ? '✓' : '✕'}</span>
            <div>
              <strong>{testResult.message}</strong>
            </div>
          </div>
        )}

        <div className="issue issue-warn" style={{ marginTop: 14 }}>
          <span className="issue-icon">!</span>
          <div>
            <strong>Dónde queda tu clave</strong>
            <p>
              En este navegador, y desde acá sale directo a la API de Anthropic; no pasa por ningún
              servidor intermedio porque esta app no tiene. Dos consecuencias: cualquiera que use
              este computador y abra las herramientas del navegador puede verla, así que no la
              guardes en un equipo compartido; y la copia de seguridad que exportas más abajo
              <b> no la incluye</b>, para que puedas compartir ese archivo sin regalar tu clave.
            </p>
          </div>
        </div>

        <div className="issue issue-tip" style={{ marginTop: 10 }}>
          <span className="issue-icon">i</span>
          <div>
            <strong>Qué se manda y qué no</strong>
            <p>
              Solo el texto que le pidas leer en ese momento: el CV que subes, el aviso que pegas o
              el logro que quieres mejorar. El resto de tu perfil, tus postulaciones y tus notas no
              salen nunca de tu equipo.
            </p>
          </div>
        </div>
      </Card>

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
          escribes sale de tu equipo, salvo lo que le mandes al asistente con IA si decides
          activarlo. Las revisiones de redacción y de compatibilidad con filtros son reglas de
          escritura conocidas aplicadas a tu texto, no un modelo de lenguaje: te dicen qué revisar,
          pero el criterio y la verdad de lo que escribas son tuyos.
        </p>
      </Card>
    </>
  );
}
