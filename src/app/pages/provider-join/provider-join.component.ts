import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { PROFESSION_LABELS, ProfessionRole } from '../../models/provider-application.models';
import { PROVIDER_PAGE_STYLES } from '../provider-shared/provider-page.styles';

/** Public entry point for care professionals. Sign-up itself is the existing login page, returning to the application. */
@Component({
  selector: 'app-provider-join',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="provider-page">
      <div class="container narrow">
        <header class="page-header animate-in">
          <span class="kicker">For care professionals</span>
          <h1>Join as a professional</h1>
          <p>Offer stage-aware care to mothers and children through NartureBelle™. Apply online, and our team will verify your details.</p>
        </header>

        <div class="ob-card glass animate-in">
          <h2>How it works</h2>
          <p class="sub">One application for every profession. The questions adapt to your answers, and your progress is saved as you go.</p>
          <ol class="how">
            @for (s of steps; track s.title; let i = $index) {
              <li>
                <span class="step-dot">{{ i + 1 }}</span>
                <span><strong>{{ s.title }}</strong><small>{{ s.text }}</small></span>
              </li>
            }
          </ol>

          <div class="why-box">
            <strong><mat-icon class="icon-sm">badge</mat-icon> We welcome</strong>
            {{ professions.join(' · ') }}
          </div>
          <p class="muted">Keep your registration certificate, degrees, PAN and a photo ID handy. Files can be PDF, JPG or PNG, up to 4 MB each.</p>
          <p class="muted">A professional account is separate from a member account, so please apply with an email you don't use as a member.</p>

          <div class="actions center">
            <a class="btn btn-primary" [routerLink]="signedIn() ? '/provider/apply' : '/auth/login'" [queryParams]="signedIn() ? {} : { returnUrl: '/provider/apply' }">
              Start your application <mat-icon class="icon-sm">arrow_forward</mat-icon>
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [PROVIDER_PAGE_STYLES, `
    .how { list-style: none; padding: 0; margin: 0 0 1.5rem; display: flex; flex-direction: column; gap: 0.9rem; }
    .how li { display: flex; align-items: center; gap: 0.85rem; }
    .how span:last-child { display: flex; flex-direction: column; }
    .how strong { color: var(--sage-900); font-size: 0.92rem; }
    .how small { color: var(--text-muted); font-size: 0.8rem; }
    .step-dot { flex-shrink: 0; }
  `]
})
export class ProviderJoinComponent {
  private api = inject(ApiService);

  signedIn = computed(() => !!this.api.currentUser());
  professions = (Object.keys(PROFESSION_LABELS) as ProfessionRole[]).map(p => PROFESSION_LABELS[p]);
  steps = [
    { title: 'Apply', text: 'Sign up with a verified email and phone, then fill in your application.' },
    { title: 'We check', text: 'Operations checks your identity and licence, with a short video call.' },
    { title: 'We approve', text: 'A Medical Reviewer gives the final decision.' },
    { title: 'Set up', text: 'Sign your agreement, add payment details, finish training, and add your availability.' },
    { title: 'Go live', text: 'Mothers can now see and book you.' }
  ];
}
