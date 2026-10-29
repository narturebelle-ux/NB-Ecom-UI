import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { ProviderService } from '../../services/provider.service';
import { ApiService } from '../../services/api.service';
import { PROFESSIONAL_TYPE_LABELS } from '../../models/maternal.models';
import { BOOKING_STATUS_LABELS, Booking, Slot } from '../../models/provider.models';

type Panel = { bookingId: number; kind: 'cancel' | 'reschedule' | 'noshow' | 'feedback' };

/**
 * The user's bookings against the real API (§9): cancel / reschedule while BOOKED, report a
 * provider no-show once the start time has passed, and leave feedback once COMPLETED.
 * Start/complete are provider-or-admin actions, so they never appear here.
 */
@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule],
  template: `
    <div class="bookings-page">
      <div class="container">
        <div class="page-head animate-in">
          <h1>My Bookings</h1>
          <a routerLink="/care" class="btn btn-outline btn-sm"><mat-icon class="icon-sm">add</mat-icon> Book a session</a>
        </div>

        @if (loading()) {
          @for (i of [1, 2]; track i) { <div class="skeleton" style="height: 120px; margin-bottom: 1rem"></div> }
        } @else if (errorMsg()) {
          <div class="state-box error"><mat-icon class="icon-sm">error_outline</mat-icon> {{ errorMsg() }}
            <button class="btn-link" (click)="load()">Try again</button></div>
        } @else if (bookings().length === 0) {
          <div class="state-box">
            <mat-icon class="hero-icon">event_available</mat-icon>
            <p>No bookings yet.</p>
            <a routerLink="/care" class="btn btn-primary">Find a professional</a>
          </div>
        } @else {
          <div class="booking-list">
            @for (b of bookings(); track b.id) {
              <div class="booking-card glass animate-in">
                <div class="booking-main">
                  <span class="status-badge" [class]="'status-' + b.status.toLowerCase()">{{ statusLabel(b.status) }}</span>
                  <h3>{{ providerName(b.providerId) }}</h3>
                  <span class="type-tag">{{ label(b.professionalType) }}</span>
                  <p class="when"><mat-icon class="icon-sm">schedule</mat-icon> {{ b.scheduledStart | date:'EEE, MMM d, y · h:mm a' }}</p>
                  @if (b.cancelReason) { <p class="field-hint">Reason: {{ b.cancelReason }}</p> }
                  @if (b.status === 'COMPLETED' && b.providerNote) {
                    <div class="note"><strong>Session summary from your provider</strong><p>{{ b.providerNote }}</p></div>
                  }
                </div>

                <div class="booking-actions">
                  @if (b.status === 'BOOKED') {
                    <button class="btn-link" (click)="open(b, 'reschedule')"><mat-icon class="icon-sm">update</mat-icon> Reschedule</button>
                    <button class="btn-link danger" (click)="open(b, 'cancel')"><mat-icon class="icon-sm">event_busy</mat-icon> Cancel</button>
                    @if (hasStarted(b)) {
                      <button class="btn-link" (click)="open(b, 'noshow')"><mat-icon class="icon-sm">person_off</mat-icon> Provider didn't attend</button>
                    }
                  }
                  @if (b.status === 'COMPLETED' && !feedbackDone().has(b.id)) {
                    <button class="btn-link" (click)="open(b, 'feedback')"><mat-icon class="icon-sm">rate_review</mat-icon> Leave feedback</button>
                  }
                  @if (feedbackDone().has(b.id)) {
                    <span class="field-hint"><mat-icon class="icon-sm">check</mat-icon> Feedback sent</span>
                  }
                </div>

                @if (panel()?.bookingId === b.id) {
                  <div class="panel">
                    @switch (panel()!.kind) {
                      @case ('reschedule') {
                        <p class="panel-title">Choose a new time</p>
                        @if (slotsLoading()) { <div class="skeleton" style="height: 60px"></div> }
                        @else if (slots().length === 0) { <p class="field-hint">No other open times right now.</p> }
                        @else {
                          <div class="slot-row">
                            @for (s of slots(); track s.id) {
                              <button type="button" class="slot-btn" [class.selected]="newSlotId === s.id" (click)="newSlotId = s.id">
                                {{ s.startAt | date:'EEE MMM d · h:mm a' }}
                              </button>
                            }
                          </div>
                        }
                        <input class="form-control" placeholder="Reason (required)" [(ngModel)]="reason" />
                        <div class="panel-actions">
                          <button class="btn btn-primary btn-sm" [disabled]="busy() || !newSlotId || !reason.trim()" (click)="reschedule(b)">Confirm new time</button>
                          <button class="btn-link" (click)="close()">Keep current time</button>
                        </div>
                      }
                      @case ('cancel') {
                        <p class="panel-title">Cancel this session?</p>
                        <input class="form-control" placeholder="Reason (required)" [(ngModel)]="reason" />
                        <div class="panel-actions">
                          <button class="btn btn-primary btn-sm danger-btn" [disabled]="busy() || !reason.trim()" (click)="cancel(b)">Cancel session</button>
                          <button class="btn-link" (click)="close()">Keep it</button>
                        </div>
                      }
                      @case ('noshow') {
                        <p class="panel-title">Let us know your provider didn't attend</p>
                        <input class="form-control" placeholder="What happened? (required)" [(ngModel)]="reason" />
                        <div class="panel-actions">
                          <button class="btn btn-primary btn-sm" [disabled]="busy() || !reason.trim()" (click)="reportNoShow(b)">Report</button>
                          <button class="btn-link" (click)="close()">Never mind</button>
                        </div>
                      }
                      @case ('feedback') {
                        <p class="panel-title">How was your session?</p>
                        <div class="stars">
                          @for (n of [1, 2, 3, 4, 5]; track n) {
                            <button type="button" class="star" [class.on]="n <= rating" (click)="rating = n" [attr.aria-label]="n + ' stars'">
                              <mat-icon>{{ n <= rating ? 'star' : 'star_outline' }}</mat-icon>
                            </button>
                          }
                        </div>
                        <textarea class="form-control" rows="2" placeholder="Anything you'd like to share? (optional)" [(ngModel)]="comment"></textarea>
                        <div class="panel-actions">
                          <button class="btn btn-primary btn-sm" [disabled]="busy() || !rating" (click)="sendFeedback(b)">Send feedback</button>
                          <button class="btn-link" (click)="close()">Later</button>
                        </div>
                      }
                    }
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .bookings-page { padding: 3rem 0 5rem; max-width: 760px; margin: 0 auto; }
    .page-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.75rem; gap: 1rem; flex-wrap: wrap; }
    .page-head h1 { font-size: 1.85rem; color: var(--sage-900); }
    .booking-list { display: flex; flex-direction: column; gap: 1.25rem; }
    .booking-card { padding: 1.5rem; border-radius: var(--radius-xl); display: flex; flex-direction: column; gap: 0.9rem; }
    .status-badge { display: inline-block; font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em; padding: 0.2rem 0.6rem; border-radius: var(--radius-full); margin-bottom: 0.5rem; background: var(--sage-100); color: var(--sage-900); }
    .status-booked, .status-in_progress { background: var(--trust-100); color: var(--trust-900); }
    .status-completed { background: var(--sage-100); color: var(--sage-900); }
    .status-cancelled, .status-no_show_provider, .status-no_show_user { background: #fdecea; color: #a0281c; }
    .status-rescheduled { background: var(--gold-100); color: var(--gold-700); }
    .booking-main h3 { font-size: 1.1rem; color: var(--sage-900); margin-bottom: 0.15rem; }
    .type-tag { font-size: 0.72rem; font-weight: 700; color: var(--blush-700); text-transform: uppercase; letter-spacing: 0.03em; }
    .when { display: flex; align-items: center; gap: 0.35rem; font-size: 0.88rem; color: var(--text-secondary); margin-top: 0.5rem; }
    .note { margin-top: 0.75rem; background: var(--sage-50); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0.75rem 0.9rem; font-size: 0.85rem; color: var(--text-secondary); }
    .note strong { display: block; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--sage-800); margin-bottom: 0.25rem; }

    .booking-actions { display: flex; gap: 1.1rem; flex-wrap: wrap; }
    .btn-link { font-size: 0.82rem; font-weight: 600; color: var(--sage-800); }
    .btn-link:hover { text-decoration: underline; }
    .btn-link.danger { color: #a0281c; }

    .panel { border-top: 1px solid var(--border-light); padding-top: 1rem; display: flex; flex-direction: column; gap: 0.75rem; animation: fadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    .panel-title { font-weight: 700; color: var(--sage-900); font-size: 0.92rem; }
    .panel-actions { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
    .slot-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .slot-btn { padding: 0.45rem 0.75rem; border-radius: var(--radius-sm); border: 1.5px solid var(--border-light); background: #fff; font-size: 0.8rem; cursor: pointer; }
    .slot-btn.selected { border-color: var(--sage-700); background: var(--sage-50); font-weight: 700; }
    .danger-btn { background: #a0281c; }
    .danger-btn:hover { background: #7f1f16; }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
    .stars { display: flex; gap: 0.25rem; }
    .star { color: var(--text-muted); transition: transform var(--transition-spring); }
    .star.on { color: var(--gold-500); }
    .star:hover { transform: scale(1.15); }

    .field-hint { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.8rem; color: var(--text-muted); }
    .state-box { text-align: center; padding: 3rem 1rem; color: var(--text-secondary); }
    .state-box p { margin-bottom: 1.25rem; }
    .state-box.error { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 1rem; background: #fdecea; color: #a0281c; border-radius: var(--radius-md); }
  `]
})
export class BookingsComponent implements OnInit {
  private providerService = inject(ProviderService);
  private api = inject(ApiService);

