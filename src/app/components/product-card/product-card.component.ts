import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../models/maternal.models';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="product-card card" [ngClass]="'tier-' + product.tier.toLowerCase()">
      <!-- Tier Visual Flag / Badge -->
      <div class="card-tier-banner">
        @if (product.tier === 'MANDATORY') {
          <span class="badge badge-mandatory">
            <span>🟢</span> DOCTOR-APPROVED MUST-HAVE
          </span>
        } @else if (product.tier === 'OPTIONAL') {
          <span class="badge badge-optional">
            <span>🟡</span> OPTIONAL COMFORT UPGRADE
          </span>
        } @else {
          <span class="badge badge-skip">
            <span>🔴</span> SAVE YOUR MONEY (SKIP FOR NOW)
          </span>
        }

        @if (product.doctorApproved && product.tier !== 'SKIP') {
          <span class="doctor-badge" title="Verified by registered Obstetricians">
            ✓ OB-GYN Vetted
          </span>
        }
      </div>

      <!-- Image Area -->
      <div class="image-wrapper">
        <img [src]="product.imageUrl" [alt]="product.name" class="product-img" loading="lazy" />
        @if (product.originalPrice && product.tier !== 'SKIP') {
          <span class="discount-pill">
            Save {{ calculateDiscount(product.originalPrice, product.price) }}%
          </span>
        }
      </div>

      <!-- Body Content -->
      <div class="card-body">
        <div class="category-meta">
          <span class="cat-pill">{{ product.category }}</span>
          @if (product.rating) {
            <span class="rating-pill">★ {{ product.rating }} ({{ product.reviewCount }})</span>
          }
        </div>

        <h3 class="product-title">{{ product.name }}</h3>

        <p class="product-desc">{{ product.description }}</p>

        <!-- Clinical Rationale Accordion / Highlight -->
        <div class="clinical-box" [ngClass]="'rationale-' + product.tier.toLowerCase()">
          <div class="clinical-header">
            <strong>{{ product.tier === 'SKIP' ? '⚠️ Doctor Advice:' : '🩺 Why This Matters:' }}</strong>
          </div>
          <p class="clinical-text">{{ product.clinicalRationale }}</p>
        </div>

        <!-- Key Benefits List -->
        @if (product.keyBenefits.length > 0 && product.tier !== 'SKIP') {
          <ul class="benefits-list">
            @for (benefit of product.keyBenefits; track benefit) {
              <li><span class="check">✓</span> {{ benefit }}</li>
            }
          </ul>
        }

        <!-- Price and Action Strip -->
        <div class="price-action-row">
          @if (product.tier !== 'SKIP') {
            <div class="price-box">
              <span class="current-price">₹{{ product.price }}</span>
              @if (product.originalPrice) {
                <span class="original-price">₹{{ product.originalPrice }}</span>
              }
            </div>
            <button (click)="addToCart()" class="btn btn-primary btn-sm add-cart-btn">
              <span>+</span> Add to Basket
            </button>
          } @else {
            <div class="skip-price-box">
              <span class="skip-advice-tag">Cost Gimmick: Avoid spending ₹{{ product.price }}</span>
            </div>
            <button class="btn btn-secondary btn-sm skip-learn-btn" disabled>
              Saved For Baby Budget
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .product-card {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #fff;
      border-radius: var(--radius-lg);
      overflow: hidden;
      position: relative;
    }

    .card-tier-banner {
      padding: 0.85rem 1rem 0.5rem 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .doctor-badge {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--sage-800);
      background: var(--sage-100);
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
    }

    .image-wrapper {
      position: relative;
      height: 220px;
      overflow: hidden;
      background: var(--bg-alt);
    }
    .product-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform var(--transition-smooth);
    }
    .product-card:hover .product-img {
      transform: scale(1.05);
    }
    .discount-pill {
      position: absolute;
      bottom: 0.75rem;
      left: 0.75rem;
      background: var(--blush-700);
      color: #fff;
      font-size: 0.72rem;
      font-weight: 800;
      padding: 0.25rem 0.6rem;
      border-radius: var(--radius-full);
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }

    .card-body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }

    .category-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      font-size: 0.78rem;
    }
    .cat-pill {
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.04em;
    }
    .rating-pill {
      color: #b8812c;
      font-weight: 700;
    }

    .product-title {
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--sage-900);
      margin-bottom: 0.5rem;
      line-height: 1.35;
    }

    .product-desc {
      font-size: 0.88rem;
      color: var(--text-secondary);
      line-height: 1.5;
      margin-bottom: 1rem;
    }

    .clinical-box {
      border-radius: var(--radius-md);
      padding: 0.75rem 0.85rem;
      margin-bottom: 1rem;
      font-size: 0.82rem;
      line-height: 1.5;
    }
    .rationale-mandatory {
      background: var(--tier-mandatory-bg);
      border-left: 3px solid var(--tier-mandatory-text);
      color: var(--tier-mandatory-text);
    }
    .rationale-optional {
      background: var(--tier-optional-bg);
      border-left: 3px solid var(--tier-optional-text);
      color: var(--tier-optional-text);
    }
    .rationale-skip {
      background: var(--tier-skip-bg);
      border-left: 3px solid var(--tier-skip-text);
      color: var(--tier-skip-text);
    }
    .clinical-header {
      margin-bottom: 0.2rem;
    }

    .benefits-list {
      list-style: none;
      margin-bottom: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .benefits-list li {
      font-size: 0.82rem;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .benefits-list .check {
      color: var(--sage-700);
      font-weight: 800;
    }

    .price-action-row {
      margin-top: auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 1rem;
      border-top: 1px solid var(--border-subtle);
    }
    .price-box {
      display: flex;
      align-items: baseline;
      gap: 0.4rem;
    }
    .current-price {
      font-family: var(--font-serif);
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--sage-900);
    }
    .original-price {
      font-size: 0.85rem;
      color: var(--text-muted);
      text-decoration: line-through;
    }

    .skip-price-box {
      display: flex;
      flex-direction: column;
    }
    .skip-advice-tag {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--tier-skip-text);
    }

    .add-cart-btn {
      white-space: nowrap;
    }
    .skip-learn-btn {
      cursor: default;
      font-size: 0.78rem;
      opacity: 0.85;
    }

    /* Distinct Tier Borders */
    .tier-mandatory {
      border: 1.5px solid var(--tier-mandatory-border);
    }
    .tier-optional {
      border: 1px solid var(--border-light);
    }
    .tier-skip {
      border: 1.5px dashed var(--tier-skip-border);
      background: #fffcfc;
    }
  `]
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
  api = inject(ApiService);

  addToCart() {
    this.api.addToCart(this.product);
  }

  calculateDiscount(original: number, current: number): number {
    return Math.round(((original - current) / original) * 100);
  }
}
