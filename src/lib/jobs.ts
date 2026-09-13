import { z } from 'zod';
import type { Application, CoverLetter } from '../types';
import { uid } from './utils';

export const countries = [
  {
    code: 'CL',
    name: 'Chile',
    aliases: ['chile'],
    region: 'latam',
    cities: ['Santiago', 'Valparaíso', 'Concepción', 'Osorno'],
  },
  {
    code: 'ES',
    name: 'España',
    aliases: ['spain', 'espana'],
    region: 'europe',
    cities: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Málaga', 'Bilbao'],
  },
  {
    code: 'AR',
    name: 'Argentina',
    aliases: ['argentina'],
    region: 'latam',
    cities: ['Buenos Aires', 'Córdoba', 'Rosario'],
  },
  {
    code: 'MX',
    name: 'México',
    aliases: ['mexico'],
    region: 'latam',
    cities: ['Ciudad de México', 'Guadalajara', 'Monterrey'],
  },
  {
    code: 'CO',
    name: 'Colombia',
    aliases: ['colombia'],
    region: 'latam',
    cities: ['Bogotá', 'Medellín', 'Cali'],
  },
  {
    code: 'PE',
    name: 'Perú',
    aliases: ['peru'],
    region: 'latam',
    cities: ['Lima', 'Arequipa', 'Trujillo'],
  },
  {
    code: 'UY',
    name: 'Uruguay',
    aliases: ['uruguay'],
    region: 'latam',
    cities: ['Montevideo', 'Salto'],
  },
  {
    code: 'EC',
    name: 'Ecuador',
    aliases: ['ecuador'],
    region: 'latam',
    cities: ['Quito', 'Guayaquil'],
  },
  {
    code: 'BO',
    name: 'Bolivia',
    aliases: ['bolivia'],
    region: 'latam',
    cities: ['La Paz', 'Santa Cruz'],
  },
  { code: 'PY', name: 'Paraguay', aliases: ['paraguay'], region: 'latam', cities: ['Asunción'] },
  {
    code: 'VE',
    name: 'Venezuela',
    aliases: ['venezuela'],
    region: 'latam',
    cities: ['Caracas', 'Maracaibo'],
  },
  {
    code: 'CR',
    name: 'Costa Rica',
    aliases: ['costa rica'],
    region: 'latam',
    cities: ['San José'],
  },
  {
    code: 'PA',
    name: 'Panamá',
    aliases: ['panama'],
    region: 'latam',
    cities: ['Ciudad de Panamá'],
  },
  {
    code: 'DO',
    name: 'República Dominicana',
    aliases: ['dominican republic', 'republica dominicana'],
    region: 'latam',
    cities: ['Santo Domingo'],
  },
  {
    code: 'BR',
    name: 'Brasil',
    aliases: ['brazil', 'brasil'],
    region: 'latam',
    cities: ['São Paulo', 'Rio de Janeiro'],
  },
  {
    code: 'US',
    name: 'Estados Unidos',
    aliases: ['usa', 'united states', 'us'],
    region: 'north',
    cities: ['New York', 'Miami', 'Los Angeles'],
  },
  {
    code: 'CA',
    name: 'Canadá',
    aliases: ['canada'],
    region: 'north',
    cities: ['Toronto', 'Montréal', 'Vancouver'],
  },
  {
    code: 'GB',
    name: 'Reino Unido',
    aliases: ['uk', 'united kingdom'],
    region: 'europe',
    cities: ['London', 'Manchester'],
  },
  {
    code: 'DE',
    name: 'Alemania',
    aliases: ['germany', 'deutschland'],
    region: 'europe',
    cities: ['Berlin', 'Hamburg', 'Munich'],
  },
  { code: 'FR', name: 'Francia', aliases: ['france'], region: 'europe', cities: ['Paris', 'Lyon'] },
  {
    code: 'PT',
    name: 'Portugal',
    aliases: ['portugal'],
    region: 'europe',
    cities: ['Lisboa', 'Porto'],
  },
  {
    code: 'IT',
    name: 'Italia',
    aliases: ['italy', 'italia'],
    region: 'europe',
    cities: ['Roma', 'Milano'],
  },
  {
    code: 'AU',
    name: 'Australia',
    aliases: ['australia'],
    region: 'apac',
    cities: ['Sydney', 'Melbourne'],
  },
  {
    code: 'NZ',
    name: 'Nueva Zelanda',
    aliases: ['new zealand'],
    region: 'apac',
    cities: ['Auckland', 'Wellington'],
  },
  {
    code: 'IN',
    name: 'India',
    aliases: ['india'],
    region: 'apac',
    cities: ['Mumbai', 'Bengaluru'],
  },
];
export const fold = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
export function countryCode(name: string) {
  return countries.find((c) => fold(c.name) === fold(name) || c.code === name)?.code || 'CL';
}
const jobSchema = z.object({
  id: z.string(),
  source: z.enum(['Remotive', 'Jobicy']),
  url: z.string().url(),
  title: z.string(),
  company: z.string(),
  location: z.string(),
  type: z.string(),
  salary: z.string(),
  description: z.string(),
  publishedAt: z.string(),
});
export type JobOffer = z.infer<typeof jobSchema>;
const feedSchema = z.object({
  jobs: z.array(jobSchema),
  sources: z.array(
    z.object({ name: z.string(), fetchedAt: z.string(), status: z.enum(['ok', 'stale', 'error']) }),
  ),
});
export type JobFeed = z.infer<typeof feedSchema>;
export function plainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,iframe,object,svg,img,link').forEach((e) => e.remove());
  doc.querySelectorAll('br,p,div,li,h1,h2,h3,h4').forEach((e) => {
    e.append(doc.createTextNode('\n'));
  });
  return (doc.body.textContent || '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}
export async function fetchOffers(signal?: AbortSignal): Promise<JobFeed> {
  const response = await fetch(import.meta.env.BASE_URL + 'api/jobs', { signal });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json'))
    throw Error(
      'No pudimos cargar las ofertas. Abre Impulso con el acceso local y comprueba tu conexión a internet.',
    );
  const feed = feedSchema.parse(await response.json());
  return {
    ...feed,
    jobs: feed.jobs
      .filter((j) => {
        const u = new URL(j.url);
        return (
          u.protocol === 'https:' &&
          u.hostname === (j.source === 'Remotive' ? 'remotive.com' : 'jobicy.com')
        );
      })
      .map((j) => ({
        ...j,
        title: plainText(j.title),
        company: plainText(j.company),
        description: plainText(j.description),
      })),
  };
}
export function locationMatch(location: string, code: string): boolean {
  if (!code || code === '*') return true;
  const value = fold(location),
    c = countries.find((c) => c.code === code);
  if (!c || /except|excluding|outside|excluye|excepto/.test(value)) return false;
  if (/^(worldwide|anywhere|global|worldwide remote|anywhere in the world)$/.test(value))
    return true;
  const tokens = value.split(/[,;|/()]+/).map((s) => s.trim());
  if (tokens.some((t) => [...c.aliases, fold(c.name)].includes(t))) return true;
  return tokens.some((t) =>
    c.region === 'europe'
      ? ['europe', 'emea'].includes(t)
      : c.region === 'latam'
        ? ['latam', 'latin america', 'south america'].includes(t) &&
          (t !== 'south america' || !['MX', 'CR', 'PA', 'DO'].includes(code))
        : c.region === 'apac'
          ? ['apac', 'asia pacific'].includes(t)
          : t === 'north america',
  );
}
export function filterOffers(
  jobs: JobOffer[],
  query: { role: string; country: string; schedule: string },
) {
  const words = fold(query.role).split(/\s+/).filter(Boolean);
  return jobs
    .filter((j) => {
      const content = fold([j.title, j.company, j.description].join(' '));
      const type = fold(j.type).replace(/[_-]/g, ' ');
      return (
        words.every((w) => content.includes(w)) &&
        locationMatch(j.location, query.country) &&
        (!query.schedule ||
          (query.schedule === 'Jornada completa'
            ? type.includes('full time')
            : query.schedule === 'Media jornada'
              ? type.includes('part time')
              : true))
      );
    })
    .sort((a, b) => (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0));
}
export function offerApplication(j: JobOffer): Application {
  const now = new Date().toISOString();
  return {
    id: uid('app'),
    company: j.company,
    role: j.title,
    location: 'Remoto · ' + (j.location || 'Ubicación por confirmar'),
    url: j.url,
    source: j.source,
    salary: j.salary,
    status: 'guardada',
    appliedAt: '',
    nextStep: 'Revisar requisitos y preparar mi envío',
    nextStepDate: '',
    contact: '',
    notes: '',
    jobDescription: j.description,
    createdAt: now,
    updatedAt: now,
  };
}
export function newLetter(role: string, application?: Application): CoverLetter {
  const now = new Date().toISOString();
  return {
    motivation: '',
    tone: 'directo',
    id: uid('letter'),
    title: application ? application.role + ' · ' + application.company : 'Mi carta',
    company: application?.company || '',
    role: application?.role || role,
    recipient: '',
    body: '',
    jobDescription: application?.jobDescription || '',
    applicationId: application?.id || null,
    createdAt: now,
    updatedAt: now,
  };
}
export function portalSearches(role: string, city: string, code: string, schedule: string) {
  const country = countries.find((c) => c.code === code)?.name || '';
  const query = [role, city, country, schedule, 'empleo'].filter(Boolean).join(' ');
  const portals = [
    { name: 'Google', domain: '' },
    { name: 'LinkedIn', domain: 'linkedin.com/jobs' },
    { name: 'Indeed', domain: 'indeed.com' },
  ];
  if (code === 'ES') portals.push({ name: 'InfoJobs', domain: 'infojobs.net' });
  if (code === 'CL') portals.push({ name: 'Chiletrabajos', domain: 'chiletrabajos.cl' });
  return portals.map((p) => ({
    name: p.name,
    url:
      'https://www.google.com/search?q=' +
      encodeURIComponent((p.domain ? 'site:' + p.domain + ' ' : '') + query),
  }));
}
