import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProviderService } from '../../services/provider.service';
import { CommerceService } from '../../services/commerce.service';
import { ApiService } from '../../services/api.service';
import { PROFESSIONAL_TYPE_LABELS } from '../../models/maternal.models';
import { Provider, Slot, providerInitials } from '../../models/provider.models';

@Component({
  selector: 'app-provider-profile',
  standalone: true,
  imports: [MatIconModule, CommonModule, RouterLink],
  template: `
    <div class="profile-page">
      <div class="container">
        @if (!provider()) {
          <p class="field-hint">Provider not found.</p>
          <a routerLink="/care" class="btn btn-outline">Back to Directory</a>
        } @else {
          <div class="provider-header card">
            <span class="avatar">{{ initials(provider()!.name) }}</span>
            <div>
              <h1>{{ provider()!.name }}</h1>
              <span class="type-tag">{{ label(provider()!.type) }}</span>
              <p class="credentials">{{ provider()!.credentialsSummary }}</p>
              <p class="bio">{{ provider()!.bio }}</p>
              <div class="meta-row">
                <span><mat-icon class="icon-sm">star</mat-icon> {{ provider()!.rating }}</span>
                <span><mat-icon class="icon-sm">location_on</mat-icon> {{ provider()!.city }}</span>
                <span><mat-icon class="icon-sm">translate</mat-icon> {{ provider()!.languages.join(', ') }}</span>
              </div>
            </div>
          </div>

          @if (!commerce.hasAvailableSession()) {
            <div class="status-banner is-warning">
              You don't have any sessions left on your current care plan.
              <a routerLink="/plans">Choose a plan</a> to book a session.
            </div>
          } @else {
            <h2 class="slots-title">Pick a Time</h2>
            @if (bookedMsg()) {
              <div class="status-banner is-success">{{ bookedMsg() }}</div>
            }
            <div class="slots-grid">
              @for (slot of slots(); track slot.id) {
                <button
                  type="button"
                  class="slot-btn"
                  [disabled]="slot.booked || booking()"
                  [class.booked]="slot.booked"
                  (click)="bookSlot(slot)"
                >
                  {{ slot.startsAt | date:'EEE, MMM d · h:mm a' }}
                </button>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .profile-page { padding: 3rem 0 5rem; }
    .provider-header { display: flex; gap: 1.5rem; padding: 2rem; border-radius: var(--radius-xl); background: #fff; border: 1px solid var(--border-light); margin-bottom: 2rem; }
    .avatar { width: 84px; height: 84px; flex-shrink: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.6rem; letter-spacing: 0.02em; color: var(--sage-800); background: linear-gradient(135deg, var(--sage-100), var(--trust-100)); border: 1px solid var(--border-light); box-shadow: var(--shadow-sm); }
    .provider-header h1 { font-size: 1.6rem; color: var(--sage-900); margin-bottom: 0.25rem; }
    .type-tag { font-size: 0.75rem; font-weight: 700; color: var(--blush-700); text-transform: uppercase; letter-spacing: 0.03em; }
    .credentials { font-size: 0.88rem; color: var(--text-secondary); margin: 0.5rem 0 0.25rem; }
    .bio { font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 0.75rem; }
    .meta-row { display: flex; gap: 1rem; font-size: 0.82rem; color: var(--text-muted); flex-wrap: wrap; }
    .meta-row span { display: inline-flex; align-items: center; gap: 0.25rem; }

    .status-banner { padding: 0.85rem 1.1rem; border-radius: 10px; margin-bottom: 1.5rem; font-size: 0.88rem; font-weight: 600; }
    .status-banner.is-warning { background: #fff8eb; color: #92610a; border: 1px solid #fbd38d; }
    .status-banner.is-warning a { color: #92610a; text-decoration: underline; }
    .status-banner.is-success { background: #e8f5ec; color: #1b6b3a; border: 1px solid #b2dfca; }

    .slots-title { font-size: 1.15rem; color: var(--primary-deep); margin-bottom: 1rem; }
    .slots-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; }
    .slot-btn { padding: 0.75rem; border-radius: var(--radius-md); border: 1.5px solid var(--border-color); background: #fff; font-size: 0.82rem; font-weight: 600; color: var(--sage-900); cursor: pointer; }
    .slot-btn:hover:not(:disabled) { border-color: var(--sage-700); background: var(--sage-50); }
    .slot-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .slot-btn.booked { text-decoration: line-through; }

    @media (max-width: 768px) { .slots-grid { grid-template-columns: repeat(2, 1fr); } .provider-header { flex-direction: column; } }
  `]
})
export class ProviderProfileComponent implements OnInit {
  private providerService = inject(ProviderService);
  commerce = inject(CommerceService);
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  router = inject(Router);

  provider = signal<Provider | undefined>(undefined);
  slots = signal<Slot[]>([]);
  booking = signal(false);
  bookedMsg = signal<string | null>(null);

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const provider = this.providerService.getProvider(id);
    this.provider.set(provider);
    if (provider) {
      this.slots.set(this.providerService.getSlots(id));
    }
  }

  initials(name: string): string {
    return providerInitials(name);
  }

  label(type: Provider['type']): string {
    return PROFESSIONAL_TYPE_LABELS[type] || type;
  }

  bookSlot(slot: Slot) {
    const provider = this.provider();
    if (!provider || slot.booked) return;
    this.booking.set(true);
    try {
      this.providerService.book(provider.id, slot);
      this.slots.set(this.providerService.getSlots(provider.id));
      this.bookedMsg.set(`Booked! See it under My Bookings.`);
      this.api.showToast(`Session with ${provider.name} confirmed.`);
    } catch (err: any) {
      if (err?.message === 'NO_SESSIONS_AVAILABLE') {
        this.api.showToast('No sessions left on your care plan.');
      } else {
        this.api.showToast('Could not book that slot. Please try again.');
      }
    } finally {
      this.booking.set(false);
    }
  }
}
