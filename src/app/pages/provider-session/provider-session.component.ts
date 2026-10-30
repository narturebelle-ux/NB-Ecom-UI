import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { ProviderPortalService } from '../../services/provider-portal.service';
import { RISK_FACTOR_LABELS, RiskFactor } from '../../models/onboarding.models';
import {
  PRIORITY_LABELS,
  ProductSuggestions,
  ProviderBooking,
  RecommendationPriority,
  SuggestedProduct
} from '../../models/session-recommendation.models';

interface Pick { priority: RecommendationPriority; note: string; }

/**
 * One session in the professional portal: start / complete it, see the mother's stage and (with her
 * HEALTH_DATA consent) health details, and pick products labelled Essential / Optional. The picks show on
 * her account once the session is completed.
 */
@Component({
  selector: 'app-provider-session',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule],
  template: `
    <div class="session-page">
      <div class="container narrow">
        <a routerLink="/provider" class="back"><mat-icon class="icon-sm">arrow_back</mat-icon> All sessions</a>

        @if (loading()) {
          <p class="hint">Loading the session…</p>
        } @else if (errorMsg()) {
          <div class="card empty"><p>{{ errorMsg() }}</p></div>
        } @else {
          @if (booking(); as b) {
            <header class="card head">
              <div>
                <span class="kicker">{{ b.serviceName }} · {{ b.modality === 'VIRTUAL' ? 'Online' : 'In person' }}</span>
                <h1>Session with {{ b.mother.firstName }}</h1>
                <p class="hint">{{ b.scheduledStart | date:'EEE d MMM y, h:mm a' }} – {{ b.scheduledEnd | date:'h:mm a' }} · {{ statusLabel(b.status) }}</p>
              </div>
              @if (b.status === 'BOOKED') {
                <button class="btn btn-primary" [disabled]="busy()" (click)="start()"><mat-icon class="icon-sm">play_arrow</mat-icon> Start session</button>
              }
            </header>
          }

          @if (suggestions(); as s) {
            <section class="card">
              <h2>About {{ s.mother.firstName }}</h2>
              <p><strong>Stage:</strong> {{ stageLabel(s.mother.stage) }}@if (booking()?.mother?.gestationalWeek) { · week {{ booking()!.mother.gestationalWeek }} }</p>
              @if (s.mother.healthProfile; as h) {
                <p><strong>Health details:</strong>
                  {{ h.firstPregnancy === true ? 'First pregnancy' : h.firstPregnancy === false ? 'Not her first pregnancy' : '' }}{{ h.multiples ? ' · expecting twins or more' : '' }}
                </p>
                <p><strong>Conditions:</strong> {{ h.riskFactors.length ? riskLabels(h.riskFactors) : 'None reported' }}</p>
              } @else {
                <p class="hint">She hasn’t shared health details with her care team.</p>
              }
            </section>

            <section class="card">
              <h2>Recommend products</h2>
              <p class="hint">Suggestions for her stage. Approved health rules have already been applied. Tick what you recommend and mark it Essential or Optional. She’ll see your picks on her account after the session is completed.</p>

              @for (p of s.items; track p.productId) {
                <div class="product" [class.picked]="picks()[p.productId]">
                  <label class="pick">
                    <input type="checkbox" [checked]="!!picks()[p.productId]" (change)="togglePick(p)" [disabled]="!canEdit()" />
                    <img [src]="p.imageUrl" [alt]="p.name" loading="lazy" />
                    <span class="p-main">
                      <strong>{{ p.name }}</strong>
                      <span class="hint">{{ p.category }} · ₹{{ p.price | number }}</span>
                      @if (p.whyRecommended.length) { <span class="why">{{ p.whyRecommended.join(' · ') }}</span> }
                    </span>
                  </label>
                  @if (picks()[p.productId]; as pick) {
                    <div class="pick-opts">
                      <div class="seg" role="radiogroup" [attr.aria-label]="'Priority for ' + p.name">
                        @for (pr of priorities; track pr) {
                          <button type="button" role="radio" [attr.aria-checked]="pick.priority === pr" [class.on]="pick.priority === pr" [disabled]="!canEdit()" (click)="setPriority(p.productId, pr)">{{ priorityLabel(pr) }}</button>
                        }
                      </div>
                      <input class="form-control note" maxlength="500" placeholder="Note for her (optional), e.g. “twice a day after meals”" [ngModel]="pick.note" (ngModelChange)="setNote(p.productId, $event)" [disabled]="!canEdit()" />
                    </div>
                  }
                </div>
              } @empty {
                <p class="hint">No products are suggested for her stage yet.</p>
              }

              @if (s.avoided.length) {
                <details class="avoided">
                  <summary>{{ s.avoided.length }} hidden by health rules</summary>
                  <ul>@for (a of s.avoided; track a.productId) { <li><strong>{{ a.name }}</strong>: {{ a.reason }}</li> }</ul>
                </details>
              }

              <div class="save-row">
                <span class="hint">{{ pickedCount() }} selected</span>
                <button class="btn btn-outline" [disabled]="!canEdit() || busy()" (click)="savePicks()">Save recommendations</button>
              </div>
            </section>
          }

          @if (booking()?.status === 'BOOKED' || booking()?.status === 'IN_PROGRESS') {
            <section class="card">
              <h2>Complete the session</h2>
              <p class="hint">Your session note is required. It locks once the session is completed. Your saved product picks become visible to her at this point.</p>
              <textarea class="form-control" rows="3" [(ngModel)]="sessionNote" placeholder="Session note"></textarea>
              <div class="save-row">
                <span></span>
                <button class="btn btn-primary" [disabled]="!sessionNote.trim() || busy()" (click)="complete()"><mat-icon class="icon-sm">task_alt</mat-icon> Save picks &amp; complete</button>
              </div>
            </section>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .session-page { padding: 2rem 0 5rem; }
    .narrow { max-width: 820px; }
    .back { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; color: var(--trust-700); text-decoration: none; margin-bottom: 1rem; }
    .card { border-radius: var(--radius-lg, 14px); background: #fff; border: 1px solid var(--border-light); padding: 1.15rem 1.25rem; margin-bottom: 1rem; }
    .head { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .kicker { font-size: 0.74rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--trust-700); }
    h1 { font-size: 1.5rem; color: var(--sage-900); margin: 0.3rem 0; }
    h2 { font-size: 1.05rem; color: var(--sage-900); margin-bottom: 0.5rem; }
    p { font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 0.3rem; }
    .hint { font-size: 0.8rem; color: var(--text-muted); }
    .product { border-top: 1px solid var(--border-subtle); padding: 0.75rem 0; }
    .product.picked { background: var(--sage-50); margin: 0 -1.25rem; padding: 0.75rem 1.25rem; }
    .pick { display: flex; align-items: flex-start; gap: 0.75rem; cursor: pointer; }
    .pick input { margin-top: 0.3rem; }
    .pick img { width: 52px; height: 52px; border-radius: var(--radius-md); object-fit: cover; flex-shrink: 0; }
    .p-main { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
    .p-main strong { color: var(--sage-900); font-size: 0.9rem; }
    .why { font-size: 0.76rem; color: var(--sage-700); }
    .pick-opts { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; margin: 0.5rem 0 0 calc(52px + 0.75rem + 1.25rem); }
    .seg { display: inline-flex; border: 1.5px solid var(--border-light); border-radius: var(--radius-full); overflow: hidden; }
    .seg button { border: none; background: #fff; padding: 0.3rem 0.8rem; font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); cursor: pointer; }
    .seg button.on { background: var(--sage-700); color: #fff; }
    .note { flex: 1; min-width: 12rem; padding: 0.4rem 0.6rem; font-size: 0.82rem; }
    .avoided { margin-top: 0.75rem; font-size: 0.82rem; color: var(--text-secondary); }
    .avoided summary { cursor: pointer; font-weight: 600; color: var(--trust-700); }
    .save-row { display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; gap: 0.75rem; }
    textarea { width: 100%; }
    .empty { text-align: center; color: var(--text-secondary); }
    @media (max-width: 560px) { .pick-opts { margin-left: 0; } }
  `]
})
export class ProviderSessionComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private portal = inject(ProviderPortalService);
  private api = inject(ApiService);

  priorities: RecommendationPriority[] = ['ESSENTIAL', 'OPTIONAL'];
  bookingId = 0;
  booking = signal<ProviderBooking | null>(null);
  suggestions = signal<ProductSuggestions | null>(null);
  picks = signal<Record<number, Pick>>({});
  loading = signal(true);
  errorMsg = signal<string | null>(null);
  busy = signal(false);
  sessionNote = '';

  pickedCount = computed(() => Object.keys(this.picks()).length);
  /** Picks can be edited during the session and after it (the API sets the cut-off). */
  canEdit = computed(() => ['BOOKED', 'IN_PROGRESS', 'COMPLETED'].includes(this.booking()?.status ?? ''));

  ngOnInit() {
    this.bookingId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.errorMsg.set(null);
    forkJoin({
      bookings: this.portal.getBookings(),
      suggestions: this.portal.getSuggestions(this.bookingId),
      saved: this.portal.getRecommendations(this.bookingId)
    }).subscribe({
      next: ({ bookings, suggestions, saved }) => {
        this.booking.set(bookings.find(b => b.id === this.bookingId) ?? null);
        this.suggestions.set(suggestions);
        const picks: Record<number, Pick> = {};
        for (const r of saved) picks[r.productId] = { priority: r.priority, note: r.note ?? '' };
        this.picks.set(picks);
        this.loading.set(false);
        if (!this.booking()) this.errorMsg.set('This session isn’t one of yours.');
      },
      error: err => {
        this.loading.set(false);
        this.errorMsg.set(err?.status === 404 ? 'This session wasn’t found, or the portal isn’t available on this server yet.'
          : err?.status === 403 ? 'Only the professional assigned to this session can open it.'
          : 'We couldn’t load this session. Please try again.');
      }
    });
  }

  togglePick(p: SuggestedProduct) {
    this.picks.update(all => {
      const next = { ...all };
      if (next[p.productId]) delete next[p.productId];
      else next[p.productId] = { priority: 'OPTIONAL', note: '' };
      return next;
    });
  }

  setPriority(productId: number, priority: RecommendationPriority) {
    this.picks.update(all => ({ ...all, [productId]: { ...all[productId], priority } }));
  }

  setNote(productId: number, note: string) {
    this.picks.update(all => ({ ...all, [productId]: { ...all[productId], note } }));
  }

  private picksPayload() {
    return Object.entries(this.picks()).map(([id, p]) => ({ productId: Number(id), priority: p.priority, note: p.note.trim() || null }));
  }

  savePicks() {
    this.busy.set(true);
    this.portal.saveRecommendations(this.bookingId, this.picksPayload()).subscribe({
      next: () => { this.busy.set(false); this.api.showToast('Recommendations saved.'); },
      error: err => { this.busy.set(false); this.api.showToast(err?.error?.message || 'Couldn’t save your recommendations.'); }
    });
  }

  start() {
    this.busy.set(true);
    this.portal.start(this.bookingId).subscribe({
      next: () => { this.busy.set(false); this.booking.update(b => (b ? { ...b, status: 'IN_PROGRESS' } : b)); },
      error: err => { this.busy.set(false); this.api.showToast(err?.error?.message || 'Couldn’t start the session.'); }
    });
  }

  /** Saves the picks first, so they're in place the moment the session completes. */
  complete() {
    const note = this.sessionNote.trim();
    if (!note) return;
    this.busy.set(true);
    this.portal.saveRecommendations(this.bookingId, this.picksPayload()).subscribe({
      next: () => this.portal.complete(this.bookingId, note).subscribe({
        next: () => {
          this.busy.set(false);
          this.booking.update(b => (b ? { ...b, status: 'COMPLETED' } : b));
          this.api.showToast('Session completed. Your recommendations are now on her account.');
        },
        error: err => { this.busy.set(false); this.api.showToast(err?.error?.message || 'Couldn’t complete the session.'); }
      }),
      error: err => { this.busy.set(false); this.api.showToast(err?.error?.message || 'Couldn’t save your recommendations, so the session wasn’t completed.'); }
    });
  }

  priorityLabel(p: RecommendationPriority): string {
    return PRIORITY_LABELS[p];
  }

  riskLabels(list: RiskFactor[]): string {
    return list.map(r => RISK_FACTOR_LABELS[r] ?? r).join(', ');
  }

  stageLabel(s: string): string {
    return ({ MONTH_3: 'First trimester', MONTH_6: 'Second trimester', MONTH_9: 'Third trimester', BABY_CARE: 'Postpartum / baby care',
      PREGNANCY: 'Pregnant', PRE_DELIVERY: 'Close to delivery', POSTPARTUM: 'Postpartum' } as Record<string, string>)[s] ?? s;
  }

  statusLabel(s: string): string {
    return ({ BOOKED: 'Booked', IN_PROGRESS: 'In progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled' } as Record<string, string>)[s] ?? s;
  }
}
