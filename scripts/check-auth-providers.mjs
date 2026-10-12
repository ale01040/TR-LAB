import assert from 'node:assert/strict';
import { URL } from 'node:url';

// RF-01, ADR-05/06/07, WEB-11/12: preflight pubblico, distinto da QA-AUTH-01.
const origin = 'https://tr-lab.vercel.app';
const provider = 'https://mxaogzjquvhwurngktyz.supabase.co';
const args = process.argv.slice(2);

try {
  assert.ok(
    args.every((arg) => arg === '--require-google'),
    'ARGUMENTS',
  );
  assert.equal(process.env.SUPABASE_URL, provider, 'PROJECT');
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  assert.ok(key?.startsWith('sb_publishable_'), 'PUBLISHABLE_KEY');

  const endpoints = [
    ['/api/health', origin],
    ['/api/ready', origin],
    ['/api/auth/session', origin],
    ['/auth/v1/settings', provider],
  ];
  const results = await Promise.all(
    endpoints.map(async ([path, base]) => {
      const response = await fetch(new URL(path, base), {
        // Nessun cookie; il rifiuto dei redirect impedisce l'inoltro della chiave.
        redirect: 'error',
        signal: globalThis.AbortSignal.timeout(15000),
        headers: base === provider ? { apikey: key } : {},
      });
      assert.equal(response.status, 200, 'HTTP');
      if (base === origin) assert.equal(response.headers.get('cache-control'), 'no-store', 'CACHE');
      return response.json();
    }),
  );
  const [health, ready, session, settings] = results;
  assert.equal(health.configured, true, 'APP');
  assert.equal(ready.ready, true, 'DATABASE');
  assert.equal(session.configured, true, 'SESSION');
  assert.equal(session.user, null, 'ANONYMOUS');
  assert.equal(settings.external?.email, true, 'EMAIL');
  assert.equal(settings.disable_signup, false, 'SIGNUP');
  assert.equal(settings.mailer_autoconfirm ?? settings.autoconfirm, false, 'CONFIRM_EMAIL');
  assert.equal(typeof settings.external?.google, 'boolean', 'GOOGLE_STATUS');

  // Solo esiti pubblici selezionati: niente corpo grezzo, token o identificativi utente.
  console.log(
    JSON.stringify({
      appReady: true,
      anonymousSession: true,
      signupEnabled: true,
      emailConfirmationRequired: true,
      googleProviderEnabled: settings.external.google,
      smtpDelivery: 'not_verified',
      googleLogin: 'not_verified',
    }),
  );
  if (args.includes('--require-google'))
    assert.equal(settings.external.google, true, 'GOOGLE_PENDING');
  console.log(
    'Preflight superato. Consegna email e login reale richiedono il collaudo della guida.',
  );
} catch (error) {
  // Anche un errore di rete/provider può contenere dati: non stampare il suo messaggio.
  const code =
    error instanceof assert.AssertionError
      ? error.message.split('\n', 1)[0]
      : 'NETWORK_OR_RESPONSE';
  console.error(`Preflight non superato (${code}). Consulta CONFIGURAZIONE_GMAIL_GOOGLE.md.`);
  process.exitCode = 1;
}
