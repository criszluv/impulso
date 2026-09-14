import { writeFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { initialState } from '../src/lib/defaults';
import { newLetter } from '../src/lib/jobs';
import { checkLetterReferences, letterBody } from '../src/lib/ai/letterContext';

// Representative of the reported hotel vacancy; candidate data is fictional.
const job = `Misión: Responsable de la elaboración/ regeneración y presentación de los alimentos que se producen en la cocina donde es asignado, cumpliendo con los estándares de calidad y recetas establecidas para cada plato, poniendo especial cuidado en la creatividad, composición, sazón y presentación para asegurar la satisfacción de huéspedes y clientes del Hotel.
Funciones:
Cumple las instrucciones de su jefe inmediato en cuanto a turnos, horarios, tareas y cargas de trabajo, auxiliándose con el Ayudante de Cocina asignado.&#x20;
Lleva a cabo el acomodo de la cámara y refrigeradores de su estación para el correcto aprovechamiento de los productos.
Vigila que todos los productos en refrigeración estén en buen estado, utilizando los menos recientes y separando los de nuevo ingreso. Verifica la temperatura adecuada.
Lleva a cabo la producción de acuerdo a los procedimientos, estándares de calidad, recetas y fotografías, vigilando el control de porciones y asegurando el mínimo desperdicio.
Entrega las solicitudes del centro de consumo en forma eficiente y oportuna, cumpliendo las especificaciones de guarniciones y términos de cocimiento.
Cumple con las normas de APPCC, seguridad, limpieza e higiene, minimizando riesgos de accidentes y asegurando la calidad de los alimentos.&#x20;
Comprueba estándares de calidad, cantidad y rendimiento de los productos e informa anomalías a su jefe.
Mantiene una estrecha comunicación con su jefe y las demás áreas de cocina y departamentos del Hotel.
Requisitos:
Experiencia mínima de 1 año en un puesto similar en Hoteles de 4 y 5 estrellas.
Conocimiento de Manipulación de alimentos, higiene y seguridad alimentaria.&#x20;
Conocimientos culinarios propios.
Dominio Paquete Office y herramientas vinculadas a la posición.
Conocimientos de operativa hotelera.
Polivalencia dentro de los servicios que se ofrecen.
Trabajo en equipo, pasión por el servicio y orientación al cliente. Espíritu de equipo. Proactividad.
En Meliá todos somos VIP.
En Meliá Hotels International apostamos por la igualdad de oportunidades entre mujeres y hombres, la diversidad y la inclusión, evitando discriminación por discapacidad, raza, religión, género o edad.
Apostamos por el crecimiento sostenible de nuestro sector a través de un gran equipo humano socialmente responsable. Hacia un futuro sostenible, desde un presente responsable.`;
const model = {
  preset: 'ollama',
  provider: 'openai-compat',
  baseUrl: 'http://localhost:11434/v1',
  model: 'qwen3.5:9b',
  apiKey: '',
  reader: 'ninguno',
};
function fixture(body = '') {
  const state = structuredClone(initialState);
  Object.assign(state.profile.personal, {
    fullName: 'Ana Pérez',
    headline: 'Cocinera',
    country: 'España',
    city: 'Madrid',
    email: 'ana@example.com',
  });
  state.profile.education = [
    {
      id: 'ed1',
      degree: 'Gastronomía',
      institution: 'Instituto de prueba',
      location: 'Sede Madrid',
      startDate: '',
      endDate: '',
      current: false,
      detail: '',
    },
  ];
  state.profile.experience = [
    {
      id: 'ex1',
      role: 'Ayudante de cocina',
      company: 'Residencia de adultos mayores',
      location: 'Madrid',
      startDate: '2023-01',
      endDate: '2025-01',
      current: false,
      bullets: [
        'Preparación de alimentos.',
        'Limpieza de cocinas y orden general de las instalaciones.',
      ],
      tech: [],
    },
  ];
  state.letters = [
    {
      ...newLetter('Cocinera'),
      company: 'Velada',
      recipient: 'Ibai',
      motivation: 'Me interesa el mundo del entretenimiento.',
      tone: 'formal',
      jobDescription: job,
      body,
    },
  ];
  return state;
}
async function setup(page: Page, body = '') {
  await page.addInitScript(
    ({ state, model }) => {
      if (!localStorage.getItem('impulso.state.v1'))
        localStorage.setItem('impulso.state.v1', JSON.stringify(state));
      localStorage.setItem('impulso.ai.v1', JSON.stringify(model));
    },
    { state: fixture(body), model },
  );
  await page.goto('/#/cartas');
}
const letter =
  'Estimado Ibai:\n\nMe interesa el puesto de Cocinera en Velada. Cuento con formación en Gastronomía y experiencia como ayudante de cocina en una residencia de adultos mayores.\n\nLa elaboración y presentación de alimentos que describe el aviso conecta con mis tareas de preparación de alimentos. La limpieza e higiene de la cocina también forma parte del puesto; en mi trabajo anterior realizaba limpieza de cocinas y orden de las instalaciones.\n\nMe interesa aportar esa experiencia a las tareas del equipo de cocina. Quedo disponible para conversar.\n\nAna Pérez\nana@example.com';
const result = {
  body: letter,
  gaps: [
    'Omití el interés por entretenimiento porque no se relaciona con las funciones de cocina.',
    'Revisa la empresa: escribiste Velada y el aviso menciona Meliá.',
  ],
  paragraphs: letter
    .split('\n\n')
    .map((text, i) => ({ text, jobIds: i === 2 ? ['J1', 'J7'] : [], profileIds: [] })),
};
const reply = (value: unknown) => ({ choices: [{ message: { content: JSON.stringify(value) } }] });

test('rechaza fuentes inexistentes y mantiene unidos los párrafos y sus referencias', () => {
  expect(checkLetterReferences(result, job, '')).toBe(true);
  expect(letterBody(result)).toBe(letter);
  expect(checkLetterReferences({ body: letter }, job, '')).toBe(false);
  expect(
    checkLetterReferences(
      { paragraphs: [{ text: letter, jobIds: ['P1'], profileIds: [] }] },
      job,
      'Nombre: Ana',
    ),
  ).toBe(false);
  expect(
    checkLetterReferences(
      { paragraphs: [{ text: letter, jobIds: ['J999'], profileIds: [] }] },
      job,
      '',
    ),
  ).toBe(false);
  expect(
    checkLetterReferences(
      { paragraphs: [{ text: letter, jobIds: ['J1'], profileIds: ['P999'] }] },
      job,
      'Nombre: Ana',
    ),
  ).toBe(false);
  expect(
    checkLetterReferences({ paragraphs: [{ text: letter, jobIds: [], profileIds: [] }] }, job, ''),
  ).toBe(false);
  expect(
    checkLetterReferences({ paragraphs: [{ text: letter, jobIds: [], profileIds: [] }] }, '', ''),
  ).toBe(true);
});

test('IA después de los datos; recibe aviso completo, reintenta sin contexto y conserva revisión móvil', async ({
  page,
}) => {
  const sent: Array<{ messages: Array<{ role: string; content: string }> }> = [];
  await page.route('**/api/local-ai/ollama/v1/chat/completions', (r) => {
    sent.push(r.request().postDataJSON());
    return r.fulfill({
      json: reply(
        sent.length === 1
          ? {
              body: 'Estimado Ibai:\n\nMe atrae Velada por su enfoque hacia el entretenimiento.\n\nAna Pérez',
              gaps: [],
            }
          : result,
      ),
    });
  });
  await setup(page);
  await page.getByText('Revisar la descripción del aviso', { exact: true }).click();
  const description = page.getByLabel('Descripción del trabajo');
  const button = page.getByRole('button', { name: 'Redactar mi carta con IA' });
  expect((await button.boundingBox())!.y).toBeGreaterThan((await description.boundingBox())!.y);
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await button.boundingBox())!.y).toBeGreaterThan((await description.boundingBox())!.y);
  await button.click();
  await expect(page.getByLabel('Carta de presentación', { exact: true })).toHaveValue(letter);
  await expect(page.getByLabel('Carta de presentación', { exact: true })).toBeFocused();
  expect(sent).toHaveLength(2);
  const prompt = sent[0].messages.find((m) => m.role === 'user')!.content;
  expect(prompt).toContain('control de porciones');
  expect(prompt).toContain('desde un presente responsable.');
  expect(prompt).not.toContain('&#x20;');
  expect(prompt).toContain('motivacionPersonal');
  expect(sent[0].messages[0].content).toContain('SOLO el perfil');
  expect(sent[1].messages[0].content).toContain('fuentes válidas');
  await expect(page.getByRole('status').filter({ hasText: 'Omití' })).toBeVisible();
  await expect(page.getByLabel('Carta de presentación', { exact: true })).not.toHaveValue(
    /entretenimiento|domino.*Office|tengo.*APPCC/i,
  );
  const axes = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(axes.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/carta-contexto-mobile.png', fullPage: true });
  await page.reload();
  await expect(page.getByLabel('Carta de presentación', { exact: true })).toHaveValue(letter);
});

