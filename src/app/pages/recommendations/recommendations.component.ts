import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { RecommendationService } from '../../services/recommendation.service';
import { PregnancyStage } from '../../models/maternal.models';
import { BUDGET_OPTIONS, Budget, ProductRecommendation, RECO_STAGE_LABELS } from '../../models/recommendation.models';

/** Phase 6 — personalised product recommendations; replaces the Month 3/6/9 store pages. */
@Component({
  selector: 'app-recommendations',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="reco-page">
      <div class="container narrow">
        <header class="reco-header">
          <span class="kicker">For you</span>
          <h1>Recommended for your stage</h1>
          @if (stageLabel()) { <p>A short list picked for {{ stageLabel() }}. Narrow it down by category and budget.</p> }
        </header>

        <div class="disclosure">
          <mat-icon class="icon-sm">info</mat-icon>
          <span>
            @if (disclosure()) { {{ disclosure() }} }
            These aren’t medical advice. Check with your care team before starting any supplement or remedy.
          </span>
        </div>

        <div class="filters">
          <div class="filter-group">
            <span class="filter-label">Category</span>
            <div class="chips">
              <button class="chip" [class.on]="category() === null" [attr.aria-pressed]="category() === null" (click)="setCategory(null)">All</button>
              @for (c of categories(); track c) {
                <button class="chip" [class.on]="category() === c" [attr.aria-pressed]="category() === c" (click)="setCategory(c)">{{ c }}</button>
              }
            </div>
          </div>
          <div class="filter-group">
            <span class="filter-label">Budget</span>
            <div class="chips">
              @for (b of budgets; track b.label) {
                <button class="chip" [class.on]="budget() === b.value" [attr.aria-pressed]="budget() === b.value" (click)="setBudget(b.value)">{{ b.label }}</button>
              }
            </div>
          </div>
        </div>

        @if (loading()) {
          <p class="hint">Finding products for you…</p>
        } @else if (loadError()) {
          <div class="empty card">
            <p>{{ loadError() }}</p>
            <button class="btn btn-outline btn-sm" (click)="load()">Try again</button>
          </div>
        } @else if (!stage()) {
          <div class="empty card">
            <mat-icon>eco</mat-icon>
            <p>Tell us your stage on <a routerLink="/journey">My Journey</a> and we’ll suggest products that fit.</p>
          </div>
        } @else if (items().length === 0 && category() === null && budget() === null) {
          <div class="empty card">
            <mat-icon>inventory_2</mat-icon>
            <p>We don’t have products picked for {{ stageLabel() }} yet. Check back soon.</p>
          </div>
        } @else {
          <div class="grid">
            @for (r of visible(); track r.productId) {
              <article class="reco card">
                <img [src]="r.imageUrl" [alt]="r.name" loading="lazy" />
                <div class="reco-body">
                  <span class="category">{{ r.category }}</span>
                  <h2>{{ r.name }}</h2>
                  <p class="desc">{{ r.description }}</p>
                  <div class="why">
                    <span class="why-title">Why this is here</span>
                    <ul>
                      @for (reason of r.whyRecommended; track reason) { <li>{{ reason }}</li> }
                    </ul>
                  </div>
                  <div class="reco-foot">
                    <span class="price">₹{{ r.price | number }}</span>
                    <div class="reco-actions">
                      <button class="btn btn-link btn-sm" [disabled]="busy() === r.productId" (click)="dismiss(r)">Not for me</button>
                      <button class="btn btn-primary btn-sm" (click)="addToCart(r)"><mat-icon class="icon-sm">add_shopping_cart</mat-icon> Add</button>
                    </div>
                  </div>
                </div>
              </article>
            } @empty {
              <div class="empty card span-all">
                <p>Nothing matches those filters. Try another category or a higher budget.</p>
              </div>
            }
          </div>
        }

        @if (dismissed().length) {
          <p class="hint center">
            {{ dismissed().length }} hidden as “not for me”.
            <button class="btn btn-link btn-sm" [disabled]="busy() !== null" (click)="restoreAll()">Show them again</button>
          </p>
        }
      </div>
    </div>
  `,
  styles: [`
    .reco-page { padding: 3rem 0 5rem; }
    .narrow { max-width: 980px; }
    .reco-header { text-align: center; margin-bottom: 1.5rem; }
    .kicker { font-size: 0.78rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--blush-700); }
    .reco-header h1 { font-size: clamp(1.8rem, 3.5vw, 2.4rem); margin: 0.5rem 0; color: var(--sage-900); }
    .reco-header p { color: var(--text-secondary); max-width: 580px; margin: 0 auto; }

    .disclosure { display: flex; gap: 0.6rem; align-items: flex-start; font-size: 0.82rem; color: var(--text-secondary); background: var(--sage-50); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0.8rem 1rem; margin-bottom: 1.5rem; }
    .disclosure mat-icon { color: var(--trust-700); flex-shrink: 0; }

    .filters { display: flex; flex-wrap: wrap; gap: 1.25rem 2rem; margin-bottom: 1.75rem; }
    .filter-group { display: flex; flex-direction: column; gap: 0.5rem; }
    .filter-label { font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
    .chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .chip { border: 1.5px solid var(--border-light); background: #fff; border-radius: var(--radius-full); padding: 0.4rem 0.85rem; font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); cursor: pointer; }
    .chip.on { background: var(--sage-700); border-color: var(--sage-700); color: #fff; }

    .card { border-radius: var(--radius-xl); background: #fff; border: 1px solid var(--border-light); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem; }
    .span-all { grid-column: 1 / -1; }
    .reco { overflow: hidden; display: flex; flex-direction: column; }
    .reco img { width: 100%; height: 170px; object-fit: cover; background: var(--sage-50); }
    .reco-body { padding: 1.1rem 1.2rem 1.2rem; display: flex; flex-direction: column; gap: 0.5rem; flex: 1; }
    .category { font-size: 0.7rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--trust-700); }
    .reco h2 { font-size: 1rem; color: var(--sage-900); line-height: 1.35; }
    .desc { font-size: 0.83rem; color: var(--text-secondary); line-height: 1.5; }
    .why { background: var(--sage-50); border-radius: var(--radius-md); padding: 0.6rem 0.8rem; }
    .why-title { font-size: 0.72rem; font-weight: 800; color: var(--sage-900); }
    .why ul { margin: 0.3rem 0 0; padding-left: 1.1rem; font-size: 0.8rem; color: var(--text-secondary); }
    .reco-foot { margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding-top: 0.5rem; }
    .price { font-weight: 800; color: var(--sage-900); }
    .reco-actions { display: flex; gap: 0.25rem; align-items: center; }

    .empty { padding: 2rem; text-align: center; color: var(--text-secondary); }
    .empty mat-icon { color: var(--sage-700); }
    .hint { font-size: 0.85rem; color: var(--text-muted); }
    .center { text-align: center; margin-top: 1.5rem; }
  `]
})
export class RecommendationsComponent implements OnInit {
  private api = inject(ApiService);
  private reco = inject(RecommendationService);

  budgets = BUDGET_OPTIONS;

  loading = signal(true);
  loadError = signal<string | null>(null);
  stage = signal<PregnancyStage | null>(null);
  disclosure = signal('');
  items = signal<ProductRecommendation[]>([]);
  /** Categories seen in the unfiltered list, so the chips don't vanish once one is picked. */
  categories = signal<string[]>([]);
  category = signal<string | null>(null);
  budget = signal<Budget>(null);
  /** productId being dismissed/restored. */
  busy = signal<number | null>(null);

  stageLabel = computed(() => (this.stage() ? RECO_STAGE_LABELS[this.stage()!] : ''));
  visible = computed(() => this.items().filter(i => !i.dismissed));
  dismissed = computed(() => this.items().filter(i => i.dismissed));

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.loadError.set(null);
    this.reco.get(this.category(), this.budget()).subscribe({
      next: res => {
        this.stage.set(res.stage);
        this.disclosure.set(res.commissionDisclosure);
        this.items.set(res.items);
        if (this.category() === null && this.budget() === null) {
          this.categories.set([...new Set(res.items.map(i => i.category))].sort());
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 401 || err?.status === 403) return;
        this.loadError.set('We couldn’t load your recommendations. Please check your connection.');
      }
    });
  }

  setCategory(c: string | null) {
    this.category.set(c);
    this.load();
  }

  setBudget(b: Budget) {
    this.budget.set(b);
    this.load();
  }

  dismiss(r: ProductRecommendation) {
    this.busy.set(r.productId);
    this.reco.dismiss(r.productId).subscribe({
      next: () => {
        this.busy.set(null);
        this.items.update(list => list.map(i => (i.productId === r.productId ? { ...i, dismissed: true } : i)));
        this.api.showToast('Hidden. We won’t suggest it again.');
      },
      error: () => {
        this.busy.set(null);
        this.api.showToast('Couldn’t hide that right now. Please try again.');
      }
    });
  }

  restoreAll() {
    const ids = this.dismissed().map(i => i.productId);
    if (!ids.length) return;
    this.busy.set(ids[0]);
    forkJoin(ids.map(id => this.reco.undismiss(id))).subscribe({
      next: () => {
        this.busy.set(null);
        this.items.update(list => list.map(i => ({ ...i, dismissed: false })));
      },
      error: () => {
        this.busy.set(null);
        this.load();
        this.api.showToast('Couldn’t restore all of them. Please try again.');
      }
    });
  }

  addToCart(r: ProductRecommendation) {
    this.api.addToCart({ id: r.productId, name: r.name, price: r.price, imageUrl: r.imageUrl, category: r.category });
  }
}
