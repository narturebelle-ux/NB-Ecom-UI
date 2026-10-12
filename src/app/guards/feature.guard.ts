import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { FeatureToggleService } from '../services/feature-toggle.service';
import { FeatureFlags } from '../models/feature-toggle.model';

export function featureGuard(featureKey: keyof FeatureFlags): CanActivateFn {
  return () => {
    const featureService = inject(FeatureToggleService);
    const router = inject(Router);

    if (featureService.isEnabled(featureKey)) {
      return true;
    }

    // Redirect to home if feature flow is disabled
    return router.createUrlTree(['/']);
  };
}
