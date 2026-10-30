import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ApiService } from '../services/api.service';
import { CommerceService } from '../services/commerce.service';
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
    api.showToast('This area is for NartureBelle™ care professionals.');
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

/** Members who have paid and used a session (admins too, to moderate). Everyone else: sign in first, then the next step with an explanation. */
export const paidMemberGuard: CanActivateFn = (_route, state) => {
  const api = inject(ApiService);
  const router = inject(Router);
  const commerce = inject(CommerceService);
  const user = api.currentUser();
  if (!user) return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
  if (isAdminUser(user)) return true;
  return commerce.loadEntitlements().pipe(
    map(() => {
      if (commerce.canShareIdeas()) return true;
      api.showToast('Share an Idea opens after your first session with a care plan.');
      return router.createUrlTree([commerce.hasActivePlan() ? '/care' : '/plans']);
    }),
    // A failed check says nothing about her plan, so don't send a paying member to Plans.
    catchError(() => {
      api.showToast("We couldn't check your plan just now. Please try again.");
      return of(router.createUrlTree(['/']));
    })
  );
};
