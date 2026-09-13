import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Download,
  Upload,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  HardDrive,
  CircleHelp,
} from 'lucide-react';
import { useApp } from '../state/context';
import type { AppState } from '../types';
import { parseBackup, RECOVERY_KEY, STORAGE_KEY } from '../lib/storage';
import { download } from '../lib/utils';
import { localDate } from '../lib/journey';
import { Button, ConfirmButton } from '../components/ui';

export function Settings() {
  const { state, replaceAll, saveError, undo, undoAvailable, clearAll, retrySave } = useApp();
  const file = useRef<HTMLInputElement>(null),
    [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [preview, setPreview] = useState<AppState | null>(null);
  const read = async (f: File) => {
    try {
      if (f.size > 15 * 1024 * 1024) throw new Error();
      setPreview(parseBackup(await f.text()));
      setError('');
    } catch {
      setError(
        'No reconocimos esa copia. Elige el archivo de Impulso que descargaste antes. Tus datos actuales siguen intactos.',
      );
    }
    if (file.current) file.current.value = '';
  };
  const recovery = () => {
    try {
      const raw = localStorage.getItem(RECOVERY_KEY);
      if (!raw) {
        setMessage('Todavía no hay una versión anterior. Se crea antes de reemplazar tus datos.');
        return;
      }
      setPreview(parseBackup(raw));
    } catch {
      setError('No pudimos abrir la versión anterior. Prueba con una copia descargada.');
    }
  };
  return (
    <>
      <Link className="text-link" to="/">
        <ArrowLeft size={17} />
        Volver al inicio
      </Link>
      <div className="page-head">
        <div>
          <span className="eyebrow">Aquí te ayudamos</span>
          <h1>Ayuda y mis datos</h1>
          <p>Tu información es tuya. Puedes guardarla, recuperarla o borrarla.</p>
        </div>
        <span className="page-icon yellow">
          <CircleHelp size={27} />
        </span>
      </div>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <section className="data-banner">
        <HardDrive size={32} />
        <div>
          <h2>Guardado en este navegador</h2>
          <p>
            Si cambias de equipo o borras los datos del navegador, tu información no aparecerá
            automáticamente. Descarga una copia para llevarla contigo.
          </p>
        </div>
      </section>
      {saveError && (
        <div className="notice">
          <p>{saveError}</p>
          <Button onClick={retrySave}>Intentar guardar de nuevo</Button>
          <Button
            onClick={() => {
              try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw) download('Impulso-datos-originales.json', raw);
                else setMessage('No hay datos anteriores guardados.');
              } catch {
                setError('No se puede acceder al almacenamiento del navegador.');
              }
            }}
          >
            Descargar los datos originales
          </Button>
        </div>
      )}
      <div className="grid-2">
        <section className="card">
          <div className="card-body">
            <span className="icon-tile mint">
              <Download size={24} />
            </span>
            <h2>Guardar una copia</h2>
            <p>
              Incluye tus datos, postulaciones y respuestas. Guárdala en una carpeta que recuerdes o
              en un dispositivo tuyo.
            </p>
            <Button
              variant="primary"
              onClick={() => {
                download(
                  'Impulso-mi-copia-' + localDate() + '.json',
                  JSON.stringify(state, null, 2),
                );
                setMessage(
                  'Busca «Impulso-mi-copia» en Descargas. Contiene tus datos personales: guárdalo en un lugar tuyo.',
                );
              }}
            >
              <Download size={18} />
              Descargar mi copia
            </Button>
            <p className="field-hint">Las claves del asistente no se incluyen.</p>
          </div>
        </section>
        <section className="card">
          <div className="card-body">
            <span className="icon-tile peach">
              <Upload size={24} />
            </span>
            <h2>Recuperar una copia</h2>
            <p>Elige una copia que hayas descargado antes. Primero te mostraremos qué contiene.</p>
            <input
              hidden
              ref={file}
              type="file"
              accept=".json,.impulso"
              aria-label="Elegir copia de Impulso"
              onChange={(e) => {
                if (e.target.files?.[0]) void read(e.target.files[0]);
              }}
            />
            <Button onClick={() => file.current?.click()}>
              <Upload size={18} />
              Elegir mi copia
            </Button>
            <Button variant="ghost" onClick={recovery}>
              Ver versión anterior de este navegador
            </Button>
          </div>
        </section>
      </div>
      {preview && (
        <section className="confirm-send" role="region" aria-label="Revisar copia">
          <h2>Esta copia contiene</h2>
          <p>
            <strong>{preview.profile.personal.fullName || 'Un perfil sin nombre'}</strong> ·{' '}
            {preview.applications.length} postulaciones · {preview.letters.length} cartas.
          </p>
          <p>
            Al usarla se reemplazará la información actual. Guardaremos una versión anterior en este
            navegador si hay espacio.
          </p>
          <div className="row">
            <Button
              variant="primary"
              onClick={() => {
                replaceAll(preview);
                setPreview(null);
                setMessage('Copia restaurada. Revisa tus datos antes de continuar.');
              }}
            >
              Usar esta copia
            </Button>
            <Button onClick={() => setPreview(null)}>Cancelar</Button>
          </div>
        </section>
      )}
      {undoAvailable && (
        <p className="notice">
          Puedes recuperar los datos que tenías antes del último reemplazo.{' '}
          <Button
            onClick={() => {
              undo();
              setMessage('Se recuperaron los datos anteriores.');
            }}
          >
            Deshacer reemplazo
          </Button>
        </p>
      )}
      <section className="help-faq">
        <h2>Preguntas frecuentes</h2>
        <details>
          <summary>¿Necesito una cuenta o saber de computación?</summary>
          <p>
            No necesitas una cuenta. En «Mi currículum», elige la guía paso a paso y responde con
            tus palabras. Puedes detenerte y continuar desde este mismo navegador.
          </p>
          <Link className="text-link" to="/empezar">
            Empezar la guía
            <ArrowRight size={17} />
          </Link>
        </details>
        <details>
          <summary>¿Cómo mando mi currículum?</summary>
          <p>
            Descárgalo desde «Mi currículum». En «Mis postulaciones», abre un aviso para ver los
            pasos de envío. Si postulas por correo, adjunta el PDF desde Descargas.
          </p>
        </details>
        <details>
          <summary>¿Por qué no veo mis datos en otro equipo?</summary>
          <p>
            Esta versión funciona de forma local. Descarga una copia aquí, llévala al otro equipo y
            elige «Recuperar una copia». No hay sincronización ni cuenta online.
          </p>
        </details>
        <details>
          <summary>¿Quién puede ver mi información?</summary>
          <p>
            El currículum se prepara en este navegador. Tú eliges cuándo compartir el archivo. Si
            usas el asistente externo opcional, el texto de esa tarea se envía al servicio
            configurado. Buscar trabajos abre páginas externas.
          </p>
          <p>
            En un computador compartido, otra persona que use el mismo navegador podría ver tus
            datos. Guarda una copia propia y bórralos al terminar.
          </p>
        </details>
        <details>
          <summary>¿Me llegará un aviso de mis recordatorios?</summary>
          <p>
            Impulso muestra tus pendientes cuando abres la app. Para recibir avisos fuera de la app,
            abre una postulación y usa «Añadir a mi calendario». Configura el aviso en tu
            calendario.
          </p>
        </details>
      </section>
      <aside className="gentle-note">
        <ShieldCheck size={24} />
        <p>
          <strong>La ayuda básica ya está disponible.</strong> Crear y descargar un currículum,
          preparar mensajes y guardar postulaciones funciona sin configurar inteligencia artificial.
        </p>
      </aside>
      <Link to="/asistente" className="text-link">
        Configurar IA para currículums y cartas
        <ArrowRight size={16} />
      </Link>
      <details className="danger-zone">
        <summary>Borrar mis datos de este navegador</summary>
        <p>
          Se borrarán tu perfil, postulaciones, copias internas y configuración del asistente.
          Descarga una copia antes si quieres conservarlos. Los archivos que ya descargaste no se
          borran.
        </p>
        <ConfirmButton
          confirmLabel="Sí, borrar todos mis datos locales"
          onConfirm={() => {
            clearAll();
            setPreview(null);
            setMessage(
              'Se solicitó borrar los datos locales. Revisa si aparece algún error de guardado.',
            );
          }}
        >
          Borrar mis datos
        </ConfirmButton>
      </details>
    </>
  );
}
