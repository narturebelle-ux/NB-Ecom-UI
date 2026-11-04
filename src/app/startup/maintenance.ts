import { environment } from '../../environments/environment';

/** The admin switch on the Care API (GET /features), set from /admin/site-status. */
const SWITCH = 'maintenanceMode';
const LAST_KNOWN_KEY = 'nb_maintenance';
const SWITCH_PAGE = '/admin/site-status';
const TIMEOUT_MS = 5000;
const SCREEN_RECHECK_MS = 20000;
const APP_RECHECK_MS = 60000;
const SCREEN_ID = 'nb-deployment-screen';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** True or false from the API, or null when it can't be reached, which happens mid-release. */
async function readSwitch(): Promise<boolean | null> {
  try {
    const res = await fetch(`${environment.apiUrl}/features`, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    const on = (await res.json())?.[SWITCH] === true;
    try {
      if (on) localStorage.setItem(LAST_KNOWN_KEY, 'on');
      else localStorage.removeItem(LAST_KNOWN_KEY);
    } catch { /* storage blocked: the API answer still counts */ }
    return on;
  } catch {
    return null;
  }
}

function lastKnownOn(): boolean {
  try { return localStorage.getItem(LAST_KNOWN_KEY) === 'on'; } catch { return false; }
}

/**
 * Admins skip the screen so they can still reach the switch, and so does the way in to it: the switch page and the
 * sign-in page that leads there. The API checks the admin role on every change, so this only decides what's shown.
 */
function exempt(): boolean {
  const { pathname, search } = location;
  if (pathname === SWITCH_PAGE) return true;
  if (pathname === '/auth/login' && new URLSearchParams(search).get('returnUrl') === SWITCH_PAGE) return true;
  try {
    const roles: unknown = JSON.parse(localStorage.getItem('nb_user') ?? 'null')?.roles;
    return Array.isArray(roles) && roles.some(r => typeof r === 'string' && r.endsWith('_ADMIN'));
  } catch {
    return false;
  }
}

function showDeploymentScreen() {
  if (document.getElementById(SCREEN_ID)) return;
  const screen = document.createElement('main');
  screen.id = SCREEN_ID;
  screen.setAttribute('role', 'status');
  screen.style.cssText = 'position:fixed;inset:0;z-index:10000;overflow:auto;display:flex;flex-direction:column;align-items:center;' +
    'justify-content:center;gap:0.75rem;padding:1.5rem;text-align:center;background:var(--bg-cream);';
  const logo = document.createElement('img');
  logo.src = 'favicon.svg';
  logo.alt = 'NartureBelle™ logo';
  logo.style.cssText = 'width:84px;height:84px;border-radius:50%;margin-bottom:0.5rem;';
  const heading = document.createElement('h1');
  heading.textContent = 'Something beautiful is on the way';
  heading.style.cssText = 'margin:0;font-size:clamp(1.8rem,5vw,2.6rem);line-height:1.2;color:var(--sage-900);';
  const note = document.createElement('p');
  note.textContent = 'Every new arrival deserves a little extra care, and so do you. We’re preparing new features for you and your little one.';
  note.style.cssText = 'margin:0;max-width:32rem;line-height:1.6;color:var(--text-secondary);';
  const reassurance = document.createElement('p');
  reassurance.textContent = 'Stay with us. This page will open by itself as soon as we’re ready.';
  reassurance.style.cssText = 'margin:0;max-width:32rem;font-size:0.9rem;line-height:1.6;color:var(--text-muted);';
  screen.append(logo, heading, note, reassurance);
  // A page that was already open keeps the app underneath, out of reach until the reload.
  for (const el of Array.from(document.body.children)) el.setAttribute('inert', '');
  document.body.prepend(screen);
}

/** Keeps the screen up until an admin turns the switch off, then reloads onto the released version. Never resolves. */
async function holdUntilSwitchedOff(): Promise<never> {
  console.info('[maintenance] The maintenance screen is on.');
  showDeploymentScreen();
  for (;;) {
    await sleep(SCREEN_RECHECK_MS);
    if (await readSwitch() === false) {
      console.info('[maintenance] The maintenance screen is off, reloading.');
      location.reload();
      await new Promise(() => {});
    }
  }
}

/** Checks every minute while the tab is visible, so a page that's already open switches over too. */
function watchSwitch() {
  const check = async () => {
    if (!document.hidden && !exempt() && await readSwitch()) await holdUntilSwitchedOff();
    setTimeout(check, APP_RECHECK_MS);
  };
  check();
}

/**
 * Resolves when the app may start, which is at once unless the switch was on at this visitor's last check. In that
 * case the screen stays up until the API says it's off, including while the API itself restarts during the release.
 */
export async function waitWhileClosed(): Promise<void> {
  if (!exempt() && lastKnownOn() && await readSwitch() !== false) await holdUntilSwitchedOff();
  watchSwitch();
}
