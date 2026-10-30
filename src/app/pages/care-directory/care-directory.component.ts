import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProviderService } from '../../services/provider.service';
import { PROFESSIONAL_TYPE_LABELS } from '../../models/maternal.models';
import { CareMatch, Modality, ProfessionalTypeKey, Provider, providerInitials } from '../../models/provider.models';
import { ApiService } from '../../services/api.service';
import { OnboardingService } from '../../services/onboarding.service';

/** Provider directory — public GET /api/v1/providers; only VERIFIED/ACTIVE providers are ever listed. */
@Component({
  selector: 'app-care-directory',
  standalone: true,
  imports: [MatIconModule, CommonModule, FormsModule, RouterLink],
  template: `
    <div class="directory-page">
      <div class="container">
        <div class="directory-header animate-in">
          <h1>Find Your Care Team</h1>
          <p>Every professional listed here has been credential-verified by NartureBelle.</p>
          <a routerLink="/care/bookings" class="btn btn-outline btn-sm"><mat-icon class="icon-sm">event_note</mat-icon> My Bookings</a>
        </div>

        <div class="filters glass-soft">
          <div class="type-pills">
            <button type="button" class="pill" [class.active]="typeFilter() === null" (click)="setType(null)">All</button>
            @for (t of types; track t) {
              <button type="button" class="pill" [class.active]="typeFilter() === t" (click)="setType(t)">{{ label(t) }}</button>
            }
          </div>
          <div class="filter-row">
            <div class="search-field">
              <mat-icon class="icon-sm">location_on</mat-icon>
              <input class="form-control" placeholder="City" [(ngModel)]="city" (keyup.enter)="load()" />
            </div>
            <div class="search-field">
              <mat-icon class="icon-sm">translate</mat-icon>
              <input class="form-control" placeholder="Language" [(ngModel)]="language" (keyup.enter)="load()" />
            </div>
            <label class="virtual-toggle">
              <input type="checkbox" [checked]="virtualOnly()" (change)="toggleVirtual()" />
              Virtual only
            </label>
            <button type="button" class="btn btn-primary btn-sm" (click)="load()">Search</button>
          </div>
        </div>

        @if (typeFilter() && matchesState() !== 'hidden') {
          <section class="matches glass-soft">
            <h2><mat-icon class="icon-sm">auto_awesome</mat-icon> Best matches for you</h2>
            @if (matchesState() === 'loading') {
              <p class="field-hint">Finding {{ label(typeFilter()!) | lowercase }}s who fit you…</p>
            } @else if (matchesState() === 'incomplete') {
              <p class="field-hint">Tell us the languages you’re comfortable in, and we’ll match you with professionals who speak them.</p>
            } @else if (matches().length === 0) {
              <p class="field-hint">No {{ label(typeFilter()!) | lowercase }} who speaks your language{{ matchCriteria() ? ' (' + matchCriteria() + ')' : '' }} has an open time right now.
                Browse everyone below, or your care coordinator can help.</p>
            } @else {
              <div class="match-list">
                @for (m of matches(); track m.provider.id) {
                  <a [routerLink]="['/care', m.provider.id]" class="match card">
                    <span class="avatar">{{ initials(m.provider.displayName) }}</span>
                    <div class="match-body">
                      <strong>{{ m.provider.displayName }}</strong>
                      <div class="reasons">
                        @for (r of m.matchReasons; track r) { <span class="reason"><mat-icon class="icon-sm">check</mat-icon> {{ r }}</span> }
                      </div>
                      @if (m.nextSlots.length) {
                        <span class="field-hint">Next: {{ m.nextSlots[0].startAt | date:'EEE d MMM, h:mm a' }}@if (m.nextSlots.length > 1) { · +{{ m.nextSlots.length - 1 }} more }</span>
                      }
                    </div>
                  </a>
                }
              </div>
            }
          </section>
        }

        @if (loading()) {
          <div class="provider-grid">
            @for (i of [1, 2, 3]; track i) { <div class="skeleton" style="height: 190px"></div> }
          </div>
        } @else if (errorMsg()) {
          <div class="state-box">
            <mat-icon class="icon-sm">error_outline</mat-icon> {{ errorMsg() }}
            <button class="btn-link" (click)="load()">Try again</button>
          </div>
        } @else if (providers().length === 0) {
          <div class="state-box empty">
            <mat-icon class="hero-icon">groups</mat-icon>
            <p>No verified professionals match these filters yet.</p>
            <span class="field-hint">New professionals are added as they complete verification.</span>
          </div>
        } @else {
          <div class="provider-grid">
            @for (p of providers(); track p.id; let i = $index) {
              <a [routerLink]="['/care', p.id]" class="provider-card card animate-in" [style.animation-delay.ms]="i * 60">
                <span class="avatar">{{ initials(p.displayName) }}</span>
                <h3>{{ p.displayName }}</h3>
                <span class="type-tag">{{ label(p.professionalType) }} <mat-icon class="verified-mark">verified</mat-icon></span>
                @if (p.bio) { <p class="bio">{{ p.bio }}</p> }
                <div class="meta-row">
                  @if (p.city) { <span><mat-icon class="icon-sm">location_on</mat-icon> {{ p.city }}</span> }
                  @if (p.languages.length) { <span><mat-icon class="icon-sm">translate</mat-icon> {{ p.languages.join(', ') }}</span> }
                  @for (m of modalities(p); track m) {
                    <span><mat-icon class="icon-sm">{{ m === 'VIRTUAL' ? 'videocam' : 'apartment' }}</mat-icon> {{ m === 'VIRTUAL' ? 'Virtual' : 'In person' }}</span>
                  }
                </div>
              </a>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .matches { border-radius: var(--radius-xl); padding: 1.1rem 1.25rem; margin-bottom: 1.5rem; }
    .matches h2 { display: flex; align-items: center; gap: 0.4rem; font-size: 1.05rem; color: var(--sage-900); margin-bottom: 0.6rem; }
    .match-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.75rem; }
    .match { display: flex; gap: 0.75rem; align-items: flex-start; padding: 0.85rem 1rem; text-decoration: none; color: inherit; }
    .match-body { display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
    .match-body strong { color: var(--sage-900); }
    .reasons { display: flex; flex-wrap: wrap; gap: 0.25rem 0.6rem; }
    .reason { display: inline-flex; align-items: center; gap: 0.15rem; font-size: 0.75rem; color: var(--sage-700); font-weight: 600; }
    .directory-page { padding: 3rem 0 5rem; }
    .directory-header { text-align: center; max-width: 620px; margin: 0 auto 2rem; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
    .directory-header h1 { font-size: 2rem; color: var(--sage-900); }
    .directory-header p { color: var(--text-secondary); }

    .filters { border-radius: var(--radius-lg); padding: 1.25rem; margin-bottom: 2rem; display: flex; flex-direction: column; gap: 1rem; }
    .type-pills { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; }
    .pill { padding: 0.45rem 0.9rem; border-radius: var(--radius-full); border: 1.5px solid var(--border-light); background: #fff; font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: all var(--transition-fast); }
    .pill:hover { border-color: var(--sage-500); }
    .pill.active { background: var(--sage-900); color: #fff; border-color: var(--sage-900); }
    .filter-row { display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center; align-items: center; }
    .search-field { display: flex; align-items: center; gap: 0.35rem; color: var(--text-muted); }
    .search-field .form-control { width: 170px; padding: 0.5rem 0.75rem; }
    .virtual-toggle { font-size: 0.85rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.4rem; cursor: pointer; }

    .provider-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
    .provider-card { padding: 1.5rem; border-radius: var(--radius-xl); text-decoration: none; display: flex; flex-direction: column; }
    .avatar { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.05rem; letter-spacing: 0.02em; color: var(--sage-800); background: linear-gradient(135deg, var(--sage-100), var(--trust-100)); border: 1px solid var(--border-light); margin-bottom: 0.85rem; }
    .provider-card h3 { font-size: 1.1rem; color: var(--sage-900); margin-bottom: 0.25rem; }
    .type-tag { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.72rem; font-weight: 700; color: var(--blush-700); text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 0.5rem; }
    .verified-mark { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; color: var(--trust-500); }
    .bio { font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 0.75rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .meta-row { display: flex; gap: 0.85rem; font-size: 0.78rem; color: var(--text-muted); margin-top: auto; flex-wrap: wrap; }
    .meta-row span { display: inline-flex; align-items: center; gap: 0.2rem; }

    .state-box { display: flex; align-items: center; justify-content: center; gap: 0.6rem; flex-wrap: wrap; max-width: 560px; margin: 0 auto; padding: 1rem 1.25rem; border-radius: var(--radius-md); background: #fdecea; color: #a0281c; border: 1px solid #f5b7b1; font-size: 0.9rem; }
    .state-box.empty { flex-direction: column; background: var(--bg-glass-strong); color: var(--text-secondary); border-color: var(--border-light); padding: 2.5rem 1.5rem; text-align: center; }
    .field-hint { font-size: 0.8rem; color: var(--text-muted); }

    @media (max-width: 992px) { .provider-grid { grid-template-columns: 1fr; } }
  `]
})
export class CareDirectoryComponent implements OnInit {
  private providerService = inject(ProviderService);
  private api = inject(ApiService);
  private onboarding = inject(OnboardingService);

