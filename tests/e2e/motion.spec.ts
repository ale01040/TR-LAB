import { expect, test } from '@playwright/test';

async function sampleDialog(node: HTMLElement | SVGElement) {
  const input = node.querySelector('input')!;
  const frames: { x: number; y: number; gap: number; transform: string }[] = [];
  let previous = performance.now();
  for (let i = 0; i < 24; i++) {
    const now = await new Promise<number>((resolve) => requestAnimationFrame(resolve));
    const box = input.getBoundingClientRect();
    frames.push({
      x: box.x,
      y: box.y,
      gap: now - previous,
      transform: getComputedStyle(node).transform,
    });
    previous = now;
  }
  return frames;
}

test('pannelli: interruzione, chiusura nativa, focus e preferenza a pagina aperta', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/profilo');
  const summary = page.locator('summary').filter({ hasText: 'Stato di questa versione' });
  const panel = page.locator('details').filter({ has: summary });
  await summary.focus();
  await summary.press('Enter');
  await expect(panel).toHaveAttribute('open', '');
  const enhancement = await panel.evaluate((node) => ({
    supported:
      CSS.supports('selector(details::details-content)') &&
      CSS.supports('interpolate-size', 'allow-keywords') &&
      CSS.supports('transition-behavior', 'allow-discrete'),
    duration: getComputedStyle(node, '::details-content').transitionDuration,
  }));
  if (enhancement.supported) expect(enhancement.duration).toBe('0.22s, 0.22s');
  await expect(panel.getByText(/Schede manuali, import Excel/)).toBeVisible();
  // Tre cambi consecutivi, con layout effettivo tra gli stati: niente coda di exit.
  const closed = await panel.evaluate((node: HTMLDetailsElement) => {
    node.open = false;
    const summaryHeight = node.querySelector('summary')!.getBoundingClientRect().height;
    const height = node.getBoundingClientRect().height;
    node.open = true;
    void node.getBoundingClientRect();
    node.open = false;
    return { height, summaryHeight, finalHeight: node.getBoundingClientRect().height };
  });
  expect(closed.height).toBeCloseTo(closed.summaryHeight, 1);
  expect(closed.finalHeight).toBeCloseTo(closed.summaryHeight, 1);
  await expect(summary).toBeFocused();
  await summary.press('Enter');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await panel.evaluate((node) => getComputedStyle(node, '::details-content').transitionDuration),
  ).toBe('0s');
  expect(
    await panel
      .locator('p')
      .first()
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe('none');
  await expect(panel.getByText(/Questa alpha non/)).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await summary.press('Enter');
  // Fixture locale: un futuro link rende subito il pannello interattivo, quindi niente clipping.
  await panel.evaluate((node) => {
    const link = document.createElement('a');
    link.href = '#main-content';
    link.textContent = 'Collegamento QA sintetico';
    node.append(link);
  });
  await summary.press('Enter');
  await summary.press('Tab');
  const link = panel.getByRole('link', { name: 'Collegamento QA sintetico' });
  await expect(link).toBeFocused();
  await expect(link).toBeInViewport();
  expect(
    await panel.evaluate((node) => getComputedStyle(node, '::details-content').overflow),
  ).not.toBe('clip');
  await summary.focus();
  await summary.press('Enter');
  await expect(link).not.toBeVisible();
  await expect(summary).toBeFocused();
  await page.getByRole('button', { name: 'Riduci animazioni', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
  await summary.press('Enter');
  expect(
    await panel.evaluate((node) => getComputedStyle(node, '::details-content').transitionDuration),
  ).toBe('0s');
});

test('dialogo e navigazione: focus immediato, campi stabili, nessuna uscita trattenuta', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/libreria');
  await expect(page.getByRole('heading', { name: 'La tua libreria.' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const trigger = page.getByRole('button', { name: 'Crea il mio esercizio' });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((node) => getComputedStyle(node).animationDuration)).toBe('0.22s');
  expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  const samples = await dialog.evaluate(sampleDialog);
  expect(new Set(samples.map(({ x, y }) => `${x},${y}`)).size).toBe(1);
  expect(samples.every((frame) => frame.transform === 'none')).toBe(true);
  await dialog.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  // Riapertura e annullamento senza attendere la fine dell'ingresso.
  await trigger.click();
  await page.getByRole('dialog').press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect
    .poll(() => page.locator('h1').evaluate((node) => node.getAnimations().length))
    .toBe(0);
  await page.getByLabel('Cerca esercizio o muscolo').fill('panca');
  expect(await page.locator('h1').evaluate((node) => node.getAnimations().length)).toBe(0);
  const navigation = page.getByRole('navigation', {
    name: testInfo.project.name === 'mobile' ? 'Navigazione mobile' : 'Navigazione principale',
    exact: true,
  });
  await navigation.getByRole('link', { name: 'Profilo' }).click();
  await navigation.getByRole('link', { name: 'Libreria' }).click();
  await expect(page.getByRole('heading', { name: 'Il tuo spazio.' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'La tua libreria.' })).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await trigger.click();
  expect(
    await page.getByRole('dialog').evaluate((node) => getComputedStyle(node).animationName),
  ).toBe('none');
  const reducedSamples = await page.getByRole('dialog').evaluate(sampleDialog);
  expect(new Set(reducedSamples.map(({ x, y }) => `${x},${y}`)).size).toBe(1);
  await testInfo.attach('motion-frames', {
    body: JSON.stringify({
      viewport: testInfo.project.name,
      browser: page.context().browser()?.version(),
      checkedAt: new Date().toISOString(),
      samples,
      reducedSamples,
    }),
    contentType: 'application/json',
  });
  await page.getByRole('dialog').press('Escape');
  await expect(trigger).toBeFocused();
  expect(errors).toEqual([]);
});
