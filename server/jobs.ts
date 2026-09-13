import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin, Connect } from 'vite';
import { z } from 'zod';

const providers = [
  { name: 'Remotive', url: 'https://remotive.com/api/remote-jobs?limit=500', host: 'remotive.com' },
  { name: 'Jobicy', url: 'https://jobicy.com/api/v2/remote-jobs?count=200', host: 'jobicy.com' },
];
const jobSchema = z.object({
  id: z.string(),
  source: z.string(),
  url: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string(),
  type: z.string(),
  salary: z.string(),
  description: z.string(),
  publishedAt: z.string(),
});
type Job = z.infer<typeof jobSchema>;
const cacheSchema = z.object({
  checkedAt: z.number(),
  fetchedAt: z.number(),
  failed: z.boolean(),
  jobs: z.array(jobSchema),
});
type Cache = z.infer<typeof cacheSchema>;
const cachePath = resolve('.cache/jobs-v1.json');
const cache = new Map<string, Cache>();
const pending = new Map<string, Promise<Cache>>();
let loaded: Promise<void> | undefined;
let writes: Promise<void> = Promise.resolve();
const str = (v: unknown) => (typeof v === 'string' ? v.slice(0, 80000) : '');

function normalize(raw: unknown, provider: (typeof providers)[number]): Job[] {
  const envelope = z.object({ jobs: z.array(z.record(z.string(), z.unknown())) }).parse(raw);
  return envelope.jobs.slice(0, 500).flatMap((j) => {
    const remotive = provider.name === 'Remotive';
    const url = str(j.url);
    try {
      const u = new URL(url);
      if (u.protocol !== 'https:' || u.hostname !== provider.host) return [];
    } catch {
      return [];
    }
    const title = str(remotive ? j.title : j.jobTitle);
    if (!title || !['string', 'number'].includes(typeof j.id)) return [];
    return [
      {
        id: provider.name + ':' + String(j.id),
        source: provider.name,
        url,
        title,
        company: str(remotive ? j.company_name : j.companyName),
        location: str(remotive ? j.candidate_required_location : j.jobGeo),
        type: remotive
          ? str(j.job_type)
          : Array.isArray(j.jobType)
            ? j.jobType.map(str).join(', ')
            : '',
        salary: remotive
          ? str(j.salary)
          : j.salaryMin
            ? [
                j.salaryMin,
                j.salaryMax ? '– ' + j.salaryMax : '',
                str(j.salaryCurrency),
                str(j.salaryPeriod),
              ]
                .filter(Boolean)
                .join(' ')
            : '',
        description: str(remotive ? j.description : j.jobDescription),
        publishedAt: str(remotive ? j.publication_date : j.pubDate),
      },
    ];
  });
}
async function loadCache() {
  loaded ??= (async () => {
    try {
      const raw = JSON.parse(await readFile(cachePath, 'utf8'));
      for (const p of providers) {
        const parsed = cacheSchema.safeParse(raw[p.name]);
        if (parsed.success) cache.set(p.name, parsed.data);
      }
    } catch {
      /* The cache is optional; no user data lives here. */
    }
  })();
  await loaded;
}
async function getProvider(p: (typeof providers)[number]): Promise<Cache> {
  await loadCache();
  const old = cache.get(p.name),
    now = Date.now();
  if (old && now - old.checkedAt < (old.failed ? 15 * 60 * 1000 : 6 * 60 * 60 * 1000)) return old;
  const existing = pending.get(p.name);
  if (existing) return existing;
  const request = (async () => {
    let entry: Cache;
    try {
      const response = await fetch(p.url, {
        signal: AbortSignal.timeout(18000),
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw Error('Source unavailable');
      const body = await response.text();
      if (body.length > 15_000_000) throw Error('Response too large');
      entry = {
        checkedAt: now,
        fetchedAt: now,
        failed: false,
        jobs: normalize(JSON.parse(body), p),
      };
    } catch {
      entry = {
        checkedAt: now,
        fetchedAt: old?.fetchedAt || 0,
        failed: true,
        jobs: old && now - old.fetchedAt < 48 * 60 * 60 * 1000 ? old.jobs : [],
      };
    }
    cache.set(p.name, entry);
    const snapshot = JSON.stringify(Object.fromEntries(cache));
    writes = writes
      .then(async () => {
        await mkdir(resolve('.cache'), { recursive: true });
        await writeFile(cachePath + '.tmp', snapshot);
        await rename(cachePath + '.tmp', cachePath);
      })
      .catch(() => {
        /* In-memory caching still works on a read-only checkout. */
      });
    await writes;
    return entry;
  })();
  pending.set(p.name, request);
  try {
    return await request;
  } finally {
    pending.delete(p.name);
  }
}
const handler: Connect.NextHandleFunction = async (req, res, next) => {
  if (req.url?.split('?')[0] !== '/api/jobs') return next();
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end();
    return;
  }
  // Fixed upstreams only: no arbitrary URL fetching and no personal profile in requests.
  const results = await Promise.all(providers.map(getProvider));
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(
    JSON.stringify({
      jobs: results.flatMap((r) => r.jobs),
      sources: results.map((r, i) => ({
        name: providers[i].name,
        fetchedAt: r.fetchedAt ? new Date(r.fetchedAt).toISOString() : '',
        status: r.failed ? (r.jobs.length ? 'stale' : 'error') : 'ok',
      })),
    }),
  );
};
export function localJobs(): Plugin {
  return {
    name: 'impulso-local-jobs',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}
