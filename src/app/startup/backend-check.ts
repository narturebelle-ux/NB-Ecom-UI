import { environment } from '../../environments/environment';

const BACKENDS = [
  { name: 'NB-Ecomm-API', apiUrl: environment.apiUrl }
];
const TIMEOUT_MS = 8000;
const RETRY_MS = 10000;
const SCREEN_ID = 'nb-deployment-screen';

/** Null when the API's public health check passes, otherwise what went wrong. */
async function healthProblem(apiUrl: string): Promise<string | null> {
  const url = `${apiUrl.replace(/\/api\/v1\/?$/, '')}/health/db`;
  try {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
    return res.ok ? null : `${url} answered ${res.status}`;
  } catch (err) {
    return `${url} did not answer (${err instanceof Error ? err.name : err})`;
  }
}

function showDeploymentScreen() {
  if (document.getElementById(SCREEN_ID)) return;
  const screen = document.createElement('main');
  screen.id = SCREEN_ID;
  screen.setAttribute('role', 'status');
  screen.style.cssText = 'min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.75rem;' +
    'padding:1.5rem;text-align:center;background:var(--bg-cream);';
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
  document.body.prepend(screen);
}

/**
 * Resolves once the API is up, so the app never starts against a missing one. Until then the visitor
 * sees the deployment screen, the console says what failed, and the check repeats by itself.
 */
export async function waitForBackends(): Promise<void> {
  const lastProblem = new Map<string, string | null>();
  for (;;) {
    const problems = await Promise.all(BACKENDS.map(b => healthProblem(b.apiUrl)));
    BACKENDS.forEach((b, i) => {
      const problem = problems[i];
      if (problem && problem !== lastProblem.get(b.name)) console.error(`[startup] ${b.name} is down: ${problem}`);
      if (!problem && lastProblem.get(b.name)) console.info(`[startup] ${b.name} is back up.`);
      lastProblem.set(b.name, problem);
    });
    if (problems.every(p => !p)) {
      document.getElementById(SCREEN_ID)?.remove();
      return;
    }
    showDeploymentScreen();
    await new Promise(resolve => setTimeout(resolve, RETRY_MS));
  }
}
