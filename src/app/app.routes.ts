import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { Month3Component } from './pages/month3/month3.component';
import { Month6Component } from './pages/month6/month6.component';
import { Month9Component } from './pages/month9/month9.component';
import { ChecklistsComponent } from './pages/checklists/checklists.component';
import { NurseCompanionComponent } from './pages/nurse-companion/nurse-companion.component';
import { DoctorsLiveComponent } from './pages/doctors-live/doctors-live.component';
import { LoginComponent } from './pages/login/login.component';
import { MyProfileComponent } from './pages/profile/profile.component';
import { VerifyEmailComponent } from './pages/verify-email/verify-email.component';
import { featureGuard } from './guards/feature.guard';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'NartureBelle™ | Radical Honesty in Maternal Care' },
  { path: 'products/month-3', component: Month3Component, title: 'Month 3 Products (1st Trimester) | NartureBelle' },
  { path: 'products/month-6', component: Month6Component, title: 'Month 6 Products (2nd Trimester) | NartureBelle' },
  { path: 'products/month-9', component: Month9Component, title: 'Month 9 Products (3rd Trimester) | NartureBelle' },
  { path: 'checklists', component: ChecklistsComponent, title: 'Prenatal Checkup Checklists & Scan Labs | NartureBelle' },
  { 
    path: 'services/nurse-companion', 
    component: NurseCompanionComponent, 
    title: 'Dedicated Nurse Care Companion | NartureBelle',
    canActivate: [featureGuard('nurseCompanion')]
  },
  { 
    path: 'doctors-live', 
    component: DoctorsLiveComponent, 
    title: 'OB-GYN Live Webinars & Q&As | NartureBelle',
    canActivate: [featureGuard('doctorLiveSessions')]
  },
  { path: 'auth/login', component: LoginComponent, title: 'Sign In | NartureBelle' },
  { path: 'auth/verify-email', component: VerifyEmailComponent, title: 'Verify Your Email | NartureBelle', canActivate: [authGuard] },
  { path: 'profile', component: MyProfileComponent, title: 'My Profile | NartureBelle', canActivate: [authGuard] },
  // No dedicated /cart, /checkout or /orders routes exist yet — cart is a navbar drawer,
  // not a routed page, and checkout/orders aren't built. verifiedGuard is ready to attach
  // to those routes (checkout, orders) once they exist.
  { path: '**', redirectTo: '' }
];

