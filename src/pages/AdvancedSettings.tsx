import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../state/context';
import { AI_PRESETS, presetById, isConfigured } from '../lib/ai/settings';
import { testConnection } from '../lib/ai/client';
import { Button, TextInput, Select, Toggle } from '../components/ui';

export function AdvancedSettings() {
  const { ai, setAi } = useApp(),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState('');
  const preset = presetById(ai.preset);
  const local = !!preset && ['ollama', 'lmstudio'].includes(preset.id);
  return (
    <div className="narrow-page">
      <Link className="text-link" to="/ajustes">
        <ArrowLeft size={17} />
        Volver a ayuda
      </Link>
      <div className="page-head">
        <div>
          <span className="eyebrow">Opcional · Configuración avanzada</span>
          <h1>Asistente de redacción</h1>
          <p>
            El recorrido principal funciona sin esta configuración. Consérvala para conectar un
            servicio que ya utilices.
          </p>
        </div>
      </div>
      <section className="form-sheet">
        <Select
          label="Servicio"
          value={ai.preset}
          onChange={(e) => {
            const p = presetById(e.target.value);
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
          }}
        >
          <option value="">Desactivado</option>
          {AI_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        {preset && (
          <>
            <p className="notice">
              {local
                ? 'El asistente se conecta al servidor que configures. Comprueba que sea un servidor de tu propio equipo si quieres mantener el texto local.'
                : 'Cuando lo uses, el texto de esa tarea se enviará a ' +
                  preset.name +
                  '. Puede tener costos y límites según tu cuenta. Tu clave se guarda en este navegador; no la guardes en un equipo compartido.'}
            </p>
            {preset.needsKey && (
              <TextInput
                label="Clave del servicio"
                type="password"
                autoComplete="off"
                value={ai.apiKey}
                onChange={(e) => setAi({ ...ai, apiKey: e.target.value })}
              />
            )}
            <TextInput
              label="Modelo"
              value={ai.model}
              onChange={(e) => setAi({ ...ai, model: e.target.value })}
            />
            <TextInput
              label="Dirección del servidor"
              value={ai.baseUrl}
              onChange={(e) => setAi({ ...ai, baseUrl: e.target.value })}
            />
            <Toggle
              label="Permitir lectura de enlaces mediante Jina (servicio externo)"
              checked={ai.reader === 'jina'}
              onChange={(v) => setAi({ ...ai, reader: v ? 'jina' : 'ninguno' })}
            />
            <p className="field-hint">
              Activar ese lector permite enviarle el enlace del aviso. No todos los portales
              permiten leer su contenido.
            </p>
            <Button
              disabled={!isConfigured(ai) || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await testConnection(ai);
                  setResult('Conexión disponible.');
                } catch {
                  setResult(
                    'No pudimos conectar. Revisa el servicio, la clave y el modelo. La ayuda local sigue disponible.',
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Comprobando…' : 'Probar conexión'}
            </Button>
          </>
        )}
        {result && <p role="status">{result}</p>}
      </section>
    </div>
  );
}
