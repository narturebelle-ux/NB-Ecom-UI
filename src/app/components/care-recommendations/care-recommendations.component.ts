import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { RecommendationService } from '../../services/recommendation.service';
import { PROFESSIONAL_TYPE_LABELS } from '../../models/maternal.models';
import { PRIORITY_LABELS, SessionProductRecommendation } from '../../models/session-recommendation.models';

/**
 * "From your care team": products a verified professional recommended to this mother in a completed
 * session, labelled Essential / Optional. Renders nothing while loading, on error, or when there are none.
 */
@Component({
  selector: 'app-care-recommendations',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (items().length) {
      <section class="care-recos">
        <h2><mat-icon class="icon-sm">medical_information</mat-icon> From your care team</h2>
        <p class="sub">Recommended for you by your professionals after your sessions. NartureBelle™ may earn a commission if you buy.</p>
        <div class="reco-list">
          @for (r of sorted(); track r.id) {
            <article class="reco-row">
              <img [src]="r.imageUrl" [alt]="r.name" loading="lazy" />
              <div class="reco-main">
                <div class="tags">
                  <span class="priority" [class.essential]="r.priority === 'ESSENTIAL'">{{ priorityLabel(r) }}</span>
                  <span class="category">{{ r.category }}</span>
                </div>
                <strong>{{ r.name }}</strong>
                <span class="by">Recommended by {{ r.recommendedBy.displayName }}, {{ typeLabel(r.recommendedBy.professionalType) }}@if (r.sessionDate) { · session on {{ r.sessionDate | date:'d MMM' }} }</span>
                @if (r.note) { <p class="note">“{{ r.note }}”</p> }
              </div>
              <div class="reco-side">
                <span class="price">₹{{ r.price | number }}</span>
                <button class="btn btn-outline btn-sm" (click)="addToCart(r)"><mat-icon class="icon-sm">add_shopping_cart</mat-icon> Add</button>
              </div>
            </article>
          }
        </div>
      </section>
    }
  `,
  styles: [`
    .care-recos { border-radius: var(--radius-xl); background: #fff; border: 1px solid var(--border-light); padding: 1.25rem 1.35rem; margin-bottom: 1.5rem; }
    h2 { display: flex; align-items: center; gap: 0.4rem; font-size: 1.1rem; color: var(--sage-900); }
    .sub { font-size: 0.8rem; color: var(--text-muted); margin: 0.25rem 0 0.9rem; }
    .reco-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .reco-row { display: flex; gap: 0.9rem; align-items: flex-start; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-subtle); }
    .reco-row:last-child { border-bottom: none; padding-bottom: 0; }
    img { width: 64px; height: 64px; border-radius: var(--radius-md); object-fit: cover; background: var(--sage-50); flex-shrink: 0; }
    .reco-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.2rem; }
    .tags { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .priority { font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.12rem 0.5rem; border-radius: var(--radius-full); background: var(--sage-50); color: var(--text-secondary); }
    .priority.essential { background: var(--sage-700); color: #fff; }
    .category { font-size: 0.7rem; font-weight: 700; color: var(--trust-700); text-transform: uppercase; letter-spacing: 0.05em; }
    strong { color: var(--sage-900); font-size: 0.92rem; }
    .by { font-size: 0.78rem; color: var(--text-muted); }
    .note { font-size: 0.82rem; color: var(--text-secondary); font-style: italic; }
    .reco-side { display: flex; flex-direction: column; align-items: flex-end; gap: 0.4rem; }
    .price { font-weight: 800; color: var(--sage-900); }
    @media (max-width: 520px) { .reco-row { flex-wrap: wrap; } .reco-side { flex-direction: row; align-items: center; width: 100%; justify-content: space-between; } }
  `]
})
export class CareRecommendationsComponent implements OnInit {
  private reco = inject(RecommendationService);
  private api = inject(ApiService);

  /** Kept in the API's order: newest session first, Essential first within each session. */
  items = signal<SessionProductRecommendation[]>([]);
  sorted = computed(() => this.items());

  ngOnInit() {
    this.reco.getCareRecommendations().subscribe({ next: list => this.items.set(list), error: () => {} });
  }

  priorityLabel(r: SessionProductRecommendation): string {
    return PRIORITY_LABELS[r.priority];
  }

  typeLabel(t: string): string {
    return (PROFESSIONAL_TYPE_LABELS as Record<string, string>)[t] || (t === 'REGISTERED_NURSE' ? 'Registered Nurse' : t);
  }

  addToCart(r: SessionProductRecommendation) {
    this.api.addToCart({ id: r.productId, name: r.name, price: r.price, imageUrl: r.imageUrl, category: r.category });
  }
}
