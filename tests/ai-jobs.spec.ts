import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { demoState, initialState } from '../src/lib/defaults';
import { locationMatch } from '../src/lib/jobs';
import { coerceCv } from '../src/lib/ai/coerce';

const model = {
  preset: 'ollama',
  provider: 'openai-compat',
  baseUrl: 'http://localhost:11434/v1',
  model: 'modelo-prueba',
  apiKey: '',
  reader: 'ninguno',
};
async function setup(page: Page, ai = false) {
  await page.addInitScript(
    ({ state, model, ai }) => {
      if (!localStorage.getItem('impulso.state.v1'))
        localStorage.setItem('impulso.state.v1', JSON.stringify(state));
      if (ai) localStorage.setItem('impulso.ai.v1', JSON.stringify(model));
    },
    { state: demoState(), model, ai },
  );
}
const base = {
  id: 'Jobicy:1',
  source: 'Jobicy',
  url: 'https://jobicy.com/jobs/1',
  title: 'Customer Support',
  company: 'Empresa de prueba',
  location: 'Spain',
  type: 'full-time',
  salary: '',
  description:
    '<h2>Atención al cliente</h2><p>Responder consultas en español.</p><img src="https://example.com/track" onerror="alert(1)"><script>alert(1)</script>',
  publishedAt: '2026-09-10T12:00:00Z',
};
const feed = {
  jobs: [
    base,
    {
      ...base,
      id: 'Jobicy:2',
      url: 'https://jobicy.com/jobs/2',
      title: 'USA only role',
      location: 'USA',
    },
    {
      ...base,
      id: 'Jobicy:3',
      url: 'https://jobicy.com/jobs/3',
      title: 'Global support',
      location: 'Anywhere',
    },
    { ...base, id: 'Jobicy:4', url: 'javascript:alert(1)', title: 'Unsafe link' },
  ],
  sources: [
    { name: 'Jobicy', status: 'ok', fetchedAt: '2026-09-13T10:00:00Z' },
    { name: 'Remotive', status: 'error', fetchedAt: '' },
  ],
};
test('ubicaciones conservadoras y no inventar vigencia ni meses', () => {
  expect(locationMatch('Spain', 'ES')).toBe(true);
  expect(locationMatch('Europe', 'ES')).toBe(true);
  expect(locationMatch('Worldwide', 'CL')).toBe(true);
  expect(locationMatch('USA', 'ES')).toBe(false);
  expect(locationMatch('Worldwide except Spain', 'ES')).toBe(false);
  expect(locationMatch('', 'ES')).toBe(false);
  expect(locationMatch('South America', 'MX')).toBe(false);
  const result = coerceCv({
    experience: [
      { role: 'Cajera', company: 'Tienda', startDate: '2020', endDate: '', current: false },
    ],
  });
  expect(result.experience[0].current).toBe(false);
  expect(result.experience[0].startDate).toBe('');
});
test('país, ofertas dentro de la app, atribución, guardado y carta con contexto', async ({
  page,
}) => {
  await setup(page);
  await page.route('**/api/jobs', (r) => r.fulfill({ json: feed }));
  await page.goto('/#/buscar');
  await page.getByLabel('¿Qué trabajo buscas?').fill('');
  await page.getByLabel('País donde quieres trabajar').selectOption('ES');
  await expect(page.getByLabel('Ciudad (opcional)')).toHaveValue('');
  await page.getByLabel('Ciudad (opcional)').fill('Madrid');
  const href = await page.getByRole('link', { name: 'Buscar en InfoJobs' }).getAttribute('href');
  expect(decodeURIComponent(href!)).toContain('Madrid España');
  await page.getByRole('button', { name: 'Ver ofertas en Impulso' }).click();
  await expect(page.getByRole('heading', { name: 'Customer Support', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'USA only role' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Unsafe link' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Leer oferta aquí' }).first().click();
  await expect(page.locator('.job-description')).toContainText('Responder consultas en español.');
  await expect(page.locator('.job-description img,.job-description script')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Jobicy', exact: true })).toHaveAttribute(
    'href',
    base.url,
  );
  await page.getByRole('button', { name: 'Guardar esta oferta', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Oferta guardada', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Preparar carta para esta oferta' }).click();
  await expect(page.getByLabel('Empresa (opcional)')).toHaveValue('Empresa de prueba');
  await expect(page.getByLabel('Trabajo al que postulas (opcional)')).toHaveValue(
    'Customer Support',
  );
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem('impulso.state.v1')!));
  expect(data.applications.filter((a: { url: string }) => a.url === base.url)).toHaveLength(1);
  expect(data.applications.find((a: { url: string }) => a.url === base.url).status).toBe(
    'guardada',
  );
  expect(data.letters[0].jobDescription).toContain('Responder consultas');
  expect(data.preferences.country).toBe('ES');
  await page.reload();
  await expect(page.getByLabel('Empresa (opcional)')).toHaveValue('Empresa de prueba');
});
test('IA visible, lectura optativa, correcciones antes de guardar y recuperación del error', async ({
  page,
}) => {
  await setup(page, true);
  let requests = 0;
  await page.route('**/api/local-ai/ollama/v1/chat/completions', (r) => {
    requests++;
    return r.fulfill({
      json: {
        choices: [
          {
            message: {
              content: JSON.stringify({
                fullName: 'Ana Pérez',
                headline: 'Cajera',
                email: 'ana@example.com',
                phone: '+34 600 000 000',
                experience: [
                  {
                    role: 'Cajera',
                    company: 'Mercado',
                    startDate: '2021-03',
                    endDate: '',
                    current: false,
                    bullets: ['Atención de público'],
                    tech: [],
                  },
                ],
                warnings: ['Revisa la fecha de término.'],
              }),
            },
          },
        ],
      },
    });
  });
  await page.goto('/#/importar');
  await expect(page.getByLabel('Usar IA para leer mi currículum')).toBeVisible();
  await expect(page.getByLabel('Usar IA para leer mi currículum')).not.toBeChecked();
  await page.getByLabel('Usar IA para leer mi currículum').check();
  await page.getByText('Prefiero copiar y pegar el texto', { exact: true }).click();
  await page
    .getByLabel('El contenido de mi currículum')
    .fill('Ana Pérez, cajera de Mercado, atención de público. ana@example.com');
  await page.getByRole('button', { name: 'Leer este texto' }).click();
  await expect(page.getByText('Lectura con IA', { exact: true })).toBeVisible();
  expect(requests).toBe(1);
  await page.getByText('Corregir los datos detectados antes de guardar', { exact: true }).click();
  await page.getByLabel('Empresa del trabajo 1').fill('Mercado Central');
  await expect(page.getByLabel('Sigo en el trabajo 1')).not.toBeChecked();
  await page.getByLabel('¿Qué hacer con los datos que ya tienes?').selectOption('reemplazar');
  await page.getByRole('button', { name: 'Guardar y revisar mis datos' }).click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('impulso.state.v1')!).profile.experience[0].company,
    ),
  ).toBe('Mercado Central');
  await page.goto('/#/importar');
  await page.unroute('**/api/local-ai/ollama/v1/chat/completions');
  await page.route('**/api/local-ai/ollama/v1/chat/completions', (r) =>
    r.fulfill({ status: 502, json: { error: { message: 'Servidor apagado' } } }),
  );
  await page.getByLabel('Usar IA para leer mi currículum').check();
  await page.getByText('Prefiero copiar y pegar el texto', { exact: true }).click();
  await page.getByLabel('El contenido de mi currículum').fill('Ana Pérez\nana@example.com\nCajera');
  await page.getByRole('button', { name: 'Leer este texto' }).click();
  await expect(page.getByRole('alert')).toContainText('Servidor apagado');
  await page.getByRole('button', { name: 'Usar lectura básica con el mismo texto' }).click();
  await expect(page.getByText('Lectura básica sin IA', { exact: true })).toBeVisible();
});
test('activar IA descubre modelos y no anuncia conexión exitosa cuando falla', async ({ page }) => {
  await page.route('**/api/local-ai/ollama/v1/models', (r) =>
    r.fulfill({ json: { data: [{ id: 'mi-modelo-local' }] } }),
  );
  await page.route('**/api/local-ai/ollama/v1/chat/completions', (r) =>
    r.fulfill({ status: 502, json: { error: { message: 'Modelo apagado' } } }),
  );
  await page.goto('/#/importar');
  await page.getByRole('link', { name: 'Activar IA en mi equipo' }).click();
  await page.getByRole('button', { name: 'Usar Ollama en mi equipo' }).click();
  await page.getByRole('button', { name: 'Buscar modelos en mi equipo' }).click();
  await expect(page.getByLabel('Modelo', { exact: true })).toHaveValue('mi-modelo-local');
  await page.getByRole('button', { name: 'Probar conexión' }).click();
  await expect(page.getByText(/Modelo apagado/)).toBeVisible();
  await expect(page.getByText('Conexión comprobada. Ya puedes usar la IA.')).toHaveCount(0);
  await page.getByRole('link', { name: 'Continuar', exact: true }).click();
  await expect(page.getByLabel('Usar IA para leer mi currículum')).toBeVisible();
});
test('carta independiente con IA recibe perfil, motivación y aviso sin salir', async ({ page }) => {
  await setup(page, true);
  const sent: string[] = [];
  await page.route('**/api/local-ai/ollama/v1/chat/completions', (r) => {
    sent.push(r.request().postData()!);
    return r.fulfill({
      json: {
        choices: [
          {
            message: {
              content: JSON.stringify({
                body: 'Hola:\n\nMe interesa el puesto de soporte. Mi experiencia incluye atención de consultas y organización de tareas.\n\nMe atrae ayudar a las personas a resolver sus dudas y aprender del equipo.\n\nQuedo disponible para conversar sobre el trabajo.\n\nCamila Soto',
                gaps: [],
              }),
            },
          },
        ],
      },
    });
  });
  await page.goto('/#/cartas');
  await page.getByRole('button', { name: 'Preparar mi primera carta' }).click();
  await page.getByLabel('Trabajo al que postulas (opcional)').fill('Soporte');
  await page.getByLabel('¿Por qué te interesa? (opcional)').fill('Ayudar a personas');
  await page.getByLabel('Tono de la carta con IA').selectOption('breve');
  await page.getByText('Agregar un aviso o requisitos (opcional)', { exact: true }).click();
  await page.getByLabel('Descripción del trabajo').fill('Resolver consultas por correo.');
  await page.getByRole('button', { name: 'Redactar mi carta con IA' }).click();
  await expect(page.getByLabel('Carta de presentación', { exact: true })).toHaveValue(
    /Me interesa el puesto/,
  );
  expect(sent[0]).toContain('Resolver consultas por correo.');
  expect(sent[0]).toContain('Ayudar a personas');
  expect(sent[0]).toContain('Máximo 150 palabras');
  await page.reload();
  await expect(page.getByLabel('Tono de la carta con IA')).toHaveValue('breve');
  await expect(page.getByLabel('¿Por qué te interesa? (opcional)')).toHaveValue(
    'Ayudar a personas',
  );
});
test('sin oferta ni cargo se puede preparar una presentación general', async ({ page }) => {
  await page.addInitScript(
    (s) => localStorage.setItem('impulso.state.v1', JSON.stringify(s)),
    initialState,
  );
  await page.goto('/#/cartas');
  await page.getByRole('button', { name: 'Preparar mi primera carta' }).click();
  await page.getByRole('button', { name: 'Preparar un borrador', exact: true }).click();
  await expect(page.getByLabel('Carta de presentación', { exact: true })).toHaveValue(
    /futuras oportunidades laborales/,
  );
});
test('fallo de fuentes, países persistentes, sin desbordamiento y accesibilidad móvil', async ({
  page,
}) => {
  await page.route('**/api/jobs', (r) =>
    r.fulfill({
      json: {
        jobs: [],
        sources: feed.sources.map((s) => ({ ...s, status: 'error', fetchedAt: '' })),
      },
    }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/buscar');
  await page.getByLabel('País donde quieres trabajar').selectOption('*');
  await page.getByRole('button', { name: 'Ver ofertas en Impulso' }).click();
  await expect(page.getByText('No hay coincidencias en esta selección.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('País donde quieres trabajar')).toHaveValue('*');
  for (const route of ['buscar', 'importar', 'cartas', 'asistente']) {
    await page.goto('/#/' + route);
    await page.locator('h1').waitFor();
    if (route === 'cartas')
      await page.getByRole('button', { name: 'Preparar mi primera carta' }).click();
    const size = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(size.scroll, route).toBeLessThanOrEqual(size.width);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      route,
    ).toEqual([]);
    await page.screenshot({ path: 'test-results/' + route + '-nuevo-mobile.png', fullPage: true });
  }
});
