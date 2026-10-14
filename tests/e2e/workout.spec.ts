import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { utils, write } from 'xlsx';
import { builtInCatalog } from '@tr-lab/contracts';
function workbook() {
  const book = utils.book_new(),
    exercise = builtInCatalog[0]!;
  utils.book_append_sheet(
    book,
    utils.aoa_to_sheet([
      [
        'Giorno',
        '#',
        'Esercizio',
        'Lati',
        'Gruppo primario',
        'Serie',
        'Rip min',
        'Rip max',
        'RIR',
        'Recupero (s)',
        'Esecuzione e note',
        '+1 serie sett. 3-6',
      ],
      ['A', 1, exercise.name, 1, exercise.muscle, 1, 8, 12, 0, 0, 'Fixture sintetica', 'No'],
    ]),
    'Scheda',
  );
  utils.book_append_sheet(
    book,
    utils.aoa_to_sheet([
      ['Settimana', 'Fase', 'Serie'],
      [1, 'Base', 'Come in Scheda'],
    ]),
    'Periodizzazione',
  );
  return write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
async function layout(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);
  const overlaps = await page
    .locator('dialog[open] button:visible, #calendario button:visible, #proposte button:visible')
    .evaluateAll((elements) => {
      const problems: string[] = [];
      for (let i = 0; i < elements.length; i++)
        for (let j = i + 1; j < elements.length; j++) {
          const a = elements[i]!,
            b = elements[j]!;
          if (a.parentElement !== b.parentElement) continue;
          const x = a.getBoundingClientRect(),
            y = b.getBoundingClientRect();
          if (
            Math.min(x.right, y.right) - Math.max(x.left, y.left) > 1 &&
            Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top) > 1
          )
            problems.push(`${a.textContent}/${b.textContent}`);
        }
      return problems;
    });
  expect(overlaps).toEqual([]);
}
test('Excel → bozza → conferma → calendario → diario offline, conserva i dati', async ({
  page,
  context,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/programma');
  await expect(page.getByRole('heading', { name: 'Il tuo programma.' })).toBeVisible();
  await page.locator('input[type=file]').setInputFiles({
    name: 'Scheda QA sintetica.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: workbook(),
  });
  const review = page.getByRole('dialog');
  await expect(review.getByRole('heading', { name: 'Anteprima del file Excel' })).toBeVisible();
  await layout(page);
  await expect(
    review.getByRole('button', { name: 'Conferma la struttura e apri l’editor' }),
  ).toBeDisabled();
  await review.getByRole('checkbox').check();
  await review.getByRole('button', { name: 'Conferma la struttura e apri l’editor' }).click();
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: 'Editor della scheda' }),
  ).toBeVisible();
  await layout(page);
  await page.getByRole('button', { name: /Salva.*bozza/i }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: /Approva/i }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Confermo/i })
    .click();
  await page.getByRole('button', { name: 'Pianifica un ciclo' }).click();
  const plan = page.getByRole('dialog');
  await plan.getByLabel('Da questa data').fill('2030-01-07');
  await plan.getByRole('checkbox', { name: 'Lunedì', exact: true }).check();
  await layout(page);
  await plan.getByRole('button', { name: 'Confermo tutte le date mostrate' }).click();
  await expect(page.locator('#calendario')).toContainText('2030-01-07');
  await page.locator('#calendario').getByRole('button', { name: 'Avvia', exact: true }).click();
  await page.getByLabel('Serie 1, carico in kg', { exact: true }).fill('10,5');
  await page.getByLabel('Serie 1, ripetizioni', { exact: true }).fill('10');
  await page.getByLabel('Serie 1, RIR', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Salva Serie 1', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Salvata Serie 1', exact: true })).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.getByLabel('Serie 1, carico in kg', { exact: true })).toHaveValue('10.5');
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel('Serie 1, ripetizioni', { exact: true })).toHaveValue('10');
  await expect(page.getByLabel('Serie 1, RIR', { exact: true })).toHaveValue('0');
  await layout(page);
  for (const width of [320, 430, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await layout(page);
    for (const label of ['carico in kg', 'ripetizioni', 'RIR']) {
      const field = page.getByLabel(`Serie 1, ${label}`, { exact: true });
      const box = await field.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  }
  await page.setViewportSize(testInfo.project.use.viewport!);
  await page.screenshot({
    path: `output/playwright/design-diario-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: /Concludi/ }).click();
  await page.getByRole('button', { name: 'Confermo la conclusione' }).click();
  await expect(
    page
      .getByRole('region', { name: 'Notifica temporanea' })
      .getByText('Seduta conclusa. I risultati e i target originali sono conservati.'),
  ).toBeVisible();
  await page.goto('/programma');
  await expect(page.locator('#calendario')).toContainText('Conclusa');
  await layout(page);
  await page.screenshot({
    path: `output/playwright/calendario-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test('esercizio personale e attrezzi restano privati sul dispositivo, dialog accessibili', async ({
  page,
}) => {
  await page.goto('/libreria');
  await page.getByRole('button', { name: 'Crea il mio esercizio' }).click();
  const form = page.getByRole('dialog');
  await form.getByLabel('Nome', { exact: true }).fill('Variante QA');
  await form.getByLabel('Muscolo principale').fill('Quadricipiti');
  await form.getByLabel('Schema di movimento').fill('lower');
  await form.getByRole('button', { name: 'Salva il mio esercizio' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Mostra', exact: true }).selectOption('mine');
  await expect(page.getByRole('button', { name: /Variante QA/ })).toBeVisible();
  await page.getByRole('button', { name: 'Aggiungi un luogo' }).click();
  const gear = page.getByRole('dialog');
  await gear.getByLabel('Nome del luogo').fill('Casa QA');
  await gear.getByRole('button', { name: 'Aggiungi attrezzo' }).click();
  await gear.getByLabel('Categoria').selectOption('dumbbell');
  await gear
    .getByRole('combobox', { name: 'Convenzione', exact: true })
    .selectOption('per_dumbbell');
  await gear.getByLabel('Tagli in kg, separati da punto e virgola').fill('2,5; 5; 7,5');
  await layout(page);
  const audit = await new AxeBuilder({ page }).include('dialog[open]').analyze();
  expect(audit.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual(
    [],
  );
  await gear.getByRole('button', { name: 'Salva il profilo' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Casa QA/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: /Casa QA/ })).toBeVisible();
  await page.getByRole('combobox', { name: 'Mostra', exact: true }).selectOption('mine');
  await expect(page.getByRole('button', { name: /Variante QA/ })).toBeVisible();
  await layout(page);
});
