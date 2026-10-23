// epicAccountSession — run with `node test/epic-session.js`.
// Cookie sets mirror a working profile (store + account cookies) and
// Sharpyku's failing one from #163 (store cookies only).
import { epicAccountSession } from '#src/epic-session.js';

const NOW = Date.UTC(2026, 9, 23, 12, 0);
const sec = ms => Math.floor(ms / 1000);
const HOUR = 3600 * 1000;
const c = (name, domain, expiresMs) => ({ name, domain, expires: expiresMs == null ? -1 : sec(expiresMs) });

const store = [
  c('EPIC_EG1', '.store.epicgames.com', NOW + 8 * HOUR),
  c('REFRESH_EPIC_EG1', '.store.epicgames.com', NOW + 365 * 24 * HOUR),
];
const sso = c('EPIC_SSO', '.epicgames.com', NOW + 8 * HOUR);
const ssoExpired = c('EPIC_SSO', '.epicgames.com', NOW - HOUR);
const rm = c('EPIC_SSO_RM', '.epicgames.com', NOW + 365 * 24 * HOUR);

const cases = [
  ['store cookies only (#163 failing profile)', store, { ok: false, remembered: false, expiresAt: null }],
  ['working profile mid-day (SSO + RM)', [...store, sso, rm], { ok: true, remembered: true, expiresAt: null }],
  ['working profile between runs (SSO expired, RM live)', [...store, ssoExpired, rm], { ok: true, remembered: true, expiresAt: null }],
  ['fresh login without remember-me', [...store, sso], { ok: true, remembered: false, expiresAt: new Date(sec(NOW + 8 * HOUR) * 1000).toISOString() }],
  ['not-remembered session after expiry', [...store, ssoExpired], { ok: false, remembered: false, expiresAt: null }],
  ['session cookie (expires -1) counts', [c('EPIC_SSO', '.epicgames.com', null)], { ok: true, remembered: false, expiresAt: null }],
  ['wrong domain ignored', [c('EPIC_SSO_RM', '.evil-epicgames.com', NOW + HOUR)], { ok: false, remembered: false, expiresAt: null }],
  ['empty / null input', null, { ok: false, remembered: false, expiresAt: null }],
];

let fails = 0;
for (const [label, cookies, expected] of cases) {
  const r = epicAccountSession(cookies, NOW);
  const got = { ok: r.ok, remembered: r.remembered, expiresAt: r.expiresAt && r.expiresAt.toISOString() };
  if (JSON.stringify(got) !== JSON.stringify(expected)) {
    console.error(`FAIL  ${label} → ${JSON.stringify(got)}, expected ${JSON.stringify(expected)}`);
    fails++;
  }
}

if (fails) {
  console.error(`${fails} failure(s)`);
  process.exit(1);
}
console.log(`epic-session: ${cases.length} cases pass`);