test('un fallo de contexto no reemplaza la carta guardada y sin aviso sigue funcionando', async ({
  page,
}) => {
  let calls = 0;
  await page.route('**/api/local-ai/ollama/v1/chat/completions', (r) => {
    calls++;
    return r.fulfill({
      json: reply(
        calls <= 2
          ? { body: letter, gaps: [] }
          : { ...result, paragraphs: result.paragraphs.map((p) => ({ ...p, jobIds: [] })) },
      ),
    });
  });
  await setup(page, 'Mi carta anterior.');
  await page.getByRole('button', { name: 'Crear otra versión con IA' }).click();
  await page.getByRole('button', { name: 'Sí, reemplazar mi texto con IA' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'ninguna carta' })).toBeVisible();
  expect(calls).toBe(2);
  await expect(page.getByLabel('Carta de presentación', { exact: true })).toHaveValue(
    'Mi carta anterior.',
  );
  await page.getByText('Revisar la descripción del aviso', { exact: true }).click();
  await page.getByLabel('Descripción del trabajo').fill('');
  await page.getByRole('button', { name: 'Crear otra versión con IA' }).click();
  await page.getByRole('button', { name: 'Sí, reemplazar mi texto con IA' }).click();
  await expect(page.getByLabel('Carta de presentación', { exact: true })).toHaveValue(letter);
  expect(calls).toBe(3);
  await page.getByRole('button', { name: 'Recuperar texto anterior' }).click();
  await expect(page.getByLabel('Carta de presentación', { exact: true })).toHaveValue(
    'Mi carta anterior.',
  );
});

