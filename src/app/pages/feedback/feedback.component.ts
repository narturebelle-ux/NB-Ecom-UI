import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { CareersService } from '../../services/careers.service';

/** "Share an idea": feedback for the team, emailed to admin@narturebelle.com by the API. */
@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule],
  template: `
    <div class="feedback-page">
      <div class="container narrow">
        <span class="kicker">We’re listening</span>
        <h1>Share an idea</h1>
        <p class="lead">We’re early, and the best ideas come from the mothers and families we serve. Tell us what would make NartureBelle better, what’s missing, or what didn’t work for you.</p>

        @if (sent()) {
          <div class="card done">
            <mat-icon>favorite</mat-icon>
            <h2>Thank you</h2>
            <p>Your idea has reached our team. Every message is read.</p>
            <div class="row">
              <button class="btn btn-outline btn-sm" (click)="reset()">Share another</button>
              <a routerLink="/" class="btn btn-link btn-sm">Back to home</a>
            </div>
          </div>
        } @else {
          <form class="card" (ngSubmit)="submit()" novalidate>
            <div class="field">
              <label for="message">Your idea or feedback <span class="req">*</span></label>
              <textarea id="message" name="message" class="form-control" rows="6" maxlength="3000" [(ngModel)]="message"
                        placeholder="e.g. It would help if I could…"></textarea>
              <span class="hint">{{ message.length }}/3000</span>
            </div>

            <fieldset class="field">
              <legend>How would you rate NartureBelle so far? <span class="opt">optional</span></legend>
              <div class="stars" role="radiogroup" aria-label="Rating">
                @for (n of [1, 2, 3, 4, 5]; track n) {
                  <button type="button" role="radio" [attr.aria-checked]="rating === n" [attr.aria-label]="n + ' out of 5'"
                          [class.on]="rating !== null && n <= rating" (click)="rating = rating === n ? null : n">★</button>
                }
              </div>
            </fieldset>

            <div class="grid">
              <div class="field">
                <label for="name">Name <span class="opt">optional</span></label>
                <input id="name" name="name" class="form-control" maxlength="120" [(ngModel)]="name" autocomplete="name" />
              </div>
              <div class="field">
                <label for="email">Email <span class="opt">optional, if you’d like a reply</span></label>
                <input id="email" name="email" type="email" class="form-control" [(ngModel)]="email" autocomplete="email" />
              </div>
            </div>
            <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" [(ngModel)]="website" />

            @if (error()) { <p class="error-msg">{{ error() }}</p> }
            <button type="submit" class="btn btn-primary" [disabled]="sending() || !message.trim()">{{ sending() ? 'Sending…' : 'Send to the team' }}</button>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`
    .feedback-page { padding: 3rem 0 5rem; }
    .narrow { max-width: 680px; }
    .kicker { font-size: 0.78rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--blush-700); }
    h1 { font-size: clamp(1.9rem, 4vw, 2.5rem); color: var(--sage-900); margin: 0.5rem 0; }
    .lead { color: var(--text-secondary); line-height: 1.6; margin-bottom: 1.5rem; }
    .card { border-radius: var(--radius-lg, 14px); background: #fff; border: 1px solid var(--border-light); padding: 1.4rem; }
    .field { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 1rem; border: none; padding: 0; }
    label, legend { font-size: 0.86rem; font-weight: 600; color: var(--sage-900); }
    .req { color: #a0281c; }
    .opt { font-weight: 400; color: var(--text-muted); font-size: 0.78rem; }
    .hint { font-size: 0.74rem; color: var(--text-muted); align-self: flex-end; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0 1rem; }
    .stars { display: flex; gap: 0.2rem; }
    .stars button { border: none; background: none; font-size: 1.7rem; line-height: 1; color: var(--border-light); cursor: pointer; padding: 0.1rem; }
    .stars button.on { color: #e0a526; }
    .hp { position: absolute; left: -10000px; width: 1px; height: 1px; opacity: 0; }
    .error-msg { color: #a0281c; font-size: 0.85rem; margin-bottom: 0.75rem; }
    .done { text-align: center; }
    .done mat-icon { color: var(--blush-700); font-size: 2.2rem; width: 2.2rem; height: 2.2rem; }
    .done h2 { color: var(--sage-900); }
    .done p { color: var(--text-secondary); margin: 0.4rem 0 1rem; }
    .row { display: flex; gap: 0.5rem; justify-content: center; }
  `]
})
export class FeedbackComponent {
  private careers = inject(CareersService);
  private api = inject(ApiService);

  message = '';
  rating: number | null = null;
  name = [this.api.currentUser()?.firstName, this.api.currentUser()?.lastName].filter(Boolean).join(' ');
  email = this.api.currentUser()?.email ?? '';
  website = '';
  sending = signal(false);
  sent = signal(false);
  error = signal<string | null>(null);

  submit() {
    const message = this.message.trim();
    if (!message) return;
    const email = this.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { this.error.set('That email address doesn’t look right.'); return; }
    this.sending.set(true);
    this.error.set(null);
    this.careers.sendFeedback({
      message, rating: this.rating, name: this.name.trim() || undefined, email: email || undefined,
      page: document.referrer || undefined, website: this.website
    }).subscribe({
      next: () => { this.sending.set(false); this.sent.set(true); },
      error: err => {
        this.sending.set(false);
        this.error.set(err?.status === 429 ? 'Too many messages. Please wait a few minutes.'
          : err?.status === 404 ? 'Feedback isn’t open on this server yet. Please email admin@narturebelle.com instead.'
          : 'We couldn’t send that. Please try again.');
      }
    });
  }

  reset() {
    this.message = '';
    this.rating = null;
    this.sent.set(false);
  }
}
