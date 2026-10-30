import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { isVerifiedUser, isAdminUser, isProfessionalUser, isReviewerUser } from '../models/maternal.models';

/** Requires any signed-in user. Redirects to login with a returnUrl otherwise. */
export const authGuard: CanActivateFn = (_route, state) => {
  const api = inject(ApiService);
  const router = inject(Router);

  if (api.currentUser()) {
    return true;
  }
  return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};

/** Requires a signed-in AND verified user (update profile, checkout, orders). */
export const verifiedGuard: CanActivateFn = (route, state) => {
  const api = inject(ApiService);
  const router = inject(Router);

  const user = api.currentUser();
  if (!user) {
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
  }
  if (!isVerifiedUser(user)) {
    return router.createUrlTree(['/auth/verify-email']);
  }
  return true;
};

/** Requires a signed-in user with the ADMIN role. */
export const adminGuard: CanActivateFn = (_route, state) => {
  const api = inject(ApiService);
  const router = inject(Router);

  const user = api.currentUser();
  if (!user) {
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
  }
  if (!isAdminUser(user)) {
    api.showToast('You are not allowed to access that page.');
    return router.createUrlTree(['/']);
  }
  return true;
};

/** Provider portal: a signed-in verified care professional (their role is granted when an admin verifies them). */
export const providerGuard: CanActivateFn = (_route, state) => {
  const api = inject(ApiService);
  const router = inject(Router);
  const user = api.currentUser();
  if (!user) return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
  if (!isProfessionalUser(user)) {
    api.showToast('This area is for NartureBelle care professionals.');
    return router.createUrlTree(['/']);
  }
  return true;
};

/** Health-rule review: MEDICAL_REVIEWER staff or a care professional (the API also checks the provider is VERIFIED/ACTIVE). */
export const reviewerGuard: CanActivateFn = (_route, state) => {
  const api = inject(ApiService);
  const router = inject(Router);
  const user = api.currentUser();
  if (!user) return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
  if (!isReviewerUser(user)) {
    api.showToast('Only medical reviewers and verified professionals can review rules.');
    return router.createUrlTree(['/']);
  }
  return true;
};
