import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useApp } from '../state/context';
import {
  AI_PRESETS,
  presetById,
  isConfigured,
  isLocalEndpoint,
  localTransportUrl,
} from '../lib/ai/settings';
import { testConnection } from '../lib/ai/client';
import { Button, TextInput, Select } from '../components/ui';

export function AdvancedSettings() {
  const { ai, setAi } = useApp(),
    [params] = useSearchParams(),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState(''),
    [models, setModels] = useState<string[]>([]);
  const preset = presetById(ai.preset),
    local = isLocalEndpoint(ai);
  const back = params.get('volver') || '/importar',
    returnTo = /^\/(importar|cartas|perfil|cv)(\?|$)/.test(back) ? back : '/importar';
  const choose = (id: string) => {
    const p = presetById(id);
    setAi(
      p
        ? {
            ...ai,
            preset: p.id,
            provider: p.provider,
            baseUrl: p.baseUrl,
            model: p.defaultModel,
            apiKey: '',
          }
        : { ...ai, preset: '', apiKey: '', model: '', baseUrl: '' },
    );
    setResult('');
    setModels([]);
  };
  const detect = async () => {
    setBusy(true);
    setResult('');
    try {
      const url = localTransportUrl(ai.baseUrl.replace(/\/$/, '') + '/models');
      const response = await fetch(url, { signal: AbortSignal.timeout(7000) });
      if (!response.ok) throw Error();
      const data = await response.json();
      const names: string[] = (data.data || [])
        .map((m: { id?: string }) => m.id)
        .filter((n: unknown) => typeof n === 'string');
      setModels(names);
      if (!names.length)
        setResult(
          'El servidor está abierto, pero no tiene modelos disponibles. Descarga o carga un modelo en Ollama o LM Studio.',
        );
      else {
        if (!names.includes(ai.model)) setAi({ ...ai, model: names[0] });
        setResult('Encontramos ' + names.length + ' modelo(s). Elige uno y prueba la conexión.');
      }
    } catch {
      setResult(
        'No encontramos el servidor. Abre Ollama o LM Studio, carga un modelo y vuelve a intentar.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="narrow-page">
      <Link className="text-link" to={returnTo}>
        <ArrowLeft size={17} />
        Volver a lo que estaba haciendo
      </Link>
      <div className="page-head">
        <div>
          <span className="eyebrow">Tu ayuda para escribir y ordenar datos</span>
          <h1>Activa tu IA</h1>
          <p>
            Lee currículums y redacta cartas desde Impulso. Puedes usar un modelo que funcione en tu
            propio equipo.
          </p>
        </div>
        <Sparkles size={30} />
      </div>
      <section className="form-sheet">
        <h2>1. Elige dónde funciona</h2>
        <Select
          label="Servicio"
          value={ai.preset}
          disabled={busy}
          onChange={(e) => choose(e.target.value)}
        >
          <option value="">Sin activar</option>
          <optgroup label="En mi equipo, sin clave de pago">
            {AI_PRESETS.filter((p) => ['ollama', 'lmstudio'].includes(p.id)).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Ya tengo un servicio externo">
            {AI_PRESETS.filter((p) => !['ollama', 'lmstudio'].includes(p.id)).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
        </Select>
        {!preset && (
          <div className="row">
            <Button variant="primary" onClick={() => choose('ollama')}>
              Usar Ollama en mi equipo
            </Button>
            <Button onClick={() => choose('lmstudio')}>Usar LM Studio</Button>
          </div>
        )}
        {preset && (
          <>
            {['ollama', 'lmstudio'].includes(preset.id) && (
              <aside className="notice">
                <strong>Si es tu primera vez:</strong> abre{' '}
                <a href={preset.keyUrl} target="_blank" rel="noreferrer">
                  {preset.name}
                </a>
                , instala la aplicación y descarga un modelo de texto. Déjala abierta
                {preset.id === 'lmstudio' ? ' con el servidor local iniciado' : ''}. Después vuelve
                aquí y busca tus modelos. La calidad y la velocidad dependen del modelo y de tu
                equipo.
              </aside>
            )}
            <h2>2. Conecta tu modelo</h2>
            <p className="field-hint">
              {local
                ? 'Esta dirección apunta a tu propio equipo. El currículum y las cartas se procesarán allí.'
                : 'Al usar esta IA, enviarás los datos de la tarea al servicio configurado. Sus precios y límites dependen de tu cuenta. La clave se guarda solo en este navegador y no se incluye en tus copias de seguridad.'}
            </p>
            {preset.needsKey && (
              <TextInput
                label="Clave del servicio"
                type="password"
                autoComplete="off"
                value={ai.apiKey}
                onChange={(e) => {
                  setAi({ ...ai, apiKey: e.target.value });
                  setResult('');
                }}
              />
            )}
            {local && (
              <Button disabled={busy} onClick={() => void detect()}>
                {busy ? 'Comprobando…' : 'Buscar modelos en mi equipo'}
              </Button>
            )}
            <TextInput
              label="Modelo"
              list="ai-models"
              value={ai.model}
              placeholder="El nombre del modelo instalado"
              onChange={(e) => {
                setAi({ ...ai, model: e.target.value });
                setResult('');
              }}
            />
            <datalist id="ai-models">
              {models.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <details>
              <summary>Dirección del servidor</summary>
              <TextInput
                label="Dirección del servidor"
                value={ai.baseUrl}
                onChange={(e) => {
                  setAi({ ...ai, baseUrl: e.target.value });
                  setResult('');
                }}
              />
            </details>
            <Button
              variant="primary"
              disabled={!isConfigured(ai) || busy}
              onClick={async () => {
                setBusy(true);
                setResult('');
                try {
                  const check = await testConnection(ai);
                  setResult(
                    check.ok ? 'Conexión comprobada. Ya puedes usar la IA.' : check.message,
                  );
                } catch {
                  setResult('No pudimos comprobar la conexión. Revisa el servidor y el modelo.');
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Comprobando…' : 'Probar conexión'}
            </Button>
          </>
        )}
        {result && (
          <p className="notice" role="status">
            {result}
          </p>
        )}
      </section>
      <section className="form-sheet">
        <h2>3. Elige en qué te ayudo</h2>
        <div className="row">
          <Link className="btn btn-primary" to={returnTo}>
            Continuar
          </Link>
          <Link className="btn btn-subtle" to="/importar">
            Leer mi currículum
          </Link>
          <Link className="btn btn-subtle" to="/cartas">
            Redactar una carta
          </Link>
        </div>
        <p className="field-hint">
          Configurar la IA no envía tus datos. Cada tarea tiene su propio botón para pedir ayuda.
        </p>
      </section>
    </div>
  );
}
