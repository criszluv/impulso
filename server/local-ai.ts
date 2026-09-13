import type { Plugin, Connect } from 'vite';

const handler: Connect.NextHandleFunction = async (req, res, next) => {
  const route = req.url?.match(
    /^\/api\/local-ai\/(ollama|lmstudio)\/v1\/(models|chat\/completions)$/,
  );
  if (!route) return next();
  const engine = route[1],
    path = route[2],
    method = path === 'models' ? 'GET' : 'POST';
  if (req.method !== method) {
    res.statusCode = 405;
    res.end();
    return;
  }
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) throw Error();
    } catch {
      res.statusCode = 403;
      res.end();
      return;
    }
  }
  try {
    let body = '';
    if (method === 'POST') {
      if (!req.headers['content-type']?.startsWith('application/json')) {
        res.statusCode = 415;
        res.end();
        return;
      }
      for await (const chunk of req) {
        body += chunk.toString();
        if (body.length > 2_000_000) {
          res.statusCode = 413;
          res.end();
          return;
        }
      }
      const parsed = JSON.parse(body);
      if (parsed.stream === true) throw Error('Streaming unavailable');
    }
    const upstream = await fetch(
      'http://127.0.0.1:' + (engine === 'ollama' ? '11434' : '1234') + '/v1/' + path,
      {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'POST' ? body : undefined,
        signal: AbortSignal.timeout(method === 'GET' ? 5000 : 175000),
      },
    );
    res.statusCode = upstream.status;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(await upstream.text());
  } catch {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: {
          message:
            'No pudimos conectar con el modelo local o tardó demasiado. Abre el servidor, carga un modelo y vuelve a intentar.',
        },
      }),
    );
  }
};
export function localAi(): Plugin {
  return {
    name: 'impulso-local-ai',
    configureServer(s) {
      s.middlewares.use(handler);
    },
    configurePreviewServer(s) {
      s.middlewares.use(handler);
    },
  };
}
