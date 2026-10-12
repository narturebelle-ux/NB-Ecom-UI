import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Product } from '../../models/maternal.models';
import { ProductCardComponent } from '../../components/product-card/product-card.component';

@Component({
  selector: 'app-month6',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCardComponent],
  template: `
    <!-- Stage Header Banner -->
    <header class="stage-header month-6-theme">
      <div class="container stage-header-container">
        <div class="stage-header-content">
          <div class="stage-nav-crumbs">
            <a routerLink="/">Home</a> <span>/</span> <span>Pregnancy Products</span> <span>/</span> <span class="current">Month 6</span>
          </div>
          <span class="stage-tag">Second Trimester • Weeks 13 to 27</span>
          <h1>Month 6: Belly Expansion, Orthopedic Sleep & Skin Elasticity</h1>
          <p class="stage-lead">
            In Month 6, your baby experiences rapid skeletal growth. Your bump is expanding quickly, shifting your center of gravity and pulling on pelvic ligaments. Deep side-sleeping and skin elasticity care become non-negotiable.
          </p>

          <!-- Stage Quick Stats -->
          <div class="stage-metrics">
            <div class="metric">
              <span class="m-val">Weeks 21–26</span>
              <span class="m-lbl">Peak Belly Growth Window</span>
            </div>
            <div class="divider"></div>
            <div class="metric">
              <span class="m-val">Level-II Anomaly Scan</span>
              <span class="m-lbl">Target Ultrasound Check</span>
            </div>
            <div class="divider"></div>
            <div class="metric">
              <span class="m-val">Side-Sleeping (SOS)</span>
              <span class="m-lbl">Vital Placental Blood Flow</span>
            </div>
          </div>
        </div>

        <!-- Checkup Checklist Callout Box -->
        <div class="stage-scan-card card glass">
          <span class="badge badge-sage">Medical Test Reminder</span>
          <h3>Level-II Anomaly Scan & Diabetes Check</h3>
          <p>Weeks 18–22 require the target anomaly ultrasound to survey baby's organ chambers, paired with the 75g glucose tolerance test.</p>
          <a routerLink="/checklists" class="btn btn-primary btn-sm full-w">
            📋 View Month 6 Checkup Checklist & Labs
          </a>
        </div>
      </div>
    </header>

    <main class="container stage-body">
      <!-- "Add All Mandatory Essentials" Fast Conversion Banner -->
      @if (mandatoryProducts.length > 0) {
        <div class="bundle-hero card glass">
          <div class="bundle-info">
            <span class="badge badge-mandatory">Recommended Second-Trimester Routine</span>
            <h2>Get All 3 Mandatory Essentials in One Click</h2>
            <p>Complete relief for sleep, skin & pelvic posture: Ergonomic U-Shaped Body Pillow + Intensive Rosehip Stretch Butter + Breathable Bump Support Band.</p>
            <div class="bundle-price-row">
              <span class="b-total">Total: ₹{{ getMandatoryTotal() }}</span>
              <span class="b-save">Free Express Delivery & Doctor Posture Guide Included</span>
            </div>
          </div>
          <button (click)="addAllMandatory()" class="btn btn-gold btn-lg bundle-btn">
            🛍️ Add All 3 Essentials to Basket
          </button>
        </div>
      }

      <!-- TIER 1: MANDATORY ESSENTIALS -->
      <section class="tier-section">
        <div class="tier-title-bar mandatory-bar">
          <div class="tier-heading">
            <span class="tier-icon">🟢</span>
            <div>
              <h2>Mandatory Essentials (Doctor-Approved Must-Haves)</h2>
              <p>Critical orthopedic and dermatological essentials for your expanding bump during Month 6.</p>
            </div>
          </div>
          <span class="count-badge">{{ mandatoryProducts.length }} Products</span>
        </div>

        <div class="products-grid">
          @for (prod of mandatoryProducts; track prod.id) {
            <app-product-card [product]="prod"></app-product-card>
          }
        </div>
      </section>

      <!-- TIER 2: OPTIONAL COMFORT -->
      <section class="tier-section">
        <div class="tier-title-bar optional-bar">
          <div class="tier-heading">
            <span class="tier-icon">🟡</span>
            <div>
              <h2>Optional Comfort Upgrades (Nice-to-Have)</h2>
              <p>Topical muscle soothers and lightweight comforts for nighttime relaxation.</p>
            </div>
          </div>
          <span class="count-badge">{{ optionalProducts.length }} Product</span>
        </div>

        <div class="products-grid">
          @for (prod of optionalProducts; track prod.id) {
            <app-product-card [product]="prod"></app-product-card>
          }
        </div>
      </section>

      <!-- TIER 3: WHAT TO SKIP -->
      <section class="tier-section">
        <div class="tier-title-bar skip-bar">
          <div class="tier-heading">
            <span class="tier-icon">🔴</span>
            <div>
              <h2>What You DON'T Need Right Now (Save Your Money)</h2>
              <p>Clinical advice on products marketed aggressively to pregnant mothers that offer zero value.</p>
            </div>
          </div>
          <span class="count-badge">{{ skipProducts.length }} Product</span>
        </div>

        <div class="products-grid">
          @for (prod of skipProducts; track prod.id) {
            <app-product-card [product]="prod"></app-product-card>
          }
        </div>
      </section>

      <!-- Next Stage Navigator Strip -->
      <div class="next-stage-strip card">
        <div class="strip-text">
          <span>Entering the final stretch soon?</span>
          <h3>Prepare for Month 9: Delivery Readiness & Hospital Bags</h3>
        </div>
        <a routerLink="/products/month-9" class="btn btn-outline btn-lg">
          Explore Month 9 Products &rarr;
        </a>
      </div>
    </main>
  `,
  styles: [`
    .stage-header {
      padding: 3.5rem 0 3rem 0;
      background: linear-gradient(135deg, #fbf2ec 0%, #faf7f2 100%);
      border-bottom: 1px solid var(--border-light);
    }
    .stage-header-container {
      display: grid;
      grid-template-columns: 1.3fr 0.7fr;
      gap: 3rem;
      align-items: center;
    }
    .stage-nav-crumbs {
      font-size: 0.82rem;
      color: var(--text-muted);
      margin-bottom: 0.75rem;
      display: flex;
      gap: 0.4rem;
    }
    .stage-nav-crumbs a:hover {
      color: var(--sage-900);
      text-decoration: underline;
    }
    .stage-nav-crumbs .current {
      font-weight: 700;
      color: var(--sage-900);
    }
    .stage-tag {
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--blush-700);
      display: block;
      margin-bottom: 0.5rem;
    }
    .stage-header h1 {
      font-size: 2.35rem;
      color: var(--sage-900);
      margin-bottom: 0.75rem;
    }
    .stage-lead {
      font-size: 1.05rem;
      color: var(--text-secondary);
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }

    .stage-metrics {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--border-light);
    }
    .metric .m-val {
      display: block;
      font-weight: 800;
      font-size: 1rem;
      color: var(--sage-900);
    }
    .metric .m-lbl {
      font-size: 0.78rem;
      color: var(--text-muted);
    }
    .divider {
      width: 1px;
      height: 28px;
      background: var(--border-light);
    }

    .stage-scan-card {
      padding: 1.75rem;
      border-radius: var(--radius-lg);
      background: #fff;
    }
    .stage-scan-card h3 {
      font-size: 1.25rem;
      margin: 0.5rem 0;
      color: var(--sage-900);
    }
    .stage-scan-card p {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-bottom: 1.25rem;
      line-height: 1.5;
    }
    .full-w {
      width: 100%;
    }

    .stage-body {
      padding-top: 3rem;
      padding-bottom: 5rem;
    }

    /* Fast Conversion Bundle Hero */
    .bundle-hero {
      background: linear-gradient(135deg, #fdf5f1, #ffffff);
      border: 1.5px solid var(--tier-mandatory-border);
      padding: 2.25rem;
      border-radius: var(--radius-xl);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 2rem;
      margin-bottom: 3.5rem;
      box-shadow: var(--shadow-md);
    }
    .bundle-info h2 {
      font-size: 1.7rem;
      margin: 0.4rem 0;
      color: var(--sage-900);
    }
    .bundle-info p {
      color: var(--text-secondary);
      font-size: 0.95rem;
      max-width: 600px;
      margin-bottom: 0.75rem;
    }
    .bundle-price-row {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .b-total {
      font-family: var(--font-serif);
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--tier-mandatory-text);
    }
    .b-save {
      font-size: 0.82rem;
      color: var(--text-muted);
      font-weight: 600;
    }
    .bundle-btn {
      white-space: nowrap;
    }

    /* Tier Sections */
    .tier-section {
      margin-bottom: 4rem;
    }
    .tier-title-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.15rem 1.5rem;
      border-radius: var(--radius-lg);
      margin-bottom: 1.75rem;
    }
    .tier-heading {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .tier-icon {
      font-size: 1.5rem;
    }
    .tier-heading h2 {
      font-size: 1.35rem;
      margin-bottom: 0.15rem;
    }
    .tier-heading p {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    .count-badge {
      font-size: 0.82rem;
      font-weight: 700;
      background: #fff;
      padding: 0.35rem 0.85rem;
      border-radius: var(--radius-full);
      box-shadow: var(--shadow-sm);
    }

    .mandatory-bar {
      background: var(--tier-mandatory-bg);
      border-left: 4px solid var(--tier-mandatory-text);
      color: var(--tier-mandatory-text);
    }
    .optional-bar {
      background: var(--tier-optional-bg);
      border-left: 4px solid var(--tier-optional-text);
      color: var(--tier-optional-text);
    }
    .skip-bar {
      background: var(--tier-skip-bg);
      border-left: 4px solid var(--tier-skip-text);
      color: var(--tier-skip-text);
    }

    .products-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.75rem;
    }

    .next-stage-strip {
      background: #fff;
      padding: 2.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 2rem;
      border-radius: var(--radius-xl);
      border: 1px solid var(--border-light);
    }
    .strip-text span {
      font-size: 0.85rem;
      color: var(--blush-700);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .strip-text h3 {
      font-size: 1.5rem;
      color: var(--sage-900);
      margin-top: 0.25rem;
    }

    @media (max-width: 992px) {
      .stage-header-container {
        grid-template-columns: 1fr;
      }
      .products-grid {
        grid-template-columns: 1fr 1fr;
      }
      .bundle-hero {
        flex-direction: column;
        align-items: flex-start;
      }
    }
    @media (max-width: 600px) {
      .products-grid {
        grid-template-columns: 1fr;
      }
      .next-stage-strip {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class Month6Component implements OnInit {
  api = inject(ApiService);

  mandatoryProducts: Product[] = [];
  optionalProducts: Product[] = [];
  skipProducts: Product[] = [];

  ngOnInit() {
    this.api.getProducts('MONTH_6').subscribe(products => {
      this.mandatoryProducts = products.filter(p => p.tier === 'MANDATORY');
      this.optionalProducts = products.filter(p => p.tier === 'OPTIONAL');
      this.skipProducts = products.filter(p => p.tier === 'SKIP');
    });
  }

  getMandatoryTotal(): number {
    return this.mandatoryProducts.reduce((sum, p) => sum + p.price, 0);
  }

  addAllMandatory() {
    for (const prod of this.mandatoryProducts) {
      this.api.addToCart(prod);
    }
    this.api.showToast('All 3 Month 6 Mandatory Essentials added to your basket!');
  }
}
