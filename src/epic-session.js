// Epic account-session probe from the profile's cookies (#163).
//
// Epic keeps two separate logins in one profile:
//
//   store.epicgames.com  EPIC_EG1 (8h) + REFRESH_EPIC_EG1 (1y)
//                        drives the store header's `isloggedin` attribute
//   .epicgames.com       EPIC_SSO + EPIC_BEARER_TOKEN (8h), EPIC_SSO_RM (1y,
//                        "remember me") — the account session the Get /
//                        checkout flow actually needs
//
// The store refresh token outlives the account session, so a profile can
// show "logged in" in the header while every claim redirects to /id/login.
// That's the #162/#163/#164/#167/#168 "session lost mid-run" cluster:
// Sharpyku's failing profile had the store cookies but no EPIC_SSO /
// EPIC_SSO_RM, and a fresh cookie export that carried them claimed at once.
//
// EPIC_SSO alone is enough for one run but expires ~8h after login; only
// EPIC_SSO_RM lets Epic re-mint it, so a daily schedule needs RM.
//
// Zero local imports — sites.js and the runner both pull this in.

const ACCOUNT_URL = 'https://www.epicgames.com/';

// `cookies` is Playwright's context.cookies() shape: `expires` in epoch
// seconds, -1 for a session cookie (still live while it's in the jar).
export function epicAccountSession(cookies, nowMs = Date.now()) {
  const live = name => (cookies || []).find(c =>
    c.name === name
    && /(^|\.)epicgames\.com$/.test(String(c.domain || '').replace(/^\./, ''))
    && (c.expires == null || c.expires < 0 || c.expires * 1000 > nowMs));
  const sso = live('EPIC_SSO');
  const rm = live('EPIC_SSO_RM');
  return {
    ok: !!(sso || rm),
    remembered: !!rm,
    // When the session will die without RM to renew it (null = n/a).
    expiresAt: !rm && sso && sso.expires > 0 ? new Date(sso.expires * 1000) : null,
  };
}

export async function readEpicAccountSession(context) {
  return epicAccountSession(await context.cookies(ACCOUNT_URL));
}

export const EPIC_NO_ACCOUNT_SESSION = 'store shows logged in, but the Epic account session is gone (no EPIC_SSO / EPIC_SSO_RM cookie) — claims would redirect to the login page. Log out and back in, or import a fresh cookie export that includes the .epicgames.com cookies.';

export function epicNotRememberedWarning(expiresAt) {
  const when = expiresAt ? ` at ${expiresAt.toISOString().replace('T', ' ').slice(0, 16)} UTC` : '';
  return `Epic account session isn't remembered (no EPIC_SSO_RM cookie) and expires${when} — scheduled runs after that will fail. Log in again with "Remember me" ticked, or re-export cookies from a browser where it was.`;
}