  types: ProfessionalTypeKey[] = ['GYNECOLOGIST', 'NUTRITIONIST', 'LACTATION_CONSULTANT', 'PEDIATRICIAN', 'POSTPARTUM_PHYSIOTHERAPIST', 'CLINICAL_PSYCHOLOGIST', 'REGISTERED_NURSE'];
  typeFilter = signal<ProfessionalTypeKey | null>(null);
  virtualOnly = signal(false);
  city = '';
  language = '';

  providers = signal<Provider[]>([]);
  loading = signal(true);
  errorMsg = signal<string | null>(null);

  /** "hidden" when signed out / not onboarded / the API has no matching endpoint. */
  matchesState = signal<'hidden' | 'loading' | 'ready' | 'incomplete'>('hidden');
  matches = signal<CareMatch[]>([]);
  matchCriteria = signal('');

  ngOnInit() {
    this.load();
  }

  setType(t: ProfessionalTypeKey | null) {
    this.typeFilter.set(t);
    this.load();
    this.loadMatches();
  }

  toggleVirtual() {
    this.virtualOnly.set(!this.virtualOnly());
    this.load();
    this.loadMatches();
  }

  /** GET /me/care/matches for the picked type — only for signed-in, onboarded users. */
  private loadMatches() {
    const type = this.typeFilter();
    if (!type || !this.api.currentUser() || !this.onboarding.onboarded()) {
      this.matchesState.set('hidden');
      return;
    }
    this.matchesState.set('loading');
    this.providerService.getMatches(type, this.virtualOnly() ? 'VIRTUAL' : null).subscribe({
      next: res => {
        this.matches.set(res.matches);
        const c = res.criteria;
        this.matchCriteria.set([c.languages?.join(', '), c.modality === 'PHYSICAL' && c.city ? 'in ' + c.city : ''].filter(Boolean).join(', '));
        this.matchesState.set('ready');
      },
      error: err => {
        // 409: intake has no languages yet. Anything else (e.g. an API without this endpoint): just don't show the section.
        this.matchesState.set(err?.error?.code === 'MATCH_PROFILE_INCOMPLETE' ? 'incomplete' : 'hidden');
      }
    });
  }

  load() {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.providerService.getProviders({
      professionalType: this.typeFilter(),
      city: this.city.trim() || null,
      language: this.language.trim() || null,
      modality: this.virtualOnly() ? 'VIRTUAL' : null
    }).subscribe({
      next: (list) => {
        this.providers.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMsg.set("We couldn't load care professionals right now.");
      }
    });
  }

  modalities(p: Provider): Modality[] {
    return [...new Set((p.services ?? []).map(s => s.modality))];
  }

  initials(name: string): string {
    return providerInitials(name);
  }

  label(type: string): string {
    return (PROFESSIONAL_TYPE_LABELS as Record<string, string>)[type] || (type === 'REGISTERED_NURSE' ? 'Registered Nurse' : type);
  }
}
