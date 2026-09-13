import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { initialState, demoState } from '../src/lib/defaults';
import { newExperience, newEducation, updateHomeLocation } from '../src/lib/guided';
import { compareJob } from '../src/lib/jobComparison';
import { parseBackup } from '../src/lib/storage';
import { countryCode } from '../src/lib/jobs';

async function seed(page: Page, data = demoState()) {
  await page.addInitScript((s) => {
    if (!localStorage.getItem('impulso.state.v1'))
      localStorage.setItem('impulso.state.v1', JSON.stringify(s));
  }, data);
}
const next = (page: Page) => page.getByRole('button', { name: 'Continuar', exact: true }).click();
async function pdfText(page: Page) {
  return page.evaluate(async () => {
    const { buildCvPdf } = await import('/src/lib/pdf.ts');
    const { pdfToText } = await import('/src/lib/import/files.ts');
    const s = JSON.parse(localStorage.getItem('impulso.state.v1')!);
    return pdfToText(
      new File([buildCvPdf(s.profile, s.cv)], 'cv.pdf', { type: 'application/pdf' }),
    );
  });
}
async function accessible(page: Page) {
  const size = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(size.scroll).toBeLessThanOrEqual(size.width);
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual(
    [],
  );
}

test('guía completa en España: varias experiencias y estudios plegables, persistencia y PDF', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/#/empezar');
  await page.getByRole('button', { name: 'Administración', exact: true }).click();
  await next(page);
  await expect(page.getByLabel('País donde vives')).toHaveValue('');
  await next(page);
  await expect(page.getByRole('alert')).toContainText('Elige el país');
  await page.getByLabel('País donde vives').selectOption('España');
  await page.getByLabel('Comuna o ciudad', { exact: true }).fill('Madrid');
  await next(page);
  await page.getByLabel('Jornada completa', { exact: true }).check();
  await next(page);
  await page.getByRole('button', { name: 'Sí, quiero contar una experiencia' }).click();
  let first = page.locator('.guided-record').nth(0);
  await expect(first.getByLabel('Cargo o actividad')).toBeFocused();
  await first.getByLabel('Cargo o actividad').fill('Auxiliar administrativa');
  await first.getByLabel('Empresa o dónde lo hacías (opcional)').fill('Tienda Norte');
  await first.getByLabel('Inicio de esta experiencia (opcional)').fill('2020-01');
  await first.getByLabel('Fin de esta experiencia (opcional)').fill('2022-12');
  await first
    .getByLabel('¿Qué tareas hacías?')
    .fill('Atención de clientes.\nRegistro de inventario en Excel.');
  await first.locator('summary').click();
  await expect(first).not.toHaveAttribute('open', '');
  await page.getByRole('button', { name: 'Añadir otra experiencia' }).click();
  const second = page.locator('.guided-record').nth(1);
  await expect(second.getByLabel('Cargo o actividad')).toBeFocused();
  await second.getByLabel('Cargo o actividad').fill('Administrativa');
  await second.getByLabel('Empresa o dónde lo hacías (opcional)').fill('Oficina Sur');
  await second.getByLabel('Inicio de esta experiencia (opcional)').fill('2023-01');
  await second.getByLabel('Sigo trabajando aquí').check();
  await expect(second.getByLabel('Fin de esta experiencia (opcional)')).toBeDisabled();
  await expect(page).toHaveURL(/#\/empezar$/);
  await page.setViewportSize({ width: 390, height: 844 });
  await accessible(page);
  await page.screenshot({ path: 'test-results/experiencias-guia-mobile.png', fullPage: true });
  await page.reload();
  await expect(page.locator('.guided-record')).toHaveCount(2);
  await page.getByRole('button', { name: 'Ordenar experiencias por fecha' }).click();
  await expect(page.locator('.guided-record').first().locator('summary')).toContainText(
    'Administrativa',
  );
  await next(page);
  await page.getByRole('button', { name: 'Correo electrónico', exact: true }).click();
  await page.getByRole('button', { name: 'Agregar mis estudios', exact: true }).click();
  let study = page.locator('.guided-record').nth(0);
  await study.getByLabel('Estudios, título o curso').fill('Técnico en Gestión Administrativa');
  await study.getByLabel('Institución o centro de estudios (opcional)').fill('Instituto Centro');
  await study.getByLabel('Sede o ciudad (opcional)').fill('Sede Retiro, Madrid');
  await study.getByLabel('Inicio de estos estudios (opcional)').fill('2018-09');
  await study.getByLabel('Fin de estos estudios (opcional)').fill('2020-06');
  await study.locator('summary').click();
  await page.getByRole('button', { name: 'Añadir otros estudios' }).click();
  study = page.locator('.guided-record').nth(1);
  await study.getByLabel('Estudios, título o curso').fill('Curso de análisis de datos');
  await study.getByLabel('Institución o centro de estudios (opcional)').fill('Escuela Digital');
  await study.getByLabel('Sede o ciudad (opcional)').fill('Campus virtual');
  await study.getByLabel('Inicio de estos estudios (opcional)').fill('2026-01');
  await study.getByLabel('Sigo estudiando').check();
  await expect(study.getByLabel('Fin de estos estudios (opcional)')).toBeDisabled();
  await accessible(page);
  await page.screenshot({ path: 'test-results/estudios-guia-mobile.png', fullPage: true });
  await next(page);
  await page.getByRole('button', { name: 'Atrás', exact: true }).click();
  await expect(page.locator('.guided-record')).toHaveCount(2);
  await page.reload();
  await expect(page.getByLabel('Sigo estudiando').last()).toBeChecked();
  await next(page);
  await page.getByLabel('Nombre completo', { exact: true }).fill('María García');
  await page.getByLabel('Teléfono', { exact: true }).fill('+34 612345678');
  await page.getByRole('button', { name: 'Ver mi currículum', exact: true }).click();
  await page.locator('.pdf-preview canvas').first().waitFor();
  const text = await pdfText(page);
  for (const value of [
    'María García',
    'Madrid, España',
    'Oficina Sur',
    'Tienda Norte',
    'Sede Retiro, Madrid',
    'Campus virtual',
    'En curso',
    'ene 2020',
    'jun 2020',
  ])
    expect(text).toContain(value);
  expect(text.indexOf('Oficina Sur')).toBeLessThan(text.indexOf('Tienda Norte'));
  await page.goto('/#/buscar');
  await expect(page.getByLabel('País donde quieres trabajar')).toHaveValue('ES');
  await expect(page.getByLabel('Ciudad (opcional)')).toHaveValue('Madrid');
  await expect(page.getByRole('link', { name: 'Buscar en InfoJobs' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('valida cada cuadro cerrado y fechas; quitar y deshacer no pierde otras experiencias', async ({
  page,
}) => {
  const data = structuredClone(initialState);
  data.profile.personal.country = 'España';
  data.profile.personal.city = 'Madrid';
  data.preferences.step = 3;
  data.profile.experience = [
    { ...newExperience(), role: 'Cajera', company: 'Primera' },
    { ...newExperience(), company: 'Segunda' },
  ];
  await seed(page, data);
  await page.goto('/#/empezar');
  await page.locator('.guided-record').last().locator('summary').click();
  await next(page);
  await expect(page.getByRole('alert')).toContainText('Experiencia 2');
  let row = page.locator('.guided-record').last();
  await expect(row.getByLabel('Cargo o actividad')).toBeFocused();
  await row.getByLabel('Cargo o actividad').fill('Ayudante');
  await row.getByLabel('Inicio de esta experiencia (opcional)').fill('2024-06');
  await row.getByLabel('Fin de esta experiencia (opcional)').fill('2023-06');
  await row.locator('summary').click();
  await next(page);
  await expect(page.getByRole('alert')).toContainText('anterior al inicio');
  await expect(row.getByLabel('Fin de esta experiencia (opcional)')).toBeFocused();
  await row.getByLabel('Fin de esta experiencia (opcional)').fill('2025-06');
  await row.getByRole('button', { name: 'Quitar esta experiencia', exact: true }).click();
  await row.getByRole('button', { name: 'Sí, quitar esta experiencia' }).click();
  await expect(page.locator('.guided-record')).toHaveCount(1);
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(page.locator('.guided-record')).toHaveCount(2);
  await page.getByRole('button', { name: 'Añadir otra experiencia' }).click();
  await page
    .locator('.guided-record')
    .last()
    .getByRole('button', { name: 'Quitar cuadro vacío' })
    .click();
  await next(page);
  await page.getByRole('button', { name: 'Agregar mis estudios', exact: true }).click();
  row = page.locator('.guided-record').first();
  await row.getByLabel('Estudios, título o curso').fill('Curso de cocina');
  await row.getByLabel('Inicio de estos estudios (opcional)').fill('2024-06');
  await row.getByLabel('Fin de estos estudios (opcional)').fill('2023-06');
  await row.locator('summary').click();
  await next(page);
  await expect(page.getByRole('alert')).toContainText('Estudio 1');
  await row.getByLabel('Sigo estudiando').check();
  await next(page);
  await expect(page.getByRole('heading', { name: '¿Cómo pueden contactarte?' })).toBeVisible();
});

test('migración conserva países y separa residencia de búsqueda internacional', () => {
  const old = demoState();
  old.profile.personal.country = 'España';
  delete (old.preferences as Partial<typeof old.preferences>).country;
  const restored = parseBackup(JSON.stringify(old));
  expect(restored.profile.personal.country).toBe('España');
  expect(restored.profile.experience).toEqual(old.profile.experience);
  const data = demoState();
  data.preferences.country = 'ES';
  data.preferences.city = 'Madrid';
  const changed = updateHomeLocation(data, { country: 'Argentina', city: 'Córdoba' });
  expect(changed.profile.personal.country).toBe('Argentina');
  expect(changed.preferences.country).toBe('ES');
  expect(changed.preferences.city).toBe('Madrid');
  expect(initialState.profile.personal.country).toBe('');
  expect(countryCode('Spain')).toBe('ES');
  expect(countryCode('Países Bajos')).toBe('');
});

test('comparación muestra evidencia, respeta secciones ocultas y no convierte ausencias en incompatibilidad', () => {
  const profile = structuredClone(initialState.profile);
  profile.personal.headline = 'Programadora Python';
  profile.skills = [
    {
      id: 'skills',
      name: 'Habilidades',
      items: ['Excel: tablas dinámicas', 'No tengo experiencia en SAP'],
    },
  ];
  profile.experience = [
    {
      ...newExperience(),
      role: 'Auxiliar',
      company: 'Salesforce',
      bullets: ['Atención de clientes y cobros'],
    },
  ];
  profile.languages = [{ id: 'en', name: 'Inglés', level: 'Básico' }];
  profile.education = [
    { ...newEducation(), degree: 'Bachillerato', institution: 'Centro', current: true },
  ];
  const description =
    'Atención al cliente. Excel avanzado. Inventario. SAP. Python. Salesforce CRM. Inglés C1. Título universitario. 3 años de experiencia. Requisito: disponibilidad para viajar.';
  const result = compareJob(description, profile, initialState.cv),
    item = (id: string) => result.items.find((x) => x.id === id)!;
  expect(item('excel').status).toBe('related');
  expect(item('excel').evidence[0].text).toContain('tablas dinámicas');
  expect(item('stock').status).toBe('missing');
  expect(item('python').status).toBe('missing');
  expect(item('crm').status).toBe('missing');
  expect(item('sap').status).toBe('review');
  expect(item('english').status).toBe('review');
  expect(item('education').status).toBe('review');
  expect(item('experience').status).toBe('review');
  expect(result.other.join(' ')).toContain('disponibilidad para viajar');
  expect(
    compareJob('Inglés C1', profile, { ...initialState.cv, showLanguages: false }).items[0]
      .evidence,
  ).toHaveLength(0);
  expect(
    compareJob(
      'No se requiere Excel. Sin experiencia previa. Edad: 35 años. Sexo masculino.',
      profile,
      initialState.cv,
    ).items,
  ).toHaveLength(0);
  expect(compareJob('Python', initialState.profile, initialState.cv).hasProfile).toBe(false);
});

test('comparación en postulaciones: pegar aviso sin perder foco, evidencias y móvil', async ({
  page,
}) => {
  const data = demoState();
  data.profile.skills = [
    { id: 'skills', name: 'Herramientas', items: ['Excel: tablas dinámicas'] },
  ];
  data.profile.personal.summary = '';
  data.applications[0].jobDescription = '';
  await seed(page, data);
  await page.goto('/#/postulaciones?ver=' + data.applications[0].id);
  const region = page.getByRole('region', { name: 'Comparación del aviso con mi currículum' });
  await region
    .getByLabel('Aviso para comparar con mi CV')
    .pressSequentially('Excel avanzado. Manejo de inventario. Inglés C1.');
  await expect(region.getByLabel('Aviso para comparar con mi CV')).toHaveValue(
    'Excel avanzado. Manejo de inventario. Inglés C1.',
  );
  await region.getByRole('button', { name: 'Terminar de editar el aviso' }).click();
  await expect(region.getByRole('heading', { name: 'Excel', exact: true })).toBeVisible();
  const card = region
    .locator('.comparison-item')
    .filter({ has: page.getByRole('heading', { name: 'Excel', exact: true }) });
  await expect(card).toContainText('tablas dinámicas');
  await expect(region).toContainText('Eso no significa que no sepas hacerlo.');
  await page.setViewportSize({ width: 390, height: 844 });
  await accessible(page);
  await page.screenshot({ path: 'test-results/comparacion-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await accessible(page);
  await page.screenshot({ path: 'test-results/comparacion-desktop.png', fullPage: true });
  await page.reload();
  await expect(region.getByRole('heading', { name: 'Excel', exact: true })).toBeVisible();
  await page.getByText('Datos del aviso', { exact: true }).click();
  await page.getByLabel('Descripción y requisitos del trabajo').fill('');
  await region.getByLabel('Aviso para comparar con mi CV').pressSequentially('Excel');
  await expect(region.getByLabel('Aviso para comparar con mi CV')).toHaveValue('Excel');
});

test('aviso sin perfil pide completar datos y conserva todos los registros existentes', async ({
  page,
}) => {
  const data = demoState();
  data.profile = structuredClone(initialState.profile);
  data.applications[0].jobDescription = 'Experiencia previa en ventas. Excel.';
  await seed(page, data);
  await page.goto('/#/postulaciones?ver=' + data.applications[0].id);
  const region = page.getByRole('region', { name: 'Comparación del aviso con mi currículum' });
  await expect(region).toContainText('No sacamos conclusiones por la falta de datos.');
  await expect(region.locator('.comparison-counts')).toHaveCount(0);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('impulso.state.v1')!).applications.length,
    ),
  ).toBe(data.applications.length);
});