test('modelo local real adapta el caso de cocina', async ({ page }, testInfo) => {
  test.skip(
    process.env.IMPULSO_TEST_LOCAL_AI !== '1',
    'Evaluación optativa; requiere qwen3.5:9b local.',
  );
  test.setTimeout(240000);
  const bodies: unknown[] = [];
  page.on('response', async (response) => {
    if (response.url().endsWith('/chat/completions')) bodies.push(await response.json());
  });
  await setup(page);
  await page.getByRole('button', { name: 'Redactar mi carta con IA' }).click();
  const output = page.getByLabel('Carta de presentación', { exact: true });
  await expect(page.getByRole('button', { name: 'Nueva carta', exact: true })).toBeEnabled({
    timeout: 220000,
  });
  const text = await output.inputValue();
  await testInfo.attach('carta-real.txt', { body: text, contentType: 'text/plain' });
  await writeFile(testInfo.outputPath('respuesta-real.json'), JSON.stringify(bodies, null, 2));
  await testInfo.attach('respuesta-real.json', {
    body: JSON.stringify(bodies, null, 2),
    contentType: 'application/json',
  });
  await page.screenshot({ path: 'test-results/carta-contexto-real.png', fullPage: true });
  console.log('CARTA REAL:\n' + text);
  expect(text).toMatch(/alimentos|platos/);
  expect(text).toMatch(/higiene|limpieza/);
  expect(text).not.toMatch(/entretenimiento|certificad[ao].*APPCC|domino.*Office/i);
  expect(text).toContain('Ana Pérez');
  expect(text).toContain('ana@example.com');
});
