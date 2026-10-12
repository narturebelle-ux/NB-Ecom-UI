import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FeatureFlags, DEFAULT_FEATURES } from '../models/feature-toggle.model';
import { environment } from '../../environments/environment';
import { catchError, of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FeatureToggleService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/features`;

  // Reactive Signal holding live feature flags
  readonly flags = signal<FeatureFlags>(DEFAULT_FEATURES);

  constructor() {
    this.loadFeatures();
  }

  loadFeatures(): void {
    this.http.get<FeatureFlags>(this.apiUrl).pipe(
      catchError(err => {
        console.warn('Failed to fetch remote feature toggles, using default values:', err);
        return of(DEFAULT_FEATURES);
      }),
      tap(remoteFlags => {
        this.flags.set({ ...DEFAULT_FEATURES, ...remoteFlags });
      })
    ).subscribe();
  }

  isEnabled(feature: keyof FeatureFlags): boolean {
    const current = this.flags();
    return current[feature] ?? false;
  }

  // Helper for manual developer override (e.g. testing in browser console)
  setOverride(feature: keyof FeatureFlags, enabled: boolean): void {
    this.flags.update(current => ({
      ...current,
      [feature]: enabled
    }));
  }
}
