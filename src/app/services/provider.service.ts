import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { CommerceService } from './commerce.service';
import { Booking, MOCK_PROVIDERS, Provider, Slot, generateUpcomingSlots } from '../models/provider.models';

/**
 * Phase 3 (Providers, booking & sessions) — implemented client-side, same approach as
 * CommerceService. No Provider/Booking endpoints exist on the API yet. Bookings persist to
 * localStorage per signed-in user id; booked/cancelled slot state does too (a real backend
 * would need this shared across users for double-booking prevention — this mock can't
 * enforce that across devices, only within one browser).
 */
@Injectable({ providedIn: 'root' })
export class ProviderService {
  private api = inject(ApiService);
  private commerce = inject(CommerceService);

  getProviders(): Provider[] {
    return MOCK_PROVIDERS;
  }

  getProvider(id: number): Provider | undefined {
    return MOCK_PROVIDERS.find(p => p.id === id);
  }

  getSlots(providerId: number): Slot[] {
    const bookedIds = new Set(
      this.getBookings()
        .filter(b => b.providerId === providerId && b.status === 'CONFIRMED')
        .map(b => b.slotId)
    );
    return generateUpcomingSlots(providerId).map(s => ({ ...s, booked: bookedIds.has(s.id) }));
  }

  getBookings(): Booking[] {
    return this.readJson<Booking[]>(this.bookingsKey(), []);
  }

  /** Throws if no provider/slot found, or if the user has no entitlement session available. */
  book(providerId: number, slot: Slot): Booking {
    const provider = this.getProvider(providerId);
    if (!provider) {
      throw new Error('Provider not found.');
    }
    const entitlement = this.commerce.consumeSession();
    if (!entitlement) {
      throw new Error('NO_SESSIONS_AVAILABLE');
    }

    const booking: Booking = {
      id: 'bkg_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      providerId: provider.id,
      providerName: provider.name,
      providerType: provider.type,
      slotId: slot.id,
      startsAt: slot.startsAt,
      durationMinutes: slot.durationMinutes,
      status: 'CONFIRMED',
      entitlementId: entitlement.id,
      createdAt: new Date().toISOString()
    };

    const bookings = this.getBookings();
    bookings.push(booking);
    this.writeJson(this.bookingsKey(), bookings);
    return booking;
  }

  cancel(bookingId: string) {
    const bookings = this.getBookings();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking || booking.status !== 'CONFIRMED') return;
    booking.status = 'CANCELLED';
    this.writeJson(this.bookingsKey(), bookings);
    this.commerce.refundSession(booking.entitlementId);
  }

  /** Cancels the old slot's hold and books a new one, refunding/consuming sessions correctly. */
  reschedule(bookingId: string, newSlot: Slot): Booking {
    const bookings = this.getBookings();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking || booking.status !== 'CONFIRMED') {
      throw new Error('Booking not found or not active.');
    }
    booking.slotId = newSlot.id;
    booking.startsAt = newSlot.startsAt;
    booking.durationMinutes = newSlot.durationMinutes;
    this.writeJson(this.bookingsKey(), bookings);
    return booking;
  }

  private bookingsKey(): string {
    return `nb_bookings_${this.api.currentUser()?.id ?? 'guest'}`;
  }

  private readJson<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) as T : fallback;
    } catch {
      return fallback;
    }
  }

  private writeJson(key: string, value: unknown) {
    localStorage.setItem(key, JSON.stringify(value));
  }
}
