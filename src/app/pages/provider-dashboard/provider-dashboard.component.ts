import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { catchError, of } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { ProviderApplicationService } from '../../services/provider-application.service';
import { ProviderPortalService } from '../../services/provider-portal.service';
import { ProviderBooking, ProviderSelf } from '../../models/session-recommendation.models';
import { isReviewerUser } from '../../models/maternal.models';
import {
  APPLICATION_STATUS_LABELS,
  Earnings,
  PROFESSION_LABELS,
  ProductActivity,
  ProfessionRole,
  ProviderApplication
} from '../../models/provider-application.models';
import { PROVIDER_PAGE_STYLES } from '../provider-shared/provider-page.styles';

const LICENCE_WARNING_DAYS = 60;

/**
 * The professional's home, laid out like the mother's My Journey: greeting, hero, quick tiles, then panels.
 * Sessions come from NB-Ecom-API; the rest comes from NB-Ecom-Providers-API. Professionals an admin added
 * before self-service have no application, so those panels just stay out of the way.
 */
@Component({
  selector: 'app-provider-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="provider-page dash-page">
      <div class="container wide">
        <header class="greet animate-in">
          <div>
            <span class="kicker">{{ today | date:'EEEE, d MMMM' }}</span>
            <h1>{{ greeting() }}, {{ displayName() }}</h1>
            <p class="subtitle">Here’s your practice at a glance.</p>
          </div>
          <a routerLink="/provider/availability" class="btn btn-primary"><mat-icon class="icon-sm">calendar_add_on</mat-icon> Add availability</a>
        </header>

        @if (loading()) {
          <div class="grid">
            <div class="skeleton" style="height: 230px; border-radius: var(--radius-xl)"></div>
            <div class="skeleton" style="height: 230px; border-radius: var(--radius-xl)"></div>
          </div>
        } @else {
          @if (application(); as a) {
            @if (a.status === 'PAUSED' || a.status === 'SUSPENDED') {
              <div class="error status-note">
                <mat-icon class="icon-sm">pause_circle</mat-icon>
                @if (a.licenceLapsed) {
                  Your licence has expired, so your profile is paused and hidden. <a routerLink="/provider/profile">Upload your renewed licence</a> to return.
                } @else {
                  Your profile is {{ statusLabel().toLowerCase() }} and hidden from mothers. Please contact our team.
                }
              </div>
            } @else if (licenceDaysLeft() !== null && licenceDaysLeft()! <= licenceWarningDays) {
              <div class="proto status-note">
                <mat-icon class="icon-sm">warning</mat-icon>
                Your licence expires on {{ a.licenceExpiresOn | date:'d MMMM y' }}. <a routerLink="/provider/profile">Upload your renewed licence</a> to stay live.
              </div>
            }
          }

          <section class="hero-card animate-in">
            <div class="hero-main">
              <div class="badges">
                <span class="badge-pill sage">{{ professionLabel() }}</span>
                @if (application()) { <span class="badge-pill blush">{{ statusLabel() }}</span> }
              </div>
              @if (sessionsState() === 'ok') {
                <h2>{{ todayCount() }} {{ todayCount() === 1 ? 'session' : 'sessions' }} today</h2>
              } @else {
                <h2>Your practice</h2>
              }
              <p class="edd">
                @if (sessionsState() === 'ok') { {{ upcoming().length }} upcoming }
                @if (application()?.confirmedExperienceYears !== null && application()?.confirmedExperienceYears !== undefined) {
                  @if (sessionsState() === 'ok') { <span class="dot">·</span> } {{ application()?.confirmedExperienceYears }} years’ confirmed experience
                }
              </p>
            </div>
          </section>

          <section class="quick">
            @for (t of tiles(); track t.link) {
              <a class="quick-tile glass" [routerLink]="t.link">
                <mat-icon class="q-icon">{{ t.icon }}</mat-icon>
                <span><strong>{{ t.title }}</strong><small>{{ t.text }}</small></span>
                <mat-icon class="q-arrow">chevron_right</mat-icon>
              </a>
            }
          </section>

          <div class="grid">
            <div class="col">
              <section class="panel glass">
                <div class="panel-head"><h3><mat-icon>event_note</mat-icon> Today and upcoming</h3></div>
                @if (sessionsState() === 'failed') {
                  <p class="muted">We couldn’t load your sessions just now. <button class="btn-link" (click)="load()">Try again</button></p>
                } @else if (sessionsState() === 'paused') {
                  <p class="muted">Your sessions can’t be shown while your profile is paused or suspended. Please contact our team about any sessions already booked.</p>
                } @else {
                  @for (b of upcoming(); track b.id) {
                    <a class="row-item" [routerLink]="['/provider/sessions', b.id]">
                      <div class="when"><strong>{{ b.scheduledStart | date:'EEE d MMM' }}</strong><span>{{ b.scheduledStart | date:'h:mm a' }}</span></div>
                      <span class="row-main"><strong>{{ b.mother.firstName }}</strong><span>{{ b.serviceName }} · {{ b.modality === 'VIRTUAL' ? 'Online' : 'In person' }}</span></span>
                      <span class="badge-pill">{{ bookingLabel(b.status) }}</span>
                    </a>
                  } @empty {
                    <p class="muted">No upcoming sessions.</p>
                  }
                }
              </section>

              @if (sessionsState() === 'ok') {
                <section class="panel glass">
                  <div class="panel-head"><h3><mat-icon>history</mat-icon> Recent sessions</h3></div>
                  @for (b of recent(); track b.id) {
                    <a class="row-item" [routerLink]="['/provider/sessions', b.id]">
                      <div class="when"><strong>{{ b.scheduledStart | date:'EEE d MMM' }}</strong><span>{{ b.scheduledStart | date:'h:mm a' }}</span></div>
                      <span class="row-main"><strong>{{ b.mother.firstName }}</strong><span>{{ b.serviceName }}</span></span>
                      <span class="badge-pill">{{ bookingLabel(b.status) }}</span>
                    </a>
                  } @empty {
                    <p class="muted">No past sessions yet.</p>
                  }
                </section>
              }
            </div>

            <div class="col">
              @if (earnings(); as e) {
                <section class="panel glass">
                  <div class="panel-head">
                    <h3><mat-icon>payments</mat-icon> Earnings</h3>
                    <a class="btn-link" routerLink="/provider/earnings">See all</a>
                  </div>
                  <p class="big">₹{{ e.totalEarned | number:'1.0-0' }}</p>
                  <p class="muted">{{ e.completedSessions }} completed {{ e.completedSessions === 1 ? 'session' : 'sessions' }} at ₹{{ e.feePerSession | number:'1.0-0' }} each</p>
                </section>
              }

              @if (application()) {
                <section class="panel glass">
                  <div class="panel-head"><h3><mat-icon>verified</mat-icon> Your application</h3></div>
                  <div class="row-item"><span class="row-main"><strong>{{ statusLabel() }}</strong>
                    @if (application()?.activatedAt) { <span>Live since {{ application()?.activatedAt | date:'d MMMM y' }}</span> }
                  </span></div>
                </section>
              }

              @if (activity().length) {
                <section class="panel glass">
                  <div class="panel-head"><h3><mat-icon>recommend</mat-icon> Product suggestions</h3></div>
                  @for (p of activity(); track $index) {
                    <div class="row-item">
                      <span class="row-main"><strong>{{ p.productName }}</strong><span>{{ p.createdAt | date:'d MMM y' }}</span></span>
                      <span class="badge-pill" [class.blush]="p.priority === 'ESSENTIAL'">{{ p.priority === 'ESSENTIAL' ? 'Essential' : 'Optional' }}</span>
                    </div>
                  }
                </section>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [PROVIDER_PAGE_STYLES, `
    .dash-page { padding: 2.5rem 0 4.5rem; }
    .greet { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.75rem; }
    .greet .kicker { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; color: var(--sage-600); }
    .greet h1 { font-size: clamp(1.7rem, 3vw, 2.3rem); color: var(--sage-900); margin: 0.2rem 0; }
    .subtitle { color: var(--text-secondary); margin: 0; }
    .status-note { margin-bottom: 1.25rem; font-size: 0.86rem; }
    .status-note a { color: inherit; text-decoration: underline; font-weight: 700; }

    .hero-card {
      position: relative; overflow: hidden; display: flex; justify-content: space-between; align-items: center; gap: 2rem;
      padding: 2.25rem 2.5rem; border-radius: var(--radius-xl); color: #fff; margin-bottom: 1.25rem;
      background: radial-gradient(circle at 85% 20%, rgba(255,255,255,0.14), transparent 45%),
                  linear-gradient(135deg, var(--solid-sage-700), var(--solid-sage-900));
      box-shadow: var(--shadow-lg);
    }
    .hero-card::after { content: ''; position: absolute; right: -80px; bottom: -120px; width: 320px; height: 320px; border-radius: 50%; background: var(--glow-blush); }
    .hero-main { flex: 1; min-width: 0; position: relative; z-index: 1; }
    .badges { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
    .badge-pill.sage { background: rgba(255,255,255,0.16); color: #fff; }
    .hero-card h2 { font-size: clamp(2rem, 4vw, 2.8rem); margin: 0 0 0.35rem; color: #fff; }
    .edd { display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; color: rgba(255,255,255,0.85); margin: 0; }
    .dot { opacity: 0.6; }

    .quick { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0.9rem; margin-bottom: 1.25rem; }
    .quick-tile { display: flex; align-items: center; gap: 0.85rem; padding: 1rem 1.1rem; border-radius: var(--radius-lg); text-decoration: none; color: inherit; transition: transform 0.2s, box-shadow 0.2s; }
    .quick-tile:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
    .q-icon { width: 42px; height: 42px; font-size: 22px; flex-shrink: 0; border-radius: 12px; display: grid; place-items: center; background: var(--sage-100); color: var(--sage-700); }
    .quick-tile span { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .quick-tile strong { color: var(--sage-900); font-size: 0.92rem; }
    .quick-tile small { color: var(--text-muted); font-size: 0.76rem; }
    .q-arrow { font-size: 18px; width: 18px; height: 18px; color: var(--sage-500); transition: transform 0.2s; }
    .quick-tile:hover .q-arrow { transform: translateX(3px); }

    .grid { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(0, 1fr); gap: 1.25rem; align-items: start; }
    .col { display: flex; flex-direction: column; gap: 1.25rem; }
    @media (max-width: 900px) {
      .grid { grid-template-columns: 1fr; }
      .hero-card { padding: 1.75rem; }
    }
    .when { display: flex; flex-direction: column; min-width: 6.5rem; }
    .when strong { color: var(--sage-900); font-size: 0.88rem; }
    .when span { font-size: 0.8rem; color: var(--text-muted); }
    .big { font-family: var(--font-serif); font-size: 2.2rem; color: var(--sage-900); margin: 0 0 0.2rem; }
  `]
})
export class ProviderDashboardComponent implements OnInit {
  private applications = inject(ProviderApplicationService);
  private portal = inject(ProviderPortalService);
  private api = inject(ApiService);

  today = new Date();
  licenceWarningDays = LICENCE_WARNING_DAYS;

  loading = signal(true);
  sessionsState = signal<'ok' | 'failed' | 'paused'>('ok');
  me = signal<ProviderSelf | null>(null);
  application = signal<ProviderApplication | null>(null);
  bookings = signal<ProviderBooking[]>([]);
  earnings = signal<Earnings | null>(null);
  activity = signal<ProductActivity[]>([]);

  upcoming = computed(() => this.bookings()
    .filter(b => b.status === 'BOOKED' || b.status === 'IN_PROGRESS')
    .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart)));
  recent = computed(() => this.bookings()
    .filter(b => b.status !== 'BOOKED' && b.status !== 'IN_PROGRESS')
    .sort((a, b) => b.scheduledStart.localeCompare(a.scheduledStart))
    .slice(0, 10));
  todayCount = computed(() => {
    const today = new Date().toDateString();
    return this.upcoming().filter(b => new Date(b.scheduledStart).toDateString() === today).length;
  });
  statusLabel = computed(() => {
    const status = this.application()?.status;
    return status ? APPLICATION_STATUS_LABELS[status] : '';
  });
  professionLabel = computed(() => {
    const type = this.application()?.profession ?? this.me()?.professionalType;
    return type ? (PROFESSION_LABELS[type as ProfessionRole] ?? type) : 'Care professional';
  });
  displayName = computed(() => this.me()?.displayName || this.api.currentUser()?.firstName || this.api.currentUser()?.name?.split(' ')[0] || 'there');
  licenceDaysLeft = computed(() => {
    const expires = this.application()?.licenceExpiresOn;
    return expires ? Math.ceil((new Date(expires).getTime() - Date.now()) / 86400000) : null;
  });
  tiles = computed(() => {
    const tiles = [
      { icon: 'event_available', title: 'Availability and services', text: 'Your slots and what you offer', link: '/provider/availability' },
      { icon: 'payments', title: 'Earnings', text: 'Fees from completed sessions', link: '/provider/earnings' },
      { icon: 'badge', title: 'Profile and documents', text: 'Your details and licence', link: '/provider/profile' }
    ];
    if (isReviewerUser(this.api.currentUser())) {
      tiles.push({ icon: 'fact_check', title: 'Rule review', text: 'Product health rules', link: '/review/health-rules' });
    }
    return tiles;
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.sessionsState.set('ok');
    // Each part loads on its own: sessions never wait for the onboarding service to wake, and either can fail alone.
    this.portal.me().pipe(catchError(() => of(null))).subscribe(me => this.me.set(me));
    this.portal.getBookings().subscribe({
      next: bookings => { this.bookings.set(bookings); this.loading.set(false); },
      error: err => {
        this.bookings.set([]);
        this.sessionsState.set(err?.status === 403 ? 'paused' : 'failed');
        this.loading.set(false);
      }
    });
    this.applications.current().pipe(catchError(() => of(null))).subscribe(application => this.application.set(application));
    this.applications.earnings().pipe(catchError(() => of(null))).subscribe(earnings => this.earnings.set(earnings));
    this.applications.productActivity().pipe(catchError(() => of([] as ProductActivity[]))).subscribe(activity => this.activity.set(activity));
  }

  greeting(): string {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  }

  bookingLabel(status: string): string {
    return ({ BOOKED: 'Booked', IN_PROGRESS: 'In progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled', RESCHEDULED: 'Rescheduled', NO_SHOW_USER: 'No-show', NO_SHOW_PROVIDER: 'Missed' } as Record<string, string>)[status] ?? status;
  }
}
