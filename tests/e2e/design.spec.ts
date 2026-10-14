import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function accessibleLayout(page: Page) {
  await expect(page.getByRole('banner')).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);
  await expect(page.locator('main img, main video, main canvas')).toHaveCount(0);
  const rasterBackgrounds = await page
    .locator('main *')
    .evaluateAll(
      (elements) =>
        elements.filter((element) => getComputedStyle(element).backgroundImage.includes('url('))
          .length,
    );
  expect(rasterBackgrounds).toBe(0);
  const audit = await new AxeBuilder({ page }).analyze();
  expect(audit.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual(
    [],
  );
}

test('temi persistenti, font locale, navigazione e reflow senza media decorativi', async ({
  page,
  context,
}, testInfo) => {
  const errors: string[] = [];
  const fontRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (request.resourceType() === 'font') fontRequests.push(request.url());
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Il lavoro di oggi.' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('16px InterVariable'))).toBe(true);
  expect(fontRequests.some((url) => new URL(url).pathname.endsWith('.woff2'))).toBe(true);
  expect(fontRequests.every((url) => new URL(url).origin === 'http://127.0.0.1:3007')).toBe(true);
  if (testInfo.project.name === 'mobile') {
    const cta = await page
      .getByRole('link', { name: 'Crea la prima scheda', exact: true })
      .boundingBox();
    const nav = await page.getByRole('navigation', { name: 'Navigazione mobile' }).boundingBox();
    expect(cta!.y + cta!.height).toBeLessThan(nav!.y);
  }

  for (const light of [false, true]) {
    if (light) {
      await page.goto('/profilo');
      await page.getByRole('button', { name: 'Chiaro', exact: true }).click();
      await page.reload();
      await expect(page.getByRole('button', { name: 'Scuro', exact: true })).toBeVisible();
    }
    await expect(page.locator('html')).toHaveAttribute('data-theme', light ? 'light' : 'dark');
    for (const [path, title] of [
      ['/', 'Il lavoro di oggi.'],
      ['/programma', 'Il tuo programma.'],
      ['/libreria', 'La tua libreria.'],
      ['/progressi', 'Leggi il tuo percorso.'],
      ['/profilo', 'Il tuo spazio.'],
    ]) {
      await page.goto(path!);
      await expect(page.getByRole('heading', { name: title!, exact: true })).toBeVisible();
      await accessibleLayout(page);
      if (path === '/' || path === '/libreria')
        await page.screenshot({
          path: `output/playwright/design-${light ? 'light' : 'dark'}-${path === '/' ? 'oggi' : 'libreria'}-${testInfo.project.name}.png`,
          fullPage: true,
        });
    }
  }
  // Un viewport stretto simula il reflow; non sostituisce lo zoom e i lettori di schermo reali.
  for (const width of [320, 430, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/programma');
    await expect(page.getByRole('heading', { name: 'Il tuo programma.' })).toBeVisible();
    await accessibleLayout(page);
  }
  await page.goto('/profilo');
  await page.getByRole('button', { name: 'Scuro', exact: true }).click();
  await page.goto('/');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await accessibleLayout(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Il lavoro di oggi.' })).toBeVisible();
  expect(await page.evaluate(() => document.fonts.check('16px InterVariable'))).toBe(true);
  await expect(page.getByText('Offline · dati sul dispositivo', { exact: true })).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  expect(
    await page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor),
  ).toBe('rgb(255, 255, 255)');
  await expect(page.getByRole('navigation', { name: 'Navigazione mobile' })).toBeHidden();
  expect(errors).toEqual([]);
});
