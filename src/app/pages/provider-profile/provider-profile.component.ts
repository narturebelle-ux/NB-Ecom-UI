import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProviderService } from '../../services/provider.service';
import { CommerceService } from '../../services/commerce.service';
import { ApiService } from '../../services/api.service';
import { PROFESSIONAL_TYPE_LABELS } from '../../models/maternal.models';
import { Provider, ServiceOffering, Slot, providerInitials } from '../../models/provider.models';

/**
 * Provider profile + slot picker against the real API (§9). Booking needs the user to hold
 * an entitlement of this provider's professional type (the API 409s otherwise) but doesn't
 * consume it — only the provider completing the session does.
 */
@Component({
  selector: 'app-provider-profile',
  standalone: true,
  imports: [MatIconModule, CommonModule, RouterLink],
  template: `
    <div class="profile-page">
      <div class="container">
        @if (loading()) {
          <div class="skeleton" style="height: 180px; margin-bottom: 1.5rem"></div>
          <div class="skeleton" style="height: 140px"></div>
        } @else if (!provider()) {
          <div class="state-box">
            <mat-icon class="hero-icon">person_search</mat-icon>
            <p>This professional isn't available right now.</p>
            <a routerLink="/care" class="btn btn-outline">Back to Directory</a>
          </div>
        } @else {
          <div class="provider-header glass animate-in">
            <span class="avatar">{{ initials(provider()!.displayName) }}</span>
            <div>
              <h1>{{ provider()!.displayName }}</h1>
              <span class="type-tag">{{ label(provider()!.professionalType) }}
                <span class="verified-pill"><mat-icon class="icon-sm">verified</mat-icon> Verified</span>
              </span>
              @if (provider()!.bio) { <p class="bio">{{ provider()!.bio }}</p> }
              <div class="meta-row">
                @if (provider()!.city) { <span><mat-icon class="icon-sm">location_on</mat-icon> {{ provider()!.city }}</span> }
                @if (provider()!.languages.length) { <span><mat-icon class="icon-sm">translate</mat-icon> {{ provider()!.languages.join(', ') }}</span> }
              </div>
            </div>
          </div>

          @if (!services().length) {
            <div class="status-banner is-info">
              <mat-icon class="icon-sm">info</mat-icon>
              {{ provider()!.displayName }} isn't taking online bookings yet. Please check back soon.
            </div>
          } @else if (!availableEntitlement()) {
            <div class="status-banner is-warning">
              Your care plan doesn't have any {{ label(provider()!.professionalType) }} sessions left.
              <a routerLink="/plans">See care plans</a> to add sessions.
            </div>
          } @else {
            <p class="sessions-left">
              <mat-icon class="icon-sm">event_available</mat-icon>
              {{ availableEntitlement()!.remainingSessions }} {{ label(provider()!.professionalType) }} session(s) on your plan — one is used only once your session is completed.
            </p>

            @if (services().length > 1) {
              <h2 class="section-title">Choose a session type</h2>
              <div class="service-list">
                @for (s of services(); track s.id) {
                  <button type="button" class="service-option" [class.selected]="selectedService()?.id === s.id" (click)="selectedService.set(s)">
                    <strong>{{ s.name }}</strong>
                    <span>{{ s.durationMinutes }} min · {{ s.modality === 'VIRTUAL' ? 'Virtual' : 'In person' }}</span>
                  </button>
                }
              </div>
            } @else {
              <p class="single-service">
                <mat-icon class="icon-sm">{{ selectedService()?.modality === 'VIRTUAL' ? 'videocam' : 'apartment' }}</mat-icon>
                {{ selectedService()?.name }} · {{ selectedService()?.durationMinutes }} min · {{ selectedService()?.modality === 'VIRTUAL' ? 'Virtual' : 'In person' }}
              </p>
            }

            <h2 class="section-title">Pick a time</h2>
            @if (bookedMsg()) {
              <div class="status-banner is-success"><mat-icon class="icon-sm">check_circle</mat-icon> {{ bookedMsg() }} <a routerLink="/care/bookings">View my bookings</a></div>
            }
            @if (slots().length === 0) {
              <p class="field-hint">No open times right now — new availability is added regularly.</p>
            } @else {
              <div class="slots-grid">
                @for (slot of slots(); track slot.id) {
                  <button type="button" class="slot-btn" [disabled]="booking()" (click)="bookSlot(slot)">
                    <span class="slot-day">{{ slot.startAt | date:'EEE, MMM d' }}</span>
                    <span class="slot-time">{{ slot.startAt | date:'h:mm a' }}</span>
                  </button>
                }
              </div>
            }
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .profile-page { padding: 3rem 0 5rem; max-width: 900px; margin: 0 auto; }
    .provider-header { display: flex; gap: 1.5rem; padding: 2rem; border-radius: var(--radius-xl); margin-bottom: 2rem; }
    .avatar { width: 84px; height: 84px; flex-shrink: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.6rem; color: var(--sage-800); background: linear-gradient(135deg, var(--sage-100), var(--trust-100)); border: 1px solid var(--border-light); box-shadow: var(--shadow-sm); }
    .provider-header h1 { font-size: 1.6rem; color: var(--sage-900); margin-bottom: 0.35rem; }
    .type-tag { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; font-weight: 700; color: var(--blush-700); text-transform: uppercase; letter-spacing: 0.03em; flex-wrap: wrap; }
    .verified-pill { display: inline-flex; align-items: center; gap: 0.2rem; text-transform: none; letter-spacing: 0; font-size: 0.72rem; color: var(--trust-900); background: var(--trust-100); border: 1px solid var(--trust-200); padding: 0.1rem 0.5rem; border-radius: var(--radius-full); }
    .bio { font-size: 0.9rem; color: var(--text-secondary); margin: 0.75rem 0; line-height: 1.55; }
    .meta-row { display: flex; gap: 1rem; font-size: 0.82rem; color: var(--text-muted); flex-wrap: wrap; }
    .meta-row span { display: inline-flex; align-items: center; gap: 0.25rem; }

    .status-banner { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; padding: 0.85rem 1.1rem; border-radius: 10px; margin-bottom: 1.5rem; font-size: 0.88rem; font-weight: 600; }
    .status-banner a { text-decoration: underline; color: inherit; }
    .status-banner.is-warning { background: #fff8eb; color: #92610a; border: 1px solid #fbd38d; }
    .status-banner.is-info { background: var(--trust-50); color: var(--trust-900); border: 1px solid var(--trust-200); }
    .status-banner.is-success { background: #e8f5ec; color: #1b6b3a; border: 1px solid #b2dfca; }
    .sessions-left { display: flex; align-items: center; gap: 0.4rem; font-size: 0.86rem; font-weight: 600; color: var(--trust-700); background: var(--trust-50); border: 1px solid var(--trust-200); border-radius: var(--radius-md); padding: 0.65rem 0.9rem; margin-bottom: 1.5rem; }

    .section-title { font-family: var(--font-sans); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); margin-bottom: 0.85rem; }
    .service-list { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.75rem; }
    .service-option { display: flex; flex-direction: column; align-items: flex-start; gap: 0.2rem; padding: 0.85rem 1.1rem; border-radius: var(--radius-md); border: 1.5px solid var(--border-light); background: #fff; text-align: left; transition: all var(--transition-fast); }
    .service-option strong { font-size: 0.9rem; color: var(--sage-900); }
    .service-option span { font-size: 0.78rem; color: var(--text-muted); }
    .service-option.selected { border-color: var(--sage-700); box-shadow: var(--shadow-glow-trust); }
    .single-service { display: flex; align-items: center; gap: 0.4rem; font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 1.75rem; }

    .slots-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; }
    .slot-btn { display: flex; flex-direction: column; gap: 0.15rem; padding: 0.75rem; border-radius: var(--radius-md); border: 1.5px solid var(--border-light); background: #fff; cursor: pointer; transition: all var(--transition-fast); }
    .slot-btn:hover:not(:disabled) { border-color: var(--sage-600); background: var(--sage-50); transform: translateY(-2px); }
    .slot-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .slot-day { font-size: 0.75rem; color: var(--text-muted); font-weight: 600; }
    .slot-time { font-size: 0.95rem; color: var(--sage-900); font-weight: 700; }
    .field-hint { font-size: 0.85rem; color: var(--text-muted); }

    .state-box { text-align: center; padding: 3rem 1rem; color: var(--text-secondary); }
    .state-box p { margin-bottom: 1.25rem; }

    @media (max-width: 768px) { .slots-grid { grid-template-columns: repeat(2, 1fr); } .provider-header { flex-direction: column; } }
  `]
})
export class ProviderProfileComponent implements OnInit {
  private providerService = inject(ProviderService);
  private commerce = inject(CommerceService);
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  provider = signal<Provider | undefined>(undefined);
  slots = signal<Slot[]>([]);
  selectedService = signal<ServiceOffering | undefined>(undefined);
  booking = signal(false);
  bookedMsg = signal<string | null>(null);