  loading = signal(true);
  errorMsg = signal<string | null>(null);
  bookings = signal<Booking[]>([]);
  panel = signal<Panel | null>(null);
  busy = signal(false);
  slots = signal<Slot[]>([]);
  slotsLoading = signal(false);
  feedbackDone = signal<Set<number>>(new Set());

  reason = '';
  newSlotId: number | null = null;
  rating = 0;
  comment = '';

  private names = new Map<number, string>();

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.errorMsg.set(null);
    // Booking responses carry providerId only, so the public directory supplies display names.
    forkJoin({ bookings: this.providerService.getBookings(), providers: this.providerService.getProviders() }).subscribe({
      next: ({ bookings, providers }) => {
        this.names = new Map(providers.map(p => [p.id, p.displayName]));
        const sorted = [...bookings].sort((a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime());
        this.bookings.set(sorted);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status !== 401 && err?.status !== 403) this.errorMsg.set("We couldn't load your bookings right now.");
      }
    });
  }

  providerName(id: number): string {
    return this.names.get(id) ?? 'Your care provider';
  }

  label(type: string): string {
    return (PROFESSIONAL_TYPE_LABELS as Record<string, string>)[type] || (type === 'REGISTERED_NURSE' ? 'Registered Nurse' : type);
  }

  statusLabel(status: Booking['status']): string {
    return BOOKING_STATUS_LABELS[status] ?? status;
  }

  hasStarted(b: Booking): boolean {
    return new Date(b.scheduledStart).getTime() <= Date.now();
  }

  open(b: Booking, kind: Panel['kind']) {
    this.panel.set({ bookingId: b.id, kind });
    this.reason = '';
    this.newSlotId = null;
    this.rating = 0;
    this.comment = '';
    if (kind === 'reschedule') {
      this.slotsLoading.set(true);
      this.providerService.getSlots(b.providerId).subscribe({
        next: (s) => { this.slots.set(s); this.slotsLoading.set(false); },
        error: () => { this.slots.set([]); this.slotsLoading.set(false); }
      });
    }
  }

  close() {
    this.panel.set(null);
  }

  cancel(b: Booking) {
    this.run(this.providerService.cancel(b.id, this.reason.trim()), 'Session cancelled.');
  }

  reschedule(b: Booking) {
    if (!this.newSlotId) return;
    this.run(this.providerService.reschedule(b.id, this.newSlotId, this.reason.trim()), 'Session moved to the new time.');
  }

  reportNoShow(b: Booking) {
    this.run(this.providerService.reportProviderNoShow(b.id, this.reason.trim()), "Thanks for letting us know — our care team will follow up.");
  }

  sendFeedback(b: Booking) {
    this.busy.set(true);
    this.providerService.submitFeedback(b.id, this.rating, this.comment.trim()).subscribe({
      next: () => this.markFeedbackDone(b.id, 'Thank you for your feedback.'),
      error: (err) => {
        if (err?.error?.code === 'FEEDBACK_NOT_ALLOWED') {
          this.markFeedbackDone(b.id, 'Feedback for this session was already received.');
        } else {
          this.busy.set(false);
          if (err?.status !== 401 && err?.status !== 403) this.api.showToast(err?.error?.message || 'Could not send feedback.');
        }
      }
    });
  }

  private markFeedbackDone(id: number, msg: string) {
    this.busy.set(false);
    this.feedbackDone.set(new Set([...this.feedbackDone(), id]));
    this.close();
    this.api.showToast(msg);
  }

  private run(request: ReturnType<ProviderService['cancel']>, successMsg: string) {
    this.busy.set(true);
    request.subscribe({
      next: () => {
        this.busy.set(false);
        this.close();
        this.api.showToast(successMsg);
        this.load();
      },
      error: (err) => {
        this.busy.set(false);
        if (err?.status === 401 || err?.status === 403) return;
        if (err?.error?.code === 'SLOT_NOT_AVAILABLE') {
          this.api.showToast('That time was just taken — please choose another.');
          const p = this.panel();
          const b = this.bookings().find(x => x.id === p?.bookingId);
          if (b) this.open(b, 'reschedule');
          return;
        }
        this.api.showToast(err?.error?.message || 'Something went wrong. Please try again.');
        this.load();
      }
    });
  }
}
