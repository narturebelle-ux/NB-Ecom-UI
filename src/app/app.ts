import { Component, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { CartDrawerComponent } from './components/cart-drawer/cart-drawer.component';
import { FeatureDirective } from './directives/feature.directive';
import { ApiService } from './services/api.service';
import { InviteService } from './services/invite.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    NavbarComponent,
    FooterComponent,
    CartDrawerComponent,
    FeatureDirective,
    RouterLink
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  api = inject(ApiService);
  invite = inject(InviteService);

  constructor() {
    // Keep ?ref= from an invite link through sign-up, and attach her to the inviter once she's signed in and consented.
    this.invite.captureFromUrl();
    effect(() => {
      const user = this.api.currentUser();
      // Only once GET /me has confirmed no pending consents (the /auth/firebase user has no pendingConsents field yet).
      if (user && Array.isArray(user.pendingConsents) && user.pendingConsents.length === 0) this.invite.claimIfPending();
    });
  }
}
