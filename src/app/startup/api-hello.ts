import { environment } from '../../environments/environment';

const HELLO_APIS = [
  { name: 'NB-Ecom-Mails-API', apiUrl: environment.mailsApiUrl },
  { name: 'NB-Ecom-Payments-API', apiUrl: environment.paymentsApiUrl }
];

/** Connection check: logs which API answered. It never blocks the app, and is skipped where no URL is set. */
export function logApiHellos() {
  for (const { name, apiUrl } of HELLO_APIS) {
    if (!apiUrl || apiUrl === environment.apiUrl) continue;
    const url = `${apiUrl}/hello`;
    fetch(url, { cache: 'no-store' })
      .then(res => res.ok ? res.json() : Promise.reject(new Error(`answered ${res.status}`)))
      .then(body => console.info(`[api-check] ${name} at ${url} says: ${body.message}`))
      .catch(err => console.warn(`[api-check] ${name} at ${url} did not answer: ${err.message}`));
  }
}
