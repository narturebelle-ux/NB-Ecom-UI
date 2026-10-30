import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { isProfessionalUser } from '../models/maternal.models';

/**
 * Shared landing logic for the moment a user becomes signed-in-and-verified — used by both
 * login.component.ts (Google/Phone, verified immediately) and verify-email.component.ts
 * (email/password, verified after clicking the email link). Per roadmap §1 UI: sign-up stays
 * minimal and always routes through the terms/privacy consent screen before anywhere else;
 * journey setup happens on /journey itself, not here.
 *
 * Re-fetches GET /me rather than trusting the cached user object, since `pendingConsents` is
 * only ever returned by /me, never by /auth/firebase.
 */
export function goToPostAuthDestination(api: ApiService, router: Router, returnUrl?: string | null) {
  api.getMe().subscribe({
    next: (me) => {
      api.setUser(me);
      if (me.pendingConsents && me.pendingConsents.length > 0) {
        router.navigate(['/auth/consent'], { queryParams: returnUrl ? { returnUrl } : {} });
      } else {
        // Care professionals use the provider portal, not the mother's onboarding/journey.
        router.navigateByUrl(returnUrl || (isProfessionalUser(me) ? '/provider' : '/journey'));
      }
    },
    error: () => {
      // 401/403 side effects are already handled by the auth interceptor; otherwise fall
      // back to the safest destination rather than leaving the user stuck on this page.
      router.navigateByUrl(returnUrl || '/journey');
    }
  });
}
