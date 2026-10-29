import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProviderService } from '../../services/provider.service';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { PROFESSIONAL_TYPE_LABELS } from '../../models/maternal.models';
import { Booking, Slot } from '../../models/provider.models';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="bookings-page">
      <div class="container">
        <h1>My Bookings</h1>

        @if (bookings().length === 0) {
          <p class="field-hint">No bookings yet.</p>
          <a routerLink="/care" class="btn btn-primary">Find a Provider</a>
        } @else {
          <div class="booking-list">
            @for (b of bookings(); track b.id) {
              <div class="booking-card card">
                <div class="booking-info">
                  <span class="status-badge" [class]="'status-' + b.status.toLowerCase()">{{ b.status }}</span>
                  <h3>{{ b.providerName }}</h3>
                  <span class="type-tag">{{ label(b.providerType) }}</span>
                  <p>{{ b.startsAt | date:'EEE, MMM d, y · h:mm a' }}</p>
                </div>

                @if (b.status === 'CONFIRMED') {
                  @if (rescheduling() === b.id) {
                    <div class="reschedule-box">
                      @for (slot of availableSlots(b.providerId); track slot.id) {
                        <button type="button" class="slot-btn" [disabled]="slot.booked" (click)="confirmReschedule(b, slot)">
                          {{ slot.startsAt | date:'EEE, MMM d · h:mm a' }}
                        </button>
                      }
                      <button type="button" class="btn-link" (click)="rescheduling.set(null)">Cancel</button>
                    </div>
                  } @else {
                    <div class="booking-actions">
                      <button class="btn btn-outline btn-sm" (click)="rescheduling.set(b.id)">Reschedule</button>
                      <button class="btn btn-outline btn-sm cancel-btn" (click)="cancelBooking(b.id)">Cancel</button>
                    </div>
                  }
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .bookings-page { padding: 3rem 0 5rem; max-width: 720px; margin: 0 auto; }
    h1 { font-size: 1.85rem; color: var(--sage-900); margin-bottom: 1.75rem; text-align: center; }
    .booking-list { display: flex; flex-direction: column; gap: 1.25rem; }
    .booking-card { padding: 1.5rem; border-radius: var(--radius-xl); background: #fff; border: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
    .status-badge { display: inline-block; font-size: 0.68rem; font-weight: 800; text-transform: uppercase; padding: 0.2rem 0.6rem; border-radius: var(--radius-full); margin-bottom: 0.5rem; }
    .status-confirmed { background: var(--sage-100); color: var(--sage-900); }
    .status-cancelled { background: #fdecea; color: #a0281c; }
    .status-completed { background: var(--blush-100); color: var(--blush-700); }
    .booking-info h3 { font-size: 1.05rem; color: var(--sage-900); margin-bottom: 0.2rem; }
    .type-tag { font-size: 0.72rem; font-weight: 700; color: var(--blush-700); text-transform: uppercase; }
    .booking-info p { font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.4rem; }

    .booking-actions { display: flex; gap: 0.5rem; }
    .btn-sm { padding: 0.5rem 0.9rem; font-size: 0.8rem; border-radius: 8px; font-weight: 700; cursor: pointer; }
    .btn-outline { background: transparent; border: 1.5px solid var(--border-color); color: var(--text-secondary); }
    .cancel-btn:hover { background: #fdecea; color: #a0281c; border-color: #f5b7b1; }

    .reschedule-box { display: flex; flex-direction: column; gap: 0.4rem; max-width: 220px; }
    .slot-btn { padding: 0.45rem 0.6rem; border-radius: 6px; border: 1px solid var(--border-color); background: #fff; font-size: 0.78rem; cursor: pointer; }
    .slot-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-link { background: none; border: none; color: var(--text-muted); font-size: 0.78rem; text-decoration: underline; cursor: pointer; }
  `]
})
export class BookingsComponent implements OnInit {
  private providerService = inject(ProviderService);
  private api = inject(ApiService);
  private notifications = inject(NotificationService);

  bookings = signal<Booking[]>([]);
  rescheduling = signal<string | null>(null);

  ngOnInit() {
    this.refresh();
  }

  private refresh() {
    const bookings = this.providerService.getBookings().sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    this.bookings.set(bookings);
    this.notifications.syncFromBookings(bookings);
  }

  availableSlots(providerId: number): Slot[] {
    return this.providerService.getSlots(providerId);
  }

  label(type: Booking['providerType']): string {
    return PROFESSIONAL_TYPE_LABELS[type] || type;
  }

  cancelBooking(id: string) {
    this.providerService.cancel(id);
    this.refresh();
    this.api.showToast('Booking cancelled — your session was refunded to your care plan.');
  }

  confirmReschedule(booking: Booking, slot: Slot) {
    if (slot.booked) return;
    this.providerService.reschedule(booking.id, slot);
    this.rescheduling.set(null);
    this.refresh();
    this.api.showToast('Booking rescheduled.');
  }
}
