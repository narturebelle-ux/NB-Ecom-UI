import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { FeatureToggleService } from '../../services/feature-toggle.service';
import { JoyCircleService } from '../../services/joy-circle.service';
import { JoyCircleEvent, JoyCircleRsvp } from '../../models/joy-circle.models';

/** Phase 6 — Joy Circle: non-clinical community events with RSVP. */
@Component({
  selector: 'app-joy-circle',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="jc-page">
      <div class="container narrow">
        <header class="jc-header">
          <span class="kicker">Joy Circle</span>
          <h1>Meet other parents</h1>
          <p>Relaxed get-togethers with other mothers and families, online and in person.</p>
        </header>

        <div class="notice">
          <mat-icon class="icon-sm">diversity_3</mat-icon>
          <span>
            Joy Circle events are community get-togethers, not medical care. For health questions,
            @if (features.isEnabled('careBooking')) { <a routerLink="/care">book a session with your care team</a>. } @else { talk to your care team. }
          </span>
        </div>

        @if (loading()) {
          <p class="hint">Loading events…</p>
        } @else if (loadError()) {
          <div class="empty card">
            <p>{{ loadError() }}</p>
            <button class="btn btn-outline btn-sm" (click)="load()">Try again</button>
          </div>
        } @else {
          @if (myRsvps().length) {
            <section class="mine">
              <h2>You’re going</h2>
              @for (r of myRsvps(); track r.eventId) {
                <div class="mine-row card">
                  <div>
                    <strong>{{ r.event.title }}</strong>
                    <span class="hint">{{ r.event.startsAt | date:'EEE, d MMM · h:mm a' }} · {{ r.event.modality === 'VIRTUAL' ? 'Online' : r.event.location }}</span>
                    @if (r.event.status === 'CANCELLED') { <span class="badge cancelled">Cancelled by the host</span> }
                  </div>
                  <div class="mine-actions">
                    @if (r.joinUrl && r.event.status !== 'CANCELLED') {
                      <a class="btn btn-primary btn-sm" [href]="r.joinUrl" target="_blank" rel="noopener">Join link</a>
                    }
                    <button class="btn btn-link btn-sm" [disabled]="busy() === r.eventId" (click)="cancel(r.eventId)">Can’t make it</button>
                  </div>
                </div>
              }
            </section>
          }

          @if (categories().length > 1) {
            <div class="chips">
              <button class="chip" [class.on]="category() === null" [attr.aria-pressed]="category() === null" (click)="category.set(null)">All</button>
              @for (c of categories(); track c) {
                <button class="chip" [class.on]="category() === c" [attr.aria-pressed]="category() === c" (click)="category.set(c)">{{ c }}</button>
              }
            </div>
          }

          <div class="events">
            @for (e of visible(); track e.id) {
              <article class="event card">
                <div class="when">
                  <span class="day">{{ e.startsAt | date:'d' }}</span>
                  <span class="month">{{ e.startsAt | date:'MMM' }}</span>
                </div>
                <div class="event-body">
                  <span class="category">{{ e.category }}</span>
                  <h3>{{ e.title }}</h3>
                  <p class="meta">
                    <mat-icon class="icon-sm">schedule</mat-icon> {{ e.startsAt | date:'EEE · h:mm a' }} – {{ e.endsAt | date:'h:mm a' }}
                    <span class="dot">·</span>
                    <mat-icon class="icon-sm">{{ e.modality === 'VIRTUAL' ? 'videocam' : 'place' }}</mat-icon> {{ e.modality === 'VIRTUAL' ? 'Online' : e.location }}
                  </p>
                  <p class="desc">{{ e.description }}</p>
                  <p class="host"><strong>Hosted by {{ e.hostName }}</strong>@if (e.hostBio) { · {{ e.hostBio }} }</p>
                  @if (e.disclaimer) { <p class="disclaimer">{{ e.disclaimer }}</p> }
                  <div class="event-foot">
                    <span class="spots">
                      @if (e.status === 'CANCELLED') { Cancelled }
                      @else if (e.spotsLeft === null) { Open to everyone }
                      @else if (e.spotsLeft === 0) { Full }
                      @else { {{ e.spotsLeft }} {{ e.spotsLeft === 1 ? 'spot' : 'spots' }} left }
                    </span>
                    @if (going().has(e.id)) {
                      <span class="going"><mat-icon class="icon-sm">check_circle</mat-icon> You’re going</span>
                    } @else {
                      <button class="btn btn-primary btn-sm"
                              [disabled]="busy() === e.id || e.status === 'CANCELLED' || e.spotsLeft === 0"
                              (click)="rsvp(e)">{{ busy() === e.id ? 'Saving…' : 'I’ll be there' }}</button>
                    }
                  </div>
                </div>
              </article>
            } @empty {
              <div class="empty card">
                <mat-icon>event</mat-icon>
                <p>No upcoming events right now. New ones are added regularly.</p>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .jc-page { padding: 3rem 0 5rem; }
    .narrow { max-width: 820px; }
    .jc-header { text-align: center; margin-bottom: 1.5rem; }
    .kicker { font-size: 0.78rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--blush-700); }
    .jc-header h1 { font-size: clamp(1.8rem, 3.5vw, 2.4rem); margin: 0.5rem 0; color: var(--sage-900); }
    .jc-header p { color: var(--text-secondary); }

    .notice { display: flex; gap: 0.6rem; align-items: flex-start; font-size: 0.84rem; color: var(--text-secondary); background: var(--sage-50); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0.8rem 1rem; margin-bottom: 1.5rem; }
    .notice mat-icon { color: var(--trust-700); flex-shrink: 0; }

    .card { border-radius: var(--radius-xl); background: #fff; border: 1px solid var(--border-light); }
    .mine { margin-bottom: 1.75rem; }
    .mine h2 { font-size: 1.1rem; color: var(--sage-900); margin-bottom: 0.6rem; }
    .mine-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; padding: 0.9rem 1.1rem; margin-bottom: 0.5rem; }
    .mine-row strong { display: block; color: var(--sage-900); }
    .mine-actions { display: flex; gap: 0.4rem; align-items: center; }
    .badge.cancelled { display: inline-block; margin-top: 0.25rem; font-size: 0.7rem; font-weight: 800; color: #a0281c; background: #fdecea; padding: 0.15rem 0.5rem; border-radius: var(--radius-full); }

    .chips { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1.25rem; }
    .chip { border: 1.5px solid var(--border-light); background: #fff; border-radius: var(--radius-full); padding: 0.4rem 0.85rem; font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); cursor: pointer; }
    .chip.on { background: var(--sage-700); border-color: var(--sage-700); color: #fff; }

    .events { display: flex; flex-direction: column; gap: 1rem; }
    .event { display: flex; gap: 1.1rem; padding: 1.25rem; }
    .when { display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 58px; height: 64px; border-radius: var(--radius-md); background: var(--blush-50, #fdf2f4); color: var(--blush-700); }
    .day { font-size: 1.4rem; font-weight: 800; line-height: 1; }
    .month { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; }
    .event-body { flex: 1; display: flex; flex-direction: column; gap: 0.4rem; min-width: 0; }
    .category { font-size: 0.7rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--trust-700); }
    .event h3 { font-size: 1.05rem; color: var(--sage-900); }
    .meta { display: flex; align-items: center; flex-wrap: wrap; gap: 0.3rem; font-size: 0.8rem; color: var(--text-muted); }
    .dot { margin: 0 0.2rem; }
    .desc { font-size: 0.86rem; color: var(--text-secondary); line-height: 1.55; }
    .host { font-size: 0.8rem; color: var(--text-secondary); }
    .disclaimer { font-size: 0.75rem; color: var(--text-muted); font-style: italic; }
    .event-foot { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; margin-top: 0.4rem; flex-wrap: wrap; }
    .spots { font-size: 0.8rem; font-weight: 700; color: var(--sage-900); }
    .going { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; font-weight: 700; color: var(--sage-700); }

    .empty { padding: 2rem; text-align: center; color: var(--text-secondary); }
    .empty mat-icon { color: var(--sage-700); }
    .hint { font-size: 0.82rem; color: var(--text-muted); display: block; }
    @media (max-width: 520px) { .event { flex-direction: column; } .when { flex-direction: row; gap: 0.4rem; height: auto; padding: 0.3rem 0.7rem; align-self: flex-start; } }
  `]
})
export class JoyCircleComponent implements OnInit {
  private api = inject(ApiService);
  private jc = inject(JoyCircleService);
  features = inject(FeatureToggleService);

  loading = signal(true);
  loadError = signal<string | null>(null);
  events = signal<JoyCircleEvent[]>([]);
  myRsvps = signal<JoyCircleRsvp[]>([]);
  category = signal<string | null>(null);
  /** eventId being saved. */
  busy = signal<number | null>(null);

  going = computed(() => new Set(this.myRsvps().map(r => r.eventId)));
  categories = computed(() => [...new Set(this.events().map(e => e.category))].sort());
  visible = computed(() => this.events().filter(e => this.category() === null || e.category === this.category()));

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.loadError.set(null);
    forkJoin({ events: this.jc.getEvents(), rsvps: this.jc.getMyRsvps() }).subscribe({
      next: ({ events, rsvps }) => {
        this.events.set(events);
        this.myRsvps.set(rsvps);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 401 || err?.status === 403) return;
        this.loadError.set('We couldn’t load Joy Circle events. Please check your connection.');
      }
    });
  }

  rsvp(e: JoyCircleEvent) {
    this.busy.set(e.id);
    this.jc.rsvp(e.id).subscribe({
      next: r => {
        this.busy.set(null);
        this.myRsvps.update(list => [...list.filter(x => x.eventId !== r.eventId), r]);
        this.events.update(list => list.map(x => (x.id === r.eventId ? r.event : x)));
        this.api.showToast(`You’re going to ${e.title}.`);
      },
      error: (err) => {
        this.busy.set(null);
        const code = err?.error?.code;
        if (code === 'EVENT_FULL') { this.api.showToast('Sorry, that event just filled up.'); this.load(); return; }
        if (code === 'EVENT_NOT_OPEN') { this.api.showToast('That event isn’t taking RSVPs any more.'); this.load(); return; }
        if (err?.status === 401 || err?.status === 403) return;
        this.api.showToast('Couldn’t save your RSVP. Please try again.');
      }
    });
  }

  cancel(eventId: number) {
    this.busy.set(eventId);
    this.jc.cancelRsvp(eventId).subscribe({
      next: () => {
        this.busy.set(null);
        this.myRsvps.update(list => list.filter(r => r.eventId !== eventId));
        // Refresh so spotsLeft reflects the freed place.
        this.jc.getEvents().subscribe({ next: ev => this.events.set(ev), error: () => {} });
        this.api.showToast('Your RSVP is cancelled.');
      },
      error: () => {
        this.busy.set(null);
        this.api.showToast('Couldn’t cancel right now. Please try again.');
      }
    });
  }
}
