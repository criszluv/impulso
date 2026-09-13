import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { demoState, initialState } from '../src/lib/defaults';
import { parseBackup } from '../src/lib/storage';
import { readFile } from 'node:fs/promises';

async function seed(page: Page, state = demoState()) {
  await page.addInitScript((state) => {
    if (!localStorage.getItem('impulso.state.v1'))
      localStorage.setItem('impulso.state.v1', JSON.stringify(state));
  }, state);
}
test('crear CV sin experiencia ni correo, PDF legible y persistencia', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('link', { name: 'Empezar mi currículum', exact: true }).click();
  await page.getByRole('button', { name: 'Cocina', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByLabel('Comuna o ciudad', { exact: true }).fill('Osorno');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByLabel('Media jornada', { exact: true }).check();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Busco mi primer trabajo', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Preparación de alimentos', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByLabel('Nombre completo', { exact: true }).fill('María Muñoz');
  await page.getByLabel('Teléfono', { exact: true }).fill('+56 9 1234 5678');
  await page.getByRole('button', { name: 'Ver mi currículum', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mi currículum', exact: true })).toBeVisible();
  await expect(page.locator('.pdf-preview canvas')).toHaveCount(1);
  const dp = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar mi currículum', exact: true }).click();
  const d = await dp;
  expect(d.suggestedFilename()).toBe('Curriculum_María_Muñoz.pdf');
  const bytes = await readFile((await d.path())!);
  expect(bytes.toString('ascii', 0, 5)).toBe('%PDF-');
  const extracted = await page.evaluate(async () => {
    const { buildCvPdf } = await import('/src/lib/pdf.ts');
    const { pdfToText } = await import('/src/lib/import/files.ts');
    const s = JSON.parse(localStorage.getItem('impulso.state.v1')!);
    return pdfToText(
      new File([buildCvPdf(s.profile, s.cv)], 'cv.pdf', { type: 'application/pdf' }),
    );
  });
  expect(extracted).toContain('María Muñoz');
  expect(extracted).toContain('Preparación de alimentos');
  await page.reload();
  await expect(page.locator('.pdf-preview canvas')).toHaveCount(1);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('impulso.state.v1')!));
  expect(stored.profile.personal.fullName).toBe('María Muñoz');
  expect(stored.preferences.schedule).toBe('Media jornada');
  expect(stored.profile.experience).toHaveLength(0);
  await page.screenshot({ path: 'test-results/curriculum-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});
test('guardar no es enviar; URL segura, confirmación y calendario', async ({ page }) => {
  await seed(page);
  await page.goto('/#/postulaciones?nueva=1');
  await page.getByLabel('Nombre del trabajo', { exact: true }).fill('Ayudante de cocina');
  await page.getByLabel('Empresa (si aparece)').fill('Restaurante de prueba');
  await page.getByLabel('Enlace del aviso (opcional)').fill('javascript:alert(1)');
  await page.getByRole('button', { name: 'Guardar aviso', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('https://');
  await page.getByLabel('Enlace del aviso (opcional)').fill('https://example.com/oferta');
  await page.getByRole('button', { name: 'Guardar aviso', exact: true }).click();
  await expect(page.getByLabel('¿En qué va?')).toHaveValue('guardada');
  await page.getByRole('button', { name: 'Ya terminé, registrar mi envío' }).click();
  await page.getByRole('button', { name: 'Todavía no', exact: true }).click();
  await expect(page.getByLabel('¿En qué va?')).toHaveValue('guardada');
  await page.getByRole('button', { name: 'Ya terminé, registrar mi envío' }).click();
  await page.getByRole('button', { name: 'Sí, ya la envié', exact: true }).click();
  await expect(page.getByLabel('¿En qué va?')).toHaveValue('postulada');
  await page.getByLabel('¿Qué quieres recordar?').fill('Consultar respuesta');
  await page.getByLabel('¿Qué día?').fill('2026-10-20');
  const dp = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Añadir a mi calendario' }).click();
  const d = await dp;
  expect(await readFile((await d.path())!, 'utf8')).toContain('DTSTART;VALUE=DATE:20261020');
  await page.reload();
  await expect(page.getByLabel('¿Qué quieres recordar?')).toHaveValue('Consultar respuesta');
});
test('recuperación validada, revisión y deshacer', async ({ page }) => {
  await seed(page);
  await page.goto('/#/ajustes');
  await page.locator('input[type=file]').setInputFiles({
    name: 'roto.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({ profile: { personal: { fullName: 'INVALIDO' }, experience: 'roto' } }),
    ),
  });
  await expect(page.getByRole('alert')).toContainText('No reconocimos esa copia');
  const imported = structuredClone(initialState);
  imported.profile.personal.fullName = 'Ana de prueba';
  await page.locator('input[type=file]').setInputFiles({
    name: 'copia.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(imported)),
  });
  await expect(page.getByRole('region', { name: 'Revisar copia' })).toContainText('Ana de prueba');
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('impulso.state.v1')!).profile.personal.fullName,
    ),
  ).toBe('Camila Rojas Fuentes');
  await page.getByRole('button', { name: 'Usar esta copia', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('impulso.state.v1')!).profile.personal.fullName,
      ),
    )
    .toBe('Ana de prueba');
  await page.getByRole('button', { name: 'Deshacer reemplazo', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('impulso.state.v1')!).profile.personal.fullName,
      ),
    )
    .toBe('Camila Rojas Fuentes');
});
test('un fallo de almacenamiento nunca muestra guardado', async ({ page }) => {
  await seed(page);
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === 'impulso.state.v1' && this.getItem(k))
        throw new DOMException('Full', 'QuotaExceededError');
      return original.call(this, k, v);
    };
  });
  await page.goto('/#/empezar');
  await page.getByLabel('Quiero trabajar en…').fill('Panadería');
  await expect(page.locator('.save-warning')).toContainText('No está guardado');
  await expect(page.locator('.saved-pill')).toBeEmpty();
});
test('migración conserva perfiles antiguos y protege datos corruptos', async ({ page }) => {
  const legacy = demoState();
  delete (legacy as Partial<typeof legacy>).preferences;
  expect(parseBackup(JSON.stringify(legacy)).profile.personal.fullName).toBe(
    legacy.profile.personal.fullName,
  );
  expect(parseBackup(JSON.stringify(legacy)).preferences.completed).toBe(false);
  await page.addInitScript(() => localStorage.setItem('impulso.state.v1', '{"broken":'));
  await page.goto('/');
  await expect(page.locator('.save-warning')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('impulso.state.v1'))).toBe('{"broken":');
});
test('importación de texto con revisión antes de guardar', async ({ page }) => {
  await page.goto('/#/importar');
  await page.getByText('Prefiero copiar y pegar el texto', { exact: true }).click();
  await page
    .getByLabel('El contenido de mi currículum')
    .fill(
      'María Pérez\nAuxiliar de cocina\nmaria@ejemplo.cl\n+56 9 8765 4321\n\nEXPERIENCIA\nAyudante de cocina\nRestaurante Sur\n2022 - 2024\nPreparación de alimentos y limpieza de cocina.\n\nHABILIDADES\nCocina, limpieza',
    );
  await page.getByRole('button', { name: 'Leer este texto', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Esto es lo que encontramos.' })).toBeVisible();
  await page.getByRole('button', { name: 'Guardar y revisar mis datos' }).click();
  await expect(page.getByLabel('Nombre completo')).toHaveValue('María Pérez');
});
test('búsqueda externa utiliza las preferencias', async ({ page }) => {
  await page.goto('/#/buscar');
  await page.getByLabel('¿Qué trabajo buscas?').fill('Aseo');
  await page.getByLabel('Ciudad (opcional)').fill('Osorno');
  await page.getByLabel('Horario', { exact: true }).selectOption('Media jornada');
  const href = await page
    .getByRole('link', { name: 'Buscar en Chiletrabajos' })
    .first()
    .getAttribute('href');
  expect(decodeURIComponent(href!)).toContain(
    'site:chiletrabajos.cl Aseo Osorno Chile Media jornada empleo',
  );
});
test('diseño móvil y escritorio: navegación, contraste y accesibilidad', async ({ page }) => {
  await page.goto('/');
  await page.locator('h1').first().waitFor();
  await page.screenshot({ path: 'test-results/inicio-desktop.png', fullPage: true });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/#/', '/#/empezar', '/#/buscar', '/#/postulaciones', '/#/ajustes']) {
    await page.goto(route);
    await page.locator('h1').first().waitFor();
    const sizes = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(sizes.scroll, route).toBeLessThanOrEqual(sizes.width);
    const a = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(
      a.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      route,
    ).toEqual([]);
  }
  await page.goto('/');
  await page.locator('h1').first().waitFor();
  await page.screenshot({ path: 'test-results/inicio-mobile.png', fullPage: true });
  await page
    .getByRole('navigation', { name: 'Navegación móvil' })
    .getByRole('link', { name: 'Currículum', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Mi currículum', exact: true })).toBeVisible();
});

test('todas las pantallas con datos, accesibles y sin desbordes en móvil', async ({ page }) => {
  await seed(page);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    '/#/perfil',
    '/#/cv',
    '/#/importar',
    '/#/cartas',
    '/#/entrevistas',
    '/#/asistente',
  ]) {
    await page.goto(route);
    await page.locator('h1').first().waitFor();
    if (route.includes('/perfil')) {
      while (await page.locator('.profile-section:not([open]) > summary').count())
        await page.locator('.profile-section:not([open]) > summary').first().click();
    }
    if (route.endsWith('/cv'))
      await expect(page.locator('.pdf-preview canvas').first()).toBeVisible();
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
  }
  expect(errors).toEqual([]);
});
test('cartas y entrevistas se pueden preparar, editar y recuperar', async ({ page }) => {
  await seed(page);
  await page.goto('/#/cartas');
  await page.getByRole('button', { name: 'Preparar mi primera carta' }).click();
  await page.getByLabel('Trabajo al que postulas').fill('Auxiliar de cocina');
  await page.getByLabel('Empresa (opcional)', { exact: true }).fill('Restaurante de prueba');
  await page.getByRole('button', { name: 'Preparar un borrador', exact: true }).click();
  await expect(page.getByLabel('Carta de presentación', { exact: true })).toContainText(
    'Auxiliar de cocina',
  );
  const dp = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar carta', exact: true }).click();
  expect((await dp).suggestedFilename()).toBe('Carta_de_presentacion.pdf');
  await page.goto('/#/entrevistas');
  await page.getByRole('button', { name: 'Preparar', exact: true }).first().click();
  await page
    .getByLabel('¿Qué pasaba?', { exact: true })
    .fill('Había muchos clientes en el almacén.');
  await page
    .getByLabel('¿Qué hiciste tú?', { exact: true })
    .fill('Organicé una fila y atendí por orden.');
  await page.reload();
  await page.getByRole('button', { name: 'Editar respuesta' }).first().click();
  await expect(page.getByLabel('¿Qué hiciste tú?', { exact: true })).toHaveValue(
    'Organicé una fila y atendí por orden.',
  );
});
test('PDF de varias páginas incluye todo el contenido sin recortarlo', async ({ page }) => {
  const data = demoState();
  data.profile.experience[0].bullets = Array.from(
    { length: 75 },
    (_, i) =>
      'Tarea ' +
      (i + 1) +
      ': Preparación de pedidos, atención de clientes y organización de productos en el almacén.',
  );
  await seed(page, data);
  await page.goto('/#/cv');
  await page.locator('h1').first().waitFor();
  const result = await page.evaluate(async () => {
    const { buildCvPdf } = await import('/src/lib/pdf.ts');
    const { pdfToText } = await import('/src/lib/import/files.ts');
    const s = JSON.parse(localStorage.getItem('impulso.state.v1')!);
    return await pdfToText(
      new File([buildCvPdf(s.profile, s.cv)], 'largo.pdf', { type: 'application/pdf' }),
    );
  });
  expect(result).toContain('Tarea 75:');
  expect(result).toContain('Deque University');
});
test('borrar los datos también elimina copias internas y claves', async ({ page }) => {
  await seed(page);
  await page.addInitScript(() => {
    localStorage.setItem('impulso.recovery.v1', localStorage.getItem('impulso.state.v1')!);
    localStorage.setItem(
      'impulso.ai.v1',
      JSON.stringify({ preset: '', apiKey: 'fictional-test-key' }),
    );
  });
  await page.goto('/#/ajustes');
  await page.getByText('Borrar mis datos de este navegador', { exact: true }).click();
  await page.getByRole('button', { name: 'Borrar mis datos', exact: true }).click();
  await page
    .getByRole('button', { name: 'Sí, borrar todos mis datos locales', exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('impulso.state.v1')!).profile.personal.fullName,
      ),
    )
    .toBe('');
  expect(await page.evaluate(() => localStorage.getItem('impulso.recovery.v1'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('impulso.ai.v1'))).toBeNull();
});
