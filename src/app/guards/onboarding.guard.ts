import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { OnboardingService } from '../services/onboarding.service';

/** App areas (journey, care, records, child) unlock only after onboarding is complete. */
export const onboardingGuard: CanActivateFn = (_route, state) => {
  const api = inject(ApiService);
  const router = inject(Router);
  const onboarding = inject(OnboardingService);

  if (!api.currentUser()) {
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
  }
  return onboarding.onboarded() ? true : router.createUrlTree(['/onboarding']);
};
