import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, from, retry, switchMap, throwError, timer } from 'rxjs';
import { FirebaseAuthService } from '../services/firebase-auth.service';
import { ApiService } from '../services/api.service';
import { environment } from '../../environments/environment';

/** Cold-start handling: network failure (0) or gateway errors while the API container boots. */
const WAKE_RETRY_STATUSES = [0, 502, 503, 504];
const WAKE_RETRY_DELAYS_MS = [2000, 5000, 10000];
const WAKE_NOTICE_INTERVAL_MS = 5 * 60 * 1000;
let lastWakeNotice = 0;

/**
 * Per the AUTH CONTRACT: attaches "Authorization: Bearer <Firebase ID token>" to every
 * request to our own API (getIdToken() refreshes the token automatically when it's
 * close to expiry — no manual refresh logic needed here). Only touches calls to
 * environment.apiUrl; third-party requests (fonts, Firebase's own endpoints) pass through untouched.
 *
 * Handles the contract's three auth error codes centrally, then re-throws so each
 * caller's own error handling still runs —
 * this interceptor only ever adds side effects, never swallows the error itself.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const firebaseAuth = inject(FirebaseAuthService);
  const api = inject(ApiService);
  const router = inject(Router);

  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  // The API scales to zero when idle (Vercel container) and takes ~20–40s to boot. While it boots, Vercel's
  // error response has no CORS headers, so the browser reports status 0. Retry reads and the sign-in
  // registration (both safe to repeat) a few times instead of failing, and tell the user once that it's waking up.
  const canRetry = req.method === 'GET' || req.method === 'HEAD' || req.url.endsWith('/auth/firebase');

  return from(firebaseAuth.getIdToken()).pipe(
    switchMap(token => {
      const authedReq = token
        ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : req;
      const slow = setTimeout(() => {
        if (Date.now() - lastWakeNotice > WAKE_NOTICE_INTERVAL_MS) {
          lastWakeNotice = Date.now();
          api.showToast('Waking up our server. This can take up to 30 seconds the first time.');
        }
      }, 6000);
      return next(authedReq).pipe(
        retry({
          count: canRetry ? WAKE_RETRY_DELAYS_MS.length : 0,
          delay: (err: HttpErrorResponse, attempt: number) =>
            WAKE_RETRY_STATUSES.includes(err?.status) ? timer(WAKE_RETRY_DELAYS_MS[attempt - 1])
            // A container that is still starting can briefly answer 500; retry that once only, so real bugs still surface fast.
            : err?.status === 500 && attempt === 1 ? timer(3000)
            : throwError(() => err)
        }),
        finalize(() => clearTimeout(slow))
      );
    }),
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        firebaseAuth.logout().finally(() => {
          api.logout();
          router.navigate(['/auth/login'], { queryParams: { returnUrl: router.url } });
        });
      } else if (err.status === 403) {
        if (err.error?.code === 'EMAIL_NOT_VERIFIED') {
          router.navigate(['/auth/verify-email']);
        } else if (err.error?.code === 'CONSENT_REQUIRED') {
          // Optional consents (RECORDS_STORAGE on uploads, HEALTH_DATA on the health profile) are asked for by the page itself.
          const optional = ['RECORDS_STORAGE', 'HEALTH_DATA'];
          const pending: string[] = err.error?.pending ?? [];
          if (!pending.length || pending.some(t => !optional.includes(t))) {
            router.navigate(['/auth/consent'], { queryParams: { returnUrl: router.url } });
          }
        } else {
          api.showToast(err.error?.message || "You're not allowed to do that.");
        }
      }
      return throwError(() => err);
    })
  );
};
