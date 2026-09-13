import { useEffect, useRef, useState } from 'react';

export function PdfPreview({ blob }: { blob: Blob }) {
  const root = useRef<HTMLDivElement>(null),
    [error, setError] = useState(''),
    [total, setTotal] = useState(0),
    [all, setAll] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    const render = async () => {
      setError('');
      try {
        const pdfjs = await import('pdfjs-dist'),
          worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const task = pdfjs.getDocument({ data: await blob.arrayBuffer() });
        cleanup = () => {
          void task.destroy();
        };
        const doc = await task.promise;
        if (cancelled) return;
        setTotal(doc.numPages);
        root.current?.replaceChildren();
        for (let i = 1; i <= Math.min(doc.numPages, all ? doc.numPages : 2); i++) {
          const page = await doc.getPage(i);
          if (cancelled) return;
          const viewport = page.getViewport({ scale: 1.3 }),
            canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.setAttribute('aria-label', 'Página ' + i + ' de tu currículum');
          canvas.setAttribute('role', 'img');
          await page.render({ canvas, viewport }).promise;
          if (!cancelled) root.current?.append(canvas);
        }
      } catch {
        if (!cancelled)
          setError(
            'La vista previa no pudo cargarse. Puedes descargar el currículum y abrirlo en tu equipo.',
          );
      }
    };
    void render();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [blob, all]);
  return (
    <>
      <div className="pdf-preview" ref={root} />
      {error && <p role="alert">{error}</p>}
      {total > 2 && !all && (
        <button className="btn" onClick={() => setAll(true)}>
          Ver las {total} páginas
        </button>
      )}
      <span className="field-hint">
        {total > 0 ? total + ' ' + (total === 1 ? 'página' : 'páginas') + ' · ' : ''}La descarga
        contiene el documento completo.
      </span>
    </>
  );
}
