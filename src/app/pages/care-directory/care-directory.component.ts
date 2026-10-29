import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProviderService } from '../../services/provider.service';
import { PROFESSIONAL_TYPE_LABELS } from '../../models/maternal.models';
import { ProfessionalTypeKey } from '../../models/provider.models';

@Component({
  selector: 'app-care-directory',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="directory-page">
      <div class="container">
        <div class="directory-header">
          <h1>Find Your Care Team</h1>
          <p>Verified professionals you can book sessions with using your care plan.</p>
          <a routerLink="/care/bookings" class="btn btn-outline">My Bookings</a>
        </div>

        <div class="filters">
          <div class="type-pills">
            <button type="button" class="pill" [class.active]="typeFilter() === null" (click)="typeFilter.set(null)">All</button>
            @for (t of types; track t) {
              <button type="button" class="pill" [class.active]="typeFilter() === t" (click)="typeFilter.set(t)">{{ label(t) }}</button>
            }
          </div>
          <label class="virtual-toggle">
            <input type="checkbox" [checked]="virtualOnly()" (change)="virtualOnly.set(!virtualOnly())" />
            Virtual only
          </label>
        </div>

        <div class="provider-grid">
          @for (p of filteredProviders(); track p.id) {
            <a [routerLink]="['/care', p.id]" class="provider-card card">
              <span class="avatar">{{ p.avatar }}</span>
              <h3>{{ p.name }}</h3>
              <span class="type-tag">{{ label(p.type) }}</span>
              <p class="credentials">{{ p.credentialsSummary }}</p>
              <div class="meta-row">
                <span>⭐ {{ p.rating }}</span>
                <span>📍 {{ p.city }}</span>
                @if (p.virtual) { <span>💻 Virtual</span> }
              </div>
            </a>
          } @empty {
            <p class="field-hint">No providers match these filters.</p>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .directory-page { padding: 3rem 0 5rem; }
    .directory-header { text-align: center; max-width: 620px; margin: 0 auto 2rem; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
    .directory-header h1 { font-size: 2rem; color: var(--sage-900); }
    .directory-header p { color: var(--text-secondary); }

    .filters { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; margin-bottom: 2rem; }
    .type-pills { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; }
    .pill { padding: 0.45rem 0.9rem; border-radius: var(--radius-full); border: 1.5px solid var(--border-color); background: #fff; font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); cursor: pointer; }
    .pill.active { background: var(--sage-900); color: #fff; border-color: var(--sage-900); }
    .virtual-toggle { font-size: 0.85rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.4rem; }

    .provider-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
    .provider-card { padding: 1.5rem; border-radius: var(--radius-xl); border: 1px solid var(--border-light); background: #fff; text-decoration: none; display: flex; flex-direction: column; transition: box-shadow 0.2s, transform 0.2s; }
    .provider-card:hover { box-shadow: 0 12px 28px rgba(27,51,39,0.1); transform: translateY(-2px); }
    .avatar { font-size: 2.25rem; margin-bottom: 0.5rem; }
    .provider-card h3 { font-size: 1.1rem; color: var(--sage-900); margin-bottom: 0.25rem; }
    .type-tag { font-size: 0.72rem; font-weight: 700; color: var(--blush-700); text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 0.5rem; }
    .credentials { font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 0.75rem; }
    .meta-row { display: flex; gap: 0.85rem; font-size: 0.78rem; color: var(--text-muted); margin-top: auto; }

    @media (max-width: 992px) { .provider-grid { grid-template-columns: 1fr; } }
  `]
})
export class CareDirectoryComponent {
  private providerService = inject(ProviderService);
  router = inject(Router);

  types: ProfessionalTypeKey[] = ['GYNECOLOGIST', 'NUTRITIONIST', 'LACTATION_CONSULTANT', 'PEDIATRICIAN', 'POSTPARTUM_PHYSIOTHERAPIST', 'CLINICAL_PSYCHOLOGIST'];
  typeFilter = signal<ProfessionalTypeKey | null>(null);
  virtualOnly = signal(false);

  private providers = this.providerService.getProviders();

  filteredProviders = computed(() => {
    return this.providers.filter(p => {
      if (this.typeFilter() && p.type !== this.typeFilter()) return false;
      if (this.virtualOnly() && !p.virtual) return false;
      return true;
    });
  });

  label(type: ProfessionalTypeKey): string {
    return PROFESSIONAL_TYPE_LABELS[type] || type;
  }
}
