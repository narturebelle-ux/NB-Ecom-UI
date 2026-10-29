import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { ApiService } from '../services/api.service';
import { OnboardingService } from '../services/onboarding.service';

/**
 * The public landing page is for visitors. Signed-in users go to their own home instead:
 * My Journey once onboarded, otherwise back into onboarding.
 */
export const landingGuard: CanActivateFn = () => {
  const api = inject(ApiService);
  const router = inject(Router);
  const onboarding = inject(OnboardingService);

  if (!api.currentUser()) return true;
  return onboarding.ensureSynced().pipe(
    map(() => router.createUrlTree([onboarding.onboarded() ? '/journey' : '/onboarding']))
  );
};
