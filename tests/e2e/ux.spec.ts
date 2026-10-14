import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('form account: validazione, risposta lenta, errore conservato e logout annullabile', async ({
  page,
}, testInfo) => {
  // Il provider è simulato soltanto sul server locale di test. Le sessioni cloud hanno prove separate.
  let signed = false;
  let attempts = 0;
  let release: (() => void) | undefined;
  let invalid = true;
  const epoch = '00000000-0000-4000-8000-00000000000e';
  const user = {
    id: '00000000-0000-4000-8000-00000000000a',
    email: 'synthetic@example.org',
    sessionId: '00000000-0000-4000-8000-00000000000b',
    csrf: 'synthetic-csrf',
    recovery: false,
  };
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({
      json: { configured: true, providers: { google: false }, user: signed ? user : null },
    }),
  );
  await page.route('**/api/auth/login', async (route) => {
    attempts++;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    if (invalid) await route.fulfill({ status: 401, json: { code: 'INVALID_CREDENTIALS' } });
    else {
      signed = true;
      await route.fulfill({ json: { message: 'Accesso completato.' } });
    }
  });
  await page.route('**/api/auth/logout', (route) => {
    signed = false;
    return route.fulfill({ json: { message: 'Uscita completata.' } });
  });
  await page.route('**/api/sync/bootstrap', (route) =>
    route.fulfill({ json: { sync_epoch: epoch, cursor: '0', protocol_version: 2 } }),
  );
  await page.route('**/api/sync/pull?**', (route) =>
    route.fulfill({ json: { sync_epoch: epoch, next_cursor: '0', has_more: false, events: [] } }),
  );
  await page.goto('/profilo');
  await expect(page.getByRole('form', { name: 'Accesso' })).toBeVisible();
  await page.getByRole('button', { name: 'Registrati', exact: true }).click();
  await page.getByLabel('Email (obbligatoria)', { exact: true }).fill('incompleta');
  await page.getByLabel('Password (obbligatoria)', { exact: true }).fill('synthetic-passphrase');
  await page
    .getByLabel('Ripeti la password (obbligatoria)', { exact: true })
    .fill('synthetic-other-passphrase');
  await page.getByRole('button', { name: 'Crea account', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Nessuna richiesta è stata inviata');
  await expect(page.getByLabel('Email (obbligatoria)', { exact: true })).toBeFocused();
  expect(attempts).toBe(0);
  const audit = await new AxeBuilder({ page }).analyze();
  expect(audit.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual(
    [],
  );
  await page.screenshot({
    path: `output/playwright/ux-validation-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Accedi', exact: true }).click();
  const form = page.getByRole('form', { name: 'Accesso' });
  await page.getByLabel('Email (obbligatoria)', { exact: true }).fill(user.email);
  const password = page.getByLabel('Password (obbligatoria)', { exact: true });
  await password.fill('synthetic-passphrase');
  await form.getByRole('button', { name: 'Mostra password' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await form.getByRole('button', { name: 'Nascondi password' }).click();
  await form.getByRole('button', { name: 'Accedi', exact: true }).click();
  await expect(
    form.getByRole('button', { name: 'Verifica dell’accesso…', exact: true }),
  ).toBeDisabled();
  await expect(password).toBeDisabled();
  await expect.poll(() => attempts).toBe(1);
  release!();
  await expect(page.getByRole('alert')).toContainText(
    'Non riesco ad accedere con questa email e password',
  );
  await expect(password).toHaveValue('synthetic-passphrase');
  invalid = false;
  await form.getByRole('button', { name: 'Accedi', exact: true }).click();
  await expect.poll(() => attempts).toBe(2);
  release!();
  await expect(page.getByText('Accesso verificato', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Notifica temporanea' })).toContainText(
    'Accesso verificato. Sei nel tuo account personale.',
  );
  await page.getByRole('button', { name: 'Esci da questo dispositivo' }).click();
  const dialog = page.getByRole('dialog', { name: 'Uscire da questo dispositivo?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Resta nel tuo account' }).click();
  await expect(page.getByText(user.email, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Esci da questo dispositivo' }).click();
  await dialog.getByRole('button', { name: 'Esci conservando i dati' }).click();
  await expect(page.getByRole('form', { name: 'Accesso' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Notifica temporanea' })).toContainText(
    'Uscita completata.',
  );
});

test('motion opzionale, filtri, guida offline e riscontro di una misura locale', async ({
  page,
  context,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/profilo');
  await expect(page.getByRole('heading', { name: 'Il tuo spazio.' })).toBeVisible();
  expect(
    await page.locator('h1').evaluate((node) => getComputedStyle(node).animationDuration),
  ).toBe('0.16s');
  await page.getByRole('button', { name: 'Riduci animazioni', exact: true }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
  expect(await page.locator('h1').evaluate((node) => getComputedStyle(node).animationName)).toBe(
    'none',
  );
  await page.getByRole('button', { name: 'Usa preferenza dispositivo' }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/libreria');
  await expect(page.getByRole('heading', { name: 'La tua libreria.' })).toBeVisible();
  expect(await page.locator('h1').evaluate((node) => getComputedStyle(node).animationName)).toBe(
    'none',
  );
  await page.getByLabel('Cerca esercizio o muscolo').fill('nessunrisultatoqa');
  await expect(page.getByText('0 esercizi trovati', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Azzera i filtri' }).click();
  await expect(page.getByLabel('Cerca esercizio o muscolo')).toHaveValue('');
  await page.goto('/progressi');
  await page.getByLabel('Valore (kg)').fill('72,5');
  await page.getByRole('button', { name: 'Salva misurazione' }).click();
  await expect(page.getByText('Misurazione salvata', { exact: true })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('72,5 kg');
  await page.screenshot({
    path: `output/playwright/ux-feedback-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByLabel('Valore (kg)').fill('73');
  await expect(page.getByText('Misurazione salvata', { exact: true })).toHaveCount(0);
  await page.goto('/aiuto');
  await page.getByLabel('Cerca nella guida').fill('impossibileqa');
  await expect(page.getByText(/Nessun argomento trovato/)).toBeVisible();
  await page.getByRole('button', { name: 'Mostra tutti gli argomenti' }).click();
  await page.getByLabel('Cerca nella guida').fill('passphraseqa');
  await page.getByRole('button', { name: 'Mostra tutti gli argomenti' }).click();
  const audit = await new AxeBuilder({ page }).analyze();
  expect(audit.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual(
    [],
  );
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Trova la risposta.' })).toBeVisible();
  await page.getByLabel('Cerca nella guida').fill('RIR');
  await expect(
    page.getByRole('heading', { name: 'Registrare una serie e capire il salvataggio' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