  services = computed(() => this.provider()?.services ?? []);
  availableEntitlement = computed(() => {
    const p = this.provider();
    return p ? this.commerce.findAvailable(p.professionalType) : undefined;
  });

  private providerId = 0;

  ngOnInit() {
    this.providerId = Number(this.route.snapshot.paramMap.get('id'));
    this.commerce.loadEntitlements().subscribe({ error: () => {} });
    this.providerService.getProvider(this.providerId).subscribe({
      next: (p) => {
        this.provider.set(p);
        this.selectedService.set(p.services?.[0]);
        this.loading.set(false);
        this.loadSlots();
      },
      error: () => this.loading.set(false)
    });
  }

  private loadSlots() {
    this.providerService.getSlots(this.providerId).subscribe({
      next: (slots) => this.slots.set(slots),
      error: () => this.slots.set([])
    });
  }

  initials(name: string): string {
    return providerInitials(name);
  }

  label(type: string): string {
    return (PROFESSIONAL_TYPE_LABELS as Record<string, string>)[type] || (type === 'REGISTERED_NURSE' ? 'Registered Nurse' : type);
  }

  bookSlot(slot: Slot) {
    const p = this.provider();
    const service = this.selectedService();
    if (!p || !service || this.booking()) return;
    this.booking.set(true);
    this.bookedMsg.set(null);
    this.providerService.book(p.id, service.id, slot.id).subscribe({
      next: (b) => {
        this.booking.set(false);
        this.bookedMsg.set(`Booked for ${new Date(b.scheduledStart).toLocaleString()}.`);
        this.api.showToast(`Session with ${p.displayName} booked.`);
        this.loadSlots();
      },
      error: (err) => {
        this.booking.set(false);
        if (err?.status === 401 || err?.status === 403) return; // interceptor handles redirects
        const code = err?.error?.code;
        if (code === 'SLOT_NOT_AVAILABLE') {
          this.api.showToast('That time was just taken — please pick another.');
          this.loadSlots();
        } else if (code === 'NO_ENTITLEMENT_AVAILABLE') {
          this.api.showToast(`Your plan has no ${this.label(p.professionalType)} sessions left.`);
          this.commerce.loadEntitlements().subscribe({ error: () => {} });
        } else {
          this.api.showToast(err?.error?.message || 'Could not book that time. Please try again.');
        }
      }
    });
  }
}
