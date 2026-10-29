import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { Month3Component } from './pages/month3/month3.component';
import { Month6Component } from './pages/month6/month6.component';
import { Month9Component } from './pages/month9/month9.component';
import { ChecklistsComponent } from './pages/checklists/checklists.component';
import { NurseCompanionComponent } from './pages/nurse-companion/nurse-companion.component';
import { DoctorsLiveComponent } from './pages/doctors-live/doctors-live.component';
import { LoginComponent } from './pages/login/login.component';
import { VerifyEmailComponent } from './pages/verify-email/verify-email.component';
import { featureGuard } from './guards/feature.guard';
import { authGuard, verifiedGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'NartureBelle™ | Professional-Led Care, Pregnancy to Postpartum' },

  // Store pages — hidden behind productRecommendations (off) until roadmap Phase 6,
  // when they become personalised recommendations rather than a standalone shop.
  // Hidden, not deleted: featureGuard redirects home while the flag is off.
  { path: 'products/month-3', component: Month3Component, title: 'Month 3 Products (1st Trimester) | NartureBelle', canActivate: [featureGuard('productRecommendations')] },
  { path: 'products/month-6', component: Month6Component, title: 'Month 6 Products (2nd Trimester) | NartureBelle', canActivate: [featureGuard('productRecommendations')] },
  { path: 'products/month-9', component: Month9Component, title: 'Month 9 Products (3rd Trimester) | NartureBelle', canActivate: [featureGuard('productRecommendations')] },

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
    canActivate: [authGuard],
    loadComponent: () => import('./pages/journey/journey.component').then(m => m.JourneyComponent)
  },

  // Phase 2 — Plans, checkout & entitlements. Implemented client-side against a
  // self-authored mock contract (CommerceService) since the API hasn't shipped
  // Plan/Order/Payment endpoints yet — see API_Integration.md §13/14.
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

  // No dedicated /cart route exists yet — cart is a navbar drawer, not a routed page.
  { path: '**', redirectTo: '' }
];

