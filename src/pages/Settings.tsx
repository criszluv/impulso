import { useRef, useState } from 'react';
import { useApp } from '../state/context';
import type { AppState } from '../types';
import { demoState, initialState } from '../lib/defaults';
import { download } from '../lib/utils';
import { AI_PRESETS, CLAUDE_MODELS, isConfigured, listOllamaModels, presetById } from '../lib/ai/settings';
import type { AiPreset } from '../lib/ai/settings';
import { testConnection } from '../lib/ai/client';
import { Badge, Button, Card, ConfirmButton, Select, TextInput, Toggle } from '../components/ui';

const COST_LABEL: Record<AiPreset['cost'], { text: string; tone: string }> = {
  no: { text: 'Gratis', tone: 'good' },
  limite: { text: 'Capa gratuita', tone: 'accent' },
  si: { text: 'De pago', tone: 'warn' },
};

export function Settings() {
  const { state, replaceAll, apply, ai, setAi } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [localModels, setLocalModels] = useState<string[]>([]);
  const [detectError, setDetectError] = useState('');

  const preset = presetById(ai.preset);
  const isLocal = Boolean(preset && /localhost|127\.0\.0\.1/.test(preset.baseUrl));

  const choosePreset = (p: AiPreset) => {
    setAi({
      preset: p.id,
      provider: p.provider,
      baseUrl: p.baseUrl,
      model: p.defaultModel,
      // La clave no se arrastra entre proveedores: cada uno tiene la suya.
      apiKey: '',
      reader: ai.reader,
    });
    setTestResult(null);
    setLocalModels([]);
    setDetectError('');
  };

  const detectModels = async () => {
    setDetectError('');
    try {
      const models = await listOllamaModels(ai.baseUrl);
      setLocalModels(models);
      if (!models.length) {
        setDetectError('Ollama está corriendo pero no tiene modelos descargados. Prueba: ollama pull qwen3:8b');
      } else if (!ai.model) {
        setAi({ ...ai, model: models[0] });
      }
    } catch {
      setDetectError(
        'No respondió Ollama en esa dirección. Revisa que esté corriendo (el icono en la barra de tareas) e inténtalo de nuevo.',
      );
    }
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

  const exportJson = () => {
    const name = state.profile.personal.fullName.trim().toLowerCase().replace(/\s+/g, '-') || 'perfil';
    download(`impulso-${name}-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2));
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppState;
        if (!parsed || typeof parsed !== 'object' || !parsed.profile) throw new Error('formato');
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

      <Card
        title="Asistente con IA (opcional)"
        subtitle="Mejora bastante la precisión al leer un CV o un aviso, y permite pedir sugerencias de redacción."
        actions={isConfigured(ai) ? <Badge tone="good">Activo</Badge> : <Badge>Sin configurar</Badge>}
      >
        <p className="muted" style={{ fontSize: 13.5, maxWidth: '72ch', marginBottom: 16 }}>
          El lector que trae la app funciona sin conexión y sin costo, pero adivina la estructura del
          documento con reglas, y en un CV con columnas, tablas o encabezados poco comunes se
          equivoca. Con un modelo detrás, el mismo texto se interpreta en vez de adivinarse. Puedes
          usar uno en tu propio computador —gratis y sin que el texto salga de ahí— o un servicio en
          la nube.
        </p>

        <div className="field-label" style={{ marginBottom: 8 }}>
          ¿Con qué lo conectamos?
        </div>
        <div className="grid">
          {AI_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="stat source-card"
              onClick={() => choosePreset(p)}
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                font: 'inherit',
                color: 'inherit',
                borderColor: ai.preset === p.id ? 'var(--accent)' : 'var(--line)',
                background: ai.preset === p.id ? 'var(--accent-soft)' : 'var(--bg-soft)',
              }}
            >
              <span className="row" style={{ gap: 8, marginBottom: 2 }}>
                <b style={{ fontSize: 14 }}>{p.name}</b>
                <Badge tone={COST_LABEL[p.cost].tone}>{COST_LABEL[p.cost].text}</Badge>
              </span>
              <span>{p.detail}</span>
            </button>
          ))}
        </div>

        {preset && (
          <div style={{ marginTop: 18 }}>
            {preset.note && (
              <div className="issue issue-tip" style={{ marginBottom: 14 }}>
                <span className="issue-icon">i</span>
                <div>
                  <strong>{preset.note}</strong>
                </div>
              </div>
            )}

            <div className="grid">
              {(preset.id === 'custom' || preset.provider === 'openai-compat') && (
                <TextInput
                  label="Dirección del servidor"
                  value={ai.baseUrl}
                  onChange={(e) => {
                    setAi({ ...ai, baseUrl: e.target.value });
                    setTestResult(null);
                  }}
                  placeholder="http://localhost:11434/v1"
                  hint="Tiene que terminar donde vive /chat/completions."
                  wide={preset.id === 'custom'}
                />
              )}

              {preset.provider === 'anthropic' ? (
                <Select
                  label="Modelo"
                  value={ai.model}
                  onChange={(e) => {
                    setAi({ ...ai, model: e.target.value });
                    setTestResult(null);
                  }}
                  hint={CLAUDE_MODELS.find((m) => m.id === ai.model)?.detail}
                >
                  {CLAUDE_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              ) : localModels.length ? (
                <Select
                  label="Modelo"
                  value={ai.model}
                  onChange={(e) => {
                    setAi({ ...ai, model: e.target.value });
                    setTestResult(null);
                  }}
                  hint="Detectados en tu Ollama."
                >
                  {localModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              ) : (
                <TextInput
                  label="Modelo"
                  value={ai.model}
                  onChange={(e) => {
                    setAi({ ...ai, model: e.target.value });
                    setTestResult(null);
                  }}
                  placeholder={preset.defaultModel || 'nombre-del-modelo'}
                  hint={preset.id === 'ollama' ? 'El nombre exacto, como qwen3:8b o llama3.1:8b.' : undefined}
                />
              )}

              {preset.needsKey && (
                <div className="field field-wide">
                  <span className="field-label">Clave de la API</span>
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
                      placeholder="Pega aquí tu clave"
                    />
                    <Button size="sm" variant="ghost" onClick={() => setShowKey((v) => !v)}>
                      {showKey ? 'Ocultar' : 'Ver'}
                    </Button>
                  </div>
                  {preset.keyUrl && (
                    <span className="field-hint">
                      Se crea en{' '}
                      <a href={preset.keyUrl} target="_blank" rel="noreferrer">
                        {new URL(preset.keyUrl).hostname}
                      </a>
                      .
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="row" style={{ marginTop: 14 }}>
              <Button variant="primary" disabled={!isConfigured(ai) || testing} onClick={() => void runTest()}>
                {testing ? 'Probando…' : 'Probar conexión'}
              </Button>
              {preset.id === 'ollama' && (
                <Button onClick={() => void detectModels()}>Detectar mis modelos</Button>
              )}
              <ConfirmButton confirmLabel="Sí, desconectar" onConfirm={() => setAi({ ...ai, preset: '', apiKey: '', model: '', baseUrl: '' })}>
                Desconectar
              </ConfirmButton>
            </div>

            {detectError && (
              <div className="issue issue-warn" style={{ marginTop: 14 }}>
                <span className="issue-icon">!</span>
                <div>
                  <strong>{detectError}</strong>
                </div>
              </div>
            )}

            {testResult && (
              <div className={`issue issue-${testResult.ok ? 'ok' : 'error'}`} style={{ marginTop: 14 }}>
                <span className="issue-icon">{testResult.ok ? '✓' : '✕'}</span>
                <div>
                  <strong>{testResult.message}</strong>
                </div>
              </div>
            )}

            <div className="field" style={{ marginTop: 18 }}>
              <Toggle
                label="Leer avisos de trabajo desde su enlace"
                checked={preset.provider === 'anthropic' || ai.reader === 'jina'}
                onChange={(v) => setAi({ ...ai, reader: v ? 'jina' : 'ninguno' })}
              />
              <span className="field-hint">
                {preset.provider === 'anthropic'
                  ? 'Con Claude viene incluido: la página la lee el servidor de Anthropic, que ya es tu proveedor, sin sumar a nadie más.'
                  : 'Tu proveedor no puede abrir páginas, así que el enlace se manda a r.jina.ai, un servicio externo que devuelve el texto. Ojo: ese servicio ve a qué estás postulando. Tu CV y tus datos no salen; solo el enlace. Si prefieres evitarlo, déjalo apagado y pega el texto a mano.'}
              </span>
            </div>

            {isLocal ? (
              <div className="issue issue-ok" style={{ marginTop: 14 }}>
                <span className="issue-icon">✓</span>
                <div>
                  <strong>Nada sale de tu computador</strong>
                  <p>
                    El modelo corre en tu equipo, así que el CV y los avisos no viajan a ningún
                    servicio. Es la opción más privada y no cuesta nada; a cambio es más lenta y un
                    modelo chico se equivoca más que uno de pago.
                  </p>
                </div>
              </div>
            ) : (
              <div className="issue issue-warn" style={{ marginTop: 14 }}>
                <span className="issue-icon">!</span>
                <div>
                  <strong>Qué sale de tu equipo y dónde queda tu clave</strong>
                  <p>
                    Se manda solo el texto que le pidas leer en ese momento —el CV que subes, el
                    aviso que pegas o el logro que quieres mejorar—, y va a {preset.name}. El resto
                    de tu perfil y tus postulaciones no salen nunca. La clave queda guardada en este
                    navegador y la petición sale directo desde acá, sin servidor intermedio: no la
                    guardes en un equipo compartido, y ten presente que la copia de seguridad que
                    exportas más abajo <b>no la incluye</b>.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
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
          activarlo con un proveedor en la nube. Las revisiones de redacción y de compatibilidad con
          filtros son reglas de escritura conocidas aplicadas a tu texto, no un modelo de lenguaje.
        </p>
      </Card>
    </>
  );
}
