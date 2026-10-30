import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ChecklistsComponent } from './pages/checklists/checklists.component';
import { NurseCompanionComponent } from './pages/nurse-companion/nurse-companion.component';
import { DoctorsLiveComponent } from './pages/doctors-live/doctors-live.component';
import { LoginComponent } from './pages/login/login.component';
import { VerifyEmailComponent } from './pages/verify-email/verify-email.component';
import { featureGuard } from './guards/feature.guard';
import { adminGuard, authGuard, providerGuard, reviewerGuard, verifiedGuard } from './guards/auth.guard';
import { onboardingGuard } from './guards/onboarding.guard';
import { landingGuard } from './guards/landing.guard';

export const routes: Routes = [
  // "Share an idea" is now the Idea pool; first match wins, so this takes over the old /feedback route below.
  { path: 'feedback', redirectTo: 'ideas', pathMatch: 'full' },
  // Public landing page for visitors; signed-in users are sent to My Journey (or onboarding).
  { path: '', component: HomeComponent, title: 'NartureBelle™ | Professional-Led Care, Pregnancy to Postpartum', canActivate: [landingGuard] },

  // The Month 3/6/9 store pages are retired (Phase 6): old links land on personalised recommendations.
  { path: 'products/:stage', redirectTo: 'recommendations' },

  { path: 'careers', title: 'Careers | NartureBelle', loadComponent: () => import('./pages/careers/careers.component').then(m => m.CareersComponent) },
  { path: 'careers/:id', title: 'Careers | NartureBelle', loadComponent: () => import('./pages/career-detail/career-detail.component').then(m => m.CareerDetailComponent) },
  { path: 'feedback', title: 'Share an Idea | NartureBelle', loadComponent: () => import('./pages/feedback/feedback.component').then(m => m.FeedbackComponent) },
  {
    path: 'admin/careers',
    title: 'Careers Admin | NartureBelle',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin-careers/admin-careers.component').then(m => m.AdminCareersComponent)
  },
  { path: 'about', title: 'About Us | NartureBelle', loadComponent: () => import('./pages/about/about.component').then(m => m.AboutComponent) },
  { path: 'checklists', component: ChecklistsComponent, title: 'Prenatal Checkup Checklists & Scan Labs | NartureBelle' },

  // Legacy lead-gen flows — hidden behind legacyLeadForms (off) per the roadmap's
  // care-coordination pivot; retired for real after Phase 1 per the roadmap table.
  {
    path: 'services/nurse-companion',
    component: NurseCompanionComponent,
    title: 'Dedicated Nurse Care Companion | NartureBelle',
    canActivate: [featureGuard('legacyLeadForms')]
  },
  {
    path: 'doctors-live',
    component: DoctorsLiveComponent,
    title: 'OB-GYN Live Webinars & Q&As | NartureBelle',
    canActivate: [featureGuard('legacyLeadForms')]
  },

  { path: 'auth/login', component: LoginComponent, title: 'Sign In | NartureBelle' },
  { path: 'auth/signup', component: LoginComponent, title: 'Create Your Account | NartureBelle', data: { mode: 'signup' } },
  { path: 'auth/verify-email', component: VerifyEmailComponent, title: 'Verify Your Email | NartureBelle', canActivate: [authGuard] },
  {
    path: 'auth/consent',
    title: 'Terms & Privacy | NartureBelle',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/consent/consent.component').then(m => m.ConsentComponent)
  },

  // Lazy-loaded feature areas (roadmap §0.1) — /care, /records, /child, /provider,
  // /admin slot in here the same way once their phases ship.
  {
    path: 'profile',
    title: 'Profile & Privacy | NartureBelle',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile/profile.component').then(m => m.MyProfileComponent)
  },
  {
    path: 'journey',
    title: 'My Journey | NartureBelle',
    canActivate: [onboardingGuard],
    loadComponent: () => import('./pages/journey/journey.component').then(m => m.JourneyComponent)
  },

  // Post-signup onboarding: details → recommended plan → payment → onboarding call →
  // signed documents. Journey, booking, records and child stay locked (onboardingGuard) until done.
  {
    path: 'onboarding',
    title: 'Welcome | NartureBelle',
    canActivate: [verifiedGuard],
    loadComponent: () => import('./pages/onboarding/onboarding.component').then(m => m.OnboardingComponent)
  },

  // Phase 2 — Plans, checkout & entitlements, real API (UI_INTEGRATION_GUIDE.md §8).
  {
    path: 'plans',
    title: 'Care Plans | NartureBelle',
    loadComponent: () => import('./pages/plans/plans.component').then(m => m.PlansComponent)
  },
  {
    path: 'checkout',
    title: 'Checkout | NartureBelle',
    canActivate: [verifiedGuard],
    loadComponent: () => import('./pages/checkout/checkout.component').then(m => m.CheckoutComponent)
  },
  {
    path: 'orders/:id',
    title: 'Order Confirmation | NartureBelle',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/order-confirmation/order-confirmation.component').then(m => m.OrderConfirmationComponent)
  },

  // Phase 3 — Providers, booking & sessions, real API (UI_INTEGRATION_GUIDE.md §9). The
  // directory is public; booking and the bookings list both require a verified user.
  {
    path: 'care/bookings',
    title: 'My Bookings | NartureBelle',
    canActivate: [verifiedGuard, onboardingGuard],
    loadComponent: () => import('./pages/bookings/bookings.component').then(m => m.BookingsComponent)
  },
  {
    path: 'care/:id',
    title: 'Provider Profile | NartureBelle',
    canActivate: [verifiedGuard, onboardingGuard],
    loadComponent: () => import('./pages/provider-profile/provider-profile.component').then(m => m.ProviderProfileComponent)
  },
  {
    path: 'care',
    title: 'Find Your Care Team | NartureBelle',
    loadComponent: () => import('./pages/care-directory/care-directory.component').then(m => m.CareDirectoryComponent)
  },

  // Phase 4 — Records vault & sharing, real API (UI_INTEGRATION_GUIDE.md §10).
  {
    path: 'records/access-log',
    title: 'Access History | NartureBelle',
    canActivate: [onboardingGuard],
    loadComponent: () => import('./pages/records-access-log/records-access-log.component').then(m => m.RecordsAccessLogComponent)
  },
  {
    path: 'records',
    title: 'Records Vault | NartureBelle',
    canActivate: [onboardingGuard],
    loadComponent: () => import('./pages/records/records.component').then(m => m.RecordsComponent)
  },

  // Phase 6 — P1 expansion, against the API's planned contract (see API_Integration.md §23).
  // Each area sits behind its own feature flag, which the product owner flips once it's live.
  {
    path: 'child',
    title: 'Child & Vaccination Tracker | NartureBelle',
    canActivate: [featureGuard('childTracker'), onboardingGuard],
    loadComponent: () => import('./pages/child/child.component').then(m => m.ChildComponent)
  },
  {
    path: 'recommendations',
    title: 'Recommended for You | NartureBelle',
    canActivate: [featureGuard('productRecommendations'), onboardingGuard],
    loadComponent: () => import('./pages/recommendations/recommendations.component').then(m => m.RecommendationsComponent)
  },
  {
    path: 'joy-circle',
    title: 'Joy Circle | NartureBelle',
    canActivate: [featureGuard('joyCircle'), onboardingGuard],
    loadComponent: () => import('./pages/joy-circle/joy-circle.component').then(m => m.JoyCircleComponent)
  },

  // Professional portal: sessions, in-session product recommendations (Essential / Optional).
  {
    path: 'provider/sessions/:id',
    title: 'Session | NartureBelle',
    canActivate: [providerGuard],
    loadComponent: () => import('./pages/provider-session/provider-session.component').then(m => m.ProviderSessionComponent)
  },
  {
    path: 'provider',
    title: 'Your Sessions | NartureBelle',
    canActivate: [providerGuard],
    loadComponent: () => import('./pages/provider-sessions/provider-sessions.component').then(m => m.ProviderSessionsComponent)
  },
  // Clinical review of product health rules (Part D).
  {
    path: 'review/health-rules',
    title: 'Health Rule Review | NartureBelle',
    canActivate: [reviewerGuard],
    loadComponent: () => import('./pages/health-rule-review/health-rule-review.component').then(m => m.HealthRuleReviewComponent)
  },

  // Idea pool & Idea Impact (public; posting/voting need sign-in). /ideas/:id is the share target.
  { path: 'ideas', title: 'Idea Pool | NartureBelle™', loadComponent: () => import('./pages/ideas/ideas.component').then(m => m.IdeasComponent) },
  { path: 'ideas/:id', title: 'An Idea for Moms | NartureBelle™', loadComponent: () => import('./pages/idea-detail/idea-detail.component').then(m => m.IdeaDetailComponent) },
  {
    path: 'admin/ideas',
    title: 'Ideas Admin | NartureBelle™',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin-ideas/admin-ideas.component').then(m => m.AdminIdeasComponent)
  },

  // No dedicated /cart route exists yet — cart is a navbar drawer, not a routed page.
  { path: '**', redirectTo: '' }
];

