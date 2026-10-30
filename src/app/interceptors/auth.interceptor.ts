import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { FirebaseAuthService } from '../services/firebase-auth.service';
import { ApiService } from '../services/api.service';
import { environment } from '../../environments/environment';

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

  return from(firebaseAuth.getIdToken()).pipe(
    switchMap(token => {
      const authedReq = token
        ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : req;
      return next(authedReq);
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
