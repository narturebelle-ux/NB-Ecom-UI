import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { PROFESSION_LABELS, ProfessionRole } from '../../models/provider-application.models';

/** Public entry point for care professionals. Sign-up itself is the existing login page, returning to the application. */
@Component({
  selector: 'app-provider-join',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="join-page">
      <section class="hero">
        <div class="container narrow">
          <span class="kicker">For care professionals</span>
          <h1>Care for mothers, on a schedule you set.</h1>
          <p class="lead">NartureBelle™ connects verified professionals with mothers and young families, from pregnancy through postpartum and early childhood.</p>
          <div class="actions">
            <a class="btn btn-primary btn-lg" [routerLink]="applyLink()" [queryParams]="applyParams()">
              Join us <mat-icon class="icon-sm">arrow_forward</mat-icon>
            </a>
            <a class="btn btn-outline btn-lg" routerLink="/provider/join" fragment="how">See our process</a>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <header class="section-head">
            <h2>Why join NartureBelle™</h2>
            <p>Your expertise reaches mothers when they need it, and we look after the arrangements around each session.</p>
          </header>
          <div class="benefits">
            @for (b of benefits; track b.title) {
              <article class="benefit">
                <mat-icon class="benefit-icon">{{ b.icon }}</mat-icon>
                <h3>{{ b.title }}</h3>
                <p>{{ b.text }}</p>
              </article>
            }
          </div>
        </div>
      </section>

      <section class="section alt">
        <div class="container narrow center">
          <h2>Who can apply</h2>
          <p class="section-note">One application for every profession. The questions adapt to your profession and your answers.</p>
          <div class="chips">
            @for (p of professions; track p) { <span class="chip">{{ p }}</span> }
          </div>
        </div>
      </section>

      <section class="section" id="how">
        <div class="container narrow">
          <header class="section-head">
            <h2>Our process</h2>
            <p>Your progress is saved as you go, so you don't have to finish in one sitting.</p>
          </header>
          <ol class="how">
            @for (s of steps; track s.title; let i = $index) {
              <li>
                <span class="step-number">{{ i + 1 }}</span>
                <span class="step-text"><strong>{{ s.title }}</strong><small>{{ s.text }}</small></span>
              </li>
            }
          </ol>
          <div class="needs">
            <h3><mat-icon class="icon-sm">checklist</mat-icon> What to keep handy</h3>
            <p>Your registration certificate, degrees, PAN and a photo ID. Files can be PDF, JPG or PNG, up to 4 MB each.</p>
          </div>
        </div>
      </section>

      <section class="section alt">
        <div class="container narrow">
          <header class="section-head"><h2>Common questions</h2></header>
          @for (f of faqs; track f.q) {
            <details class="faq">
              <summary>{{ f.q }}</summary>
              <p>{{ f.a }}</p>
            </details>
          }
        </div>
      </section>

      <section class="cta-band">
        <div class="container narrow">
          <h2>Ready to care with us?</h2>
          <p>Join us to start your application, and our team will verify your details.</p>
          <a class="btn btn-light btn-lg" [routerLink]="applyLink()" [queryParams]="applyParams()">
            Join us <mat-icon class="icon-sm">arrow_forward</mat-icon>
          </a>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .narrow { max-width: 780px; }
    .center { text-align: center; }
    .hero { padding: 4.5rem 0 3.5rem; text-align: center; background: radial-gradient(circle at 20% 10%, var(--sage-100), transparent 55%), radial-gradient(circle at 80% 30%, var(--gold-100), transparent 55%); }
    .kicker { font-size: 0.78rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold-700); }
    .hero h1 { font-size: clamp(2.1rem, 5.5vw, 3.2rem); line-height: 1.12; color: var(--sage-900); margin: 0.7rem 0 1rem; }
    .lead { font-size: 1.08rem; line-height: 1.6; color: var(--text-secondary); max-width: 620px; margin: 0 auto 1.75rem; }
    .actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }

    .section { padding: 3.5rem 0; scroll-margin-top: 96px; }
    .section.alt { background: var(--bg-alt); }
    .section h2 { font-size: clamp(1.6rem, 3.5vw, 2.1rem); color: var(--sage-900); margin: 0 0 0.5rem; }
    .section-head { text-align: center; margin-bottom: 2rem; }
    .section-head p, .section-note { color: var(--text-secondary); line-height: 1.6; max-width: 600px; margin: 0 auto; }

    .benefits { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.1rem; }
    @media (max-width: 900px) { .benefits { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 600px) { .benefits { grid-template-columns: 1fr; } }
    .benefit { background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 20px; padding: 1.5rem; }
    .benefit-icon { width: 44px; height: 44px; font-size: 24px; display: grid; place-items: center; border-radius: 12px; background: var(--sage-100); color: var(--sage-700); margin-bottom: 0.85rem; }
    .benefit h3 { font-size: 1.08rem; color: var(--sage-900); margin: 0 0 0.4rem; }
    .benefit p { font-size: 0.92rem; line-height: 1.55; color: var(--text-secondary); margin: 0; }

    .chips { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; margin-top: 1.25rem; }
    .chip { background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 999px; padding: 0.45rem 1rem; font-size: 0.88rem; font-weight: 600; color: var(--sage-900); }

    .how { list-style: none; padding: 0; margin: 0 0 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .how li { display: flex; align-items: center; gap: 1rem; background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 16px; padding: 1rem 1.2rem; }
    .step-number { flex-shrink: 0; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: var(--solid-sage-700); color: #fff; font-weight: 800; }
    .step-text { display: flex; flex-direction: column; gap: 0.15rem; }
    .step-text strong { color: var(--sage-900); }
    .step-text small { font-size: 0.86rem; line-height: 1.45; color: var(--text-secondary); }
    .needs { background: var(--gold-100); border-radius: 16px; padding: 1.1rem 1.3rem; }
    .needs h3 { display: flex; align-items: center; gap: 0.4rem; font-size: 1rem; color: var(--gold-700); margin: 0 0 0.35rem; }
    .needs p { font-size: 0.9rem; line-height: 1.5; color: var(--text-secondary); margin: 0; }

    .faq { background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 14px; padding: 1rem 1.2rem; margin-bottom: 0.7rem; }
    .faq summary { font-weight: 700; color: var(--sage-900); cursor: pointer; }
    .faq p { font-size: 0.92rem; line-height: 1.55; color: var(--text-secondary); margin: 0.6rem 0 0; }

    .cta-band { background: var(--solid-sage-900); padding: 3.5rem 0; text-align: center; }
    .cta-band h2 { font-size: clamp(1.6rem, 3.5vw, 2.1rem); color: #fff; margin: 0 0 0.5rem; }
    .cta-band p { color: rgba(255, 255, 255, 0.85); margin: 0 0 1.5rem; }
    .btn-light { background: #fff; color: var(--solid-sage-900); border-color: #fff; }
    .btn-light:hover { background: #f1f1f1; color: var(--solid-sage-900); }
    @media (max-width: 480px) {
      .hero { padding: 3rem 0 2.5rem; }
      .section { padding: 2.5rem 0; }
      .actions .btn { width: 100%; justify-content: center; }
    }
  `]
})
export class ProviderJoinComponent {
  private api = inject(ApiService);

  signedIn = computed(() => !!this.api.currentUser());
  applyLink = computed(() => this.signedIn() ? '/provider/apply' : '/auth/signup');
  applyParams = computed(() => this.signedIn() ? {} : { returnUrl: '/provider/apply' });
  professions = (Object.keys(PROFESSION_LABELS) as ProfessionRole[]).map(p => PROFESSION_LABELS[p]);
  benefits = [
    { icon: 'event_available', title: 'Set your own availability', text: 'Add your services and open your own slots. Mothers book only the times you offer.' },
    { icon: 'videocam', title: 'Consult online', text: 'Sessions are virtual by default, so you aren’t tied to one location.' },
    { icon: 'payments', title: 'Paid per completed session', text: 'We handle booking and collecting payment. Your fixed fee is in your agreement, and your dashboard tracks what you’ve earned.' },
    { icon: 'folder_shared', title: 'Start with context', text: 'A mother can choose to share her records with you for a session, so you don’t begin from scratch.' },
    { icon: 'verified', title: 'Recognition for your credentials', text: 'Your registration details and confirmed experience appear on your profile, so mothers know they’re seeing a verified professional.' },
    { icon: 'balance', title: 'Clinical judgement comes first', text: 'We don’t pay commissions for generating medically unnecessary appointments.' }
  ];
  steps = [
    { title: 'Apply', text: 'Sign up with a verified email and phone, then fill in your application.' },
    { title: 'We check', text: 'Operations checks your identity and licence, with a short video call.' },
    { title: 'We approve', text: 'A Medical Reviewer gives the final decision.' },
    { title: 'Set up', text: 'Sign your agreement, add payment details, finish training, and add your availability.' },
    { title: 'Go live', text: 'Mothers can now see and book you.' }
  ];
  faqs = [
    { q: 'How much will I earn?', a: 'You’re paid a fixed fee for each completed session. The fee is shown in your agreement, so you’ll see it before you sign.' },
    { q: 'Does applying mean I’m approved?', a: 'No. Our team checks your details and documents first. Only approved professionals who finish setup can take sessions.' },
    { q: 'Do I need a current registration?', a: 'The application asks about the registration or certification for your profession, and we check your details with official registers.' },
    { q: 'Can I use my member account?', a: 'A professional account is separate from a member account, so please apply with an email you don’t use as a member.' },
    { q: 'What do mothers see about me?', a: 'Once you’re live, mothers can see your profile, including your registration number, council and confirmed experience.' }
  ];
}
