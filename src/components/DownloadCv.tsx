import { useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import { useApp } from '../state/context';
import { buildCvPdf, cvFilename, saveBlob } from '../lib/pdf';

export function DownloadCv({ share = false }: { share?: boolean }) {
  const { state } = useApp(),
    [message, setMessage] = useState('');
  const run = async () => {
    try {
      const blob = buildCvPdf(state.profile, state.cv),
        name = cvFilename(state.profile);
      const file = new File([blob], name, { type: 'application/pdf' });
      if (share && navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: 'Mi currículum' });
        setMessage('Se abrió la opción de compartir.');
      } else {
        saveBlob(blob, name);
        setMessage(
          share
            ? 'Tu navegador no permite compartir archivos. Busca el PDF en Descargas para adjuntarlo.'
            : 'Busca tu currículum en la carpeta Descargas.',
        );
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      setMessage('No pudimos preparar el archivo. Inténtalo nuevamente.');
    }
  };
  return (
    <div className="download-control">
      <button
        className={'btn ' + (share ? 'btn-subtle' : 'btn-primary')}
        onClick={() => void run()}
      >
        {share ? <Share2 size={18} /> : <Download size={18} />}{' '}
        {share ? 'Compartir mi currículum' : 'Descargar mi currículum'}
      </button>
      {message && <small role="status">{message}</small>}
    </div>
  );
}
