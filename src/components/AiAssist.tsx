import { Link, useLocation } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useApp } from '../state/context';
import { isConfigured, isLocalEndpoint, presetById } from '../lib/ai/settings';
import type { ReactNode } from 'react';
export function AiAssist({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  const { ai } = useApp(),
    location = useLocation();
  const configured = isConfigured(ai),
    local = isLocalEndpoint(ai);
  return (
    <section className="ai-assist mint" aria-label="Ayuda con inteligencia artificial">
      <div className="row">
        <Sparkles size={23} />
        <span className="eyebrow">Inteligencia artificial</span>
        <span className="pill">
          {configured
            ? local
              ? 'IA local configurada'
              : 'Servicio externo configurado'
            : 'IA por activar'}
        </span>
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {configured ? (
        <>
          <p className="field-hint">
            {local
              ? 'El texto de esta tarea se procesa en el servidor de tu equipo.'
              : 'Al pedir ayuda, el texto de esta tarea se enviará a ' +
                (presetById(ai.preset)?.name || 'tu servicio') +
                '.'}{' '}
            Modelo: {ai.model}. La IA puede equivocarse; tú revisas el resultado.
          </p>
          {children}
          <Link
            className="text-link"
            to={'/asistente?volver=' + encodeURIComponent(location.pathname + location.search)}
          >
            Cambiar mi IA
          </Link>
        </>
      ) : (
        <>
          <Link
            className="btn btn-primary"
            to={'/asistente?volver=' + encodeURIComponent(location.pathname + location.search)}
          >
            Activar IA en mi equipo
            <ArrowRight size={18} />
          </Link>
          <p className="field-hint">
            Puedes conectar Ollama o LM Studio sin una clave de pago. Necesitas tener un modelo
            instalado.
          </p>
        </>
      )}
    </section>
  );
}
