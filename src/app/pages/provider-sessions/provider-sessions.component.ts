import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProviderPortalService } from '../../services/provider-portal.service';
import { ProviderBooking, ProviderSelf } from '../../models/session-recommendation.models';

/** Provider portal home: the signed-in professional's upcoming and recent sessions. */
@Component({
  selector: 'app-provider-sessions',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="portal-page">
      <div class="container narrow">
        <header class="portal-header">
          <span class="kicker">Professional portal</span>
          <h1>Your sessions</h1>
          @if (me(); as p) { <p>Signed in as {{ p.displayName }}.</p> }
        </header>

        @if (loading()) {
          <p class="hint">Loading your sessions…</p>
        } @else if (errorMsg()) {
          <div class="card empty">
            <p>{{ errorMsg() }}</p>
            <button class="btn btn-outline btn-sm" (click)="load()">Try again</button>
          </div>
        } @else {
          <h2>Upcoming</h2>
          @for (b of upcoming(); track b.id) {
            <a class="session card" [routerLink]="['/provider/sessions', b.id]">
              <div class="when"><strong>{{ b.scheduledStart | date:'EEE d MMM' }}</strong><span>{{ b.scheduledStart | date:'h:mm a' }}</span></div>
              <div class="what">
                <strong>{{ b.mother.firstName }}</strong>
                <span class="hint">{{ b.serviceName }} · {{ b.modality === 'VIRTUAL' ? 'Online' : 'In person' }}</span>
              </div>
              <span class="status">{{ statusLabel(b.status) }}</span>
            </a>
          } @empty {
            <p class="hint">No upcoming sessions.</p>
          }

          <h2>Recent</h2>
          @for (b of recent(); track b.id) {
            <a class="session card" [routerLink]="['/provider/sessions', b.id]">
              <div class="when"><strong>{{ b.scheduledStart | date:'EEE d MMM' }}</strong><span>{{ b.scheduledStart | date:'h:mm a' }}</span></div>
              <div class="what">
                <strong>{{ b.mother.firstName }}</strong>
                <span class="hint">{{ b.serviceName }}</span>
              </div>
              <span class="status">{{ statusLabel(b.status) }}</span>
            </a>
          } @empty {
            <p class="hint">No past sessions yet.</p>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .portal-page { padding: 3rem 0 5rem; }
    .narrow { max-width: 760px; }
    .portal-header { margin-bottom: 1.5rem; }
    .kicker { font-size: 0.78rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trust-700); }
    .portal-header h1 { font-size: clamp(1.7rem, 3.2vw, 2.2rem); color: var(--sage-900); margin: 0.4rem 0; }
    .portal-header p { color: var(--text-secondary); }
    h2 { font-size: 1.05rem; color: var(--sage-900); margin: 1.5rem 0 0.6rem; }
    .card { border-radius: var(--radius-lg, 14px); background: #fff; border: 1px solid var(--border-light); }
    .session { display: flex; align-items: center; gap: 1rem; padding: 0.85rem 1rem; margin-bottom: 0.5rem; text-decoration: none; color: inherit; }
    .session:hover { border-color: var(--sage-700); }
    .when { display: flex; flex-direction: column; min-width: 6.5rem; }
    .when strong { color: var(--sage-900); font-size: 0.88rem; }
    .when span { font-size: 0.8rem; color: var(--text-muted); }
    .what { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .what strong { color: var(--sage-900); }
    .status { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--trust-700); }
    .hint { font-size: 0.82rem; color: var(--text-muted); }
    .empty { padding: 1.5rem; text-align: center; color: var(--text-secondary); }
  `]
})
export class ProviderSessionsComponent implements OnInit {
  private portal = inject(ProviderPortalService);

  me = signal<ProviderSelf | null>(null);
  bookings = signal<ProviderBooking[]>([]);
  loading = signal(true);
  errorMsg = signal<string | null>(null);

  upcoming = computed(() => this.bookings()
    .filter(b => b.status === 'BOOKED' || b.status === 'IN_PROGRESS')
    .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart)));
  recent = computed(() => this.bookings()
    .filter(b => b.status !== 'BOOKED' && b.status !== 'IN_PROGRESS')
    .sort((a, b) => b.scheduledStart.localeCompare(a.scheduledStart)));

  ngOnInit() {
    this.portal.me().subscribe({ next: p => this.me.set(p), error: () => {} });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.portal.getBookings().subscribe({
      next: list => { this.bookings.set(list); this.loading.set(false); },
      error: err => {
        this.loading.set(false);
        this.errorMsg.set(err?.status === 404
          ? 'The professional portal isn’t available on this server yet.'
          : err?.status === 403 ? 'Your professional account isn’t verified yet. NartureBelle will let you know once it is.'
          : 'We couldn’t load your sessions. Please try again.');
      }
    });
  }

  statusLabel(s: string): string {
    return ({ BOOKED: 'Booked', IN_PROGRESS: 'In progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled', RESCHEDULED: 'Rescheduled', NO_SHOW_USER: 'No-show', NO_SHOW_PROVIDER: 'Missed' } as Record<string, string>)[s] ?? s;
  }
}
