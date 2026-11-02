import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProviderApplicationService } from '../../services/provider-application.service';
import { Earnings } from '../../models/provider-application.models';
import { PROVIDER_PAGE_STYLES } from '../provider-shared/provider-page.styles';

/** Fixed-fee earnings from completed sessions. Bank payments are a later phase, and the page says so. */
@Component({
  selector: 'app-provider-earnings',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="provider-page">
      <div class="container narrow">
        <header class="page-header animate-in">
          <span class="kicker">Your practice</span>
          <h1>Earnings</h1>
          <p>Your fixed fee for each completed session.</p>
        </header>

        @if (loading()) {
          <div class="panel glass"><div class="skeleton" style="height: 120px"></div></div>
        } @else if (errorMsg()) {
          <div class="panel glass">
            <p class="muted">{{ errorMsg() }}</p>
            <div class="actions"><button class="btn btn-outline" (click)="load()">Try again</button></div>
          </div>
        } @else if (earnings(); as e) {
          @if (e.feeIsDraft) { <div class="proto"><mat-icon class="icon-sm">edit_note</mat-icon> The fee shown is a placeholder until the final fees are confirmed.</div> }
          <div class="why-box"><strong><mat-icon class="icon-sm">info</mat-icon> Bank payments are coming later</strong> Your earnings are recorded here, and bank transfers will start in a later phase.</div>

          <section class="summary">
            <div class="panel glass"><span class="label">Total earned</span><strong class="big">₹{{ e.totalEarned | number:'1.0-0' }}</strong></div>
            <div class="panel glass"><span class="label">Completed sessions</span><strong class="big">{{ e.completedSessions }}</strong></div>
            <div class="panel glass"><span class="label">Fee per session</span><strong class="big">₹{{ e.feePerSession | number:'1.0-0' }}</strong></div>
          </section>

          <section class="panel glass">
            <div class="panel-head"><h3><mat-icon>receipt_long</mat-icon> Sessions</h3></div>
            @for (item of e.items; track item.bookingId) {
              <a class="row-item" [routerLink]="['/provider/sessions', item.bookingId]">
                <span class="row-main"><strong>₹{{ item.amount | number:'1.0-0' }}</strong><span>{{ item.createdAt | date:'d MMM y' }}</span></span>
                <span class="badge-pill warn">Recorded</span>
              </a>
            } @empty {
              <p class="muted">Earnings appear here after you complete a session.</p>
            }
          </section>
        }
        <div class="actions center"><a class="btn-link" routerLink="/provider">Back to dashboard</a></div>
      </div>
    </div>
  `,
  styles: [PROVIDER_PAGE_STYLES, `
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.9rem; margin-bottom: 1.25rem; }
    .summary .panel { display: flex; flex-direction: column; gap: 0.25rem; padding: 1.1rem 1.25rem; }
    .label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
    .big { font-family: var(--font-serif); font-size: 1.7rem; color: var(--sage-900); }
    @media (max-width: 640px) { .summary { grid-template-columns: 1fr; } }
  `]
})
export class ProviderEarningsComponent implements OnInit {
  private applications = inject(ProviderApplicationService);

  loading = signal(true);
  errorMsg = signal<string | null>(null);
  earnings = signal<Earnings | null>(null);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.applications.earnings().subscribe({
      next: earnings => { this.earnings.set(earnings); this.loading.set(false); },
      error: err => {
        this.loading.set(false);
        this.errorMsg.set(err?.status === 404 || err?.status === 403
          ? 'Earnings aren’t available for this account yet.'
          : 'We couldn’t load your earnings. Please try again.');
      }
    });
  }
}
