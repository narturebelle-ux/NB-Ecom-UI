import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (api.isCartOpen()) {
      <div class="drawer-backdrop" (click)="close()">
        <div class="drawer-panel glass" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <div class="header-title">
              <h3>Your Maternal Basket</h3>
              <span class="item-count">{{ api.cartCount() }} items</span>
            </div>
            <button class="close-btn" (click)="close()">✕</button>
          </div>

          <!-- Free Shipping Bar -->
          <div class="shipping-progress">
            @if (api.cartTotal() >= 999) {
              <div class="shipping-msg unlocked">
                <span>🎉</span> <strong>Free Express Insured Delivery Unlocked!</strong>
              </div>
            } @else {
              <div class="shipping-msg">
                <span>🚚</span> Add <strong>₹{{ 999 - api.cartTotal() }}</strong> more for Free Delivery!
              </div>
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="(api.cartTotal() / 999) * 100"></div>
              </div>
            }
          </div>

          <!-- Basket Items -->
          <div class="drawer-items">
            @if (api.cart().length === 0) {
              <div class="empty-basket">
                <span class="empty-icon">🌿</span>
                <h4>Your basket is empty</h4>
                <p>Explore our Month 3, 6, and 9 doctor-approved essentials to get started.</p>
              </div>
            } @else {
              @for (item of api.cart(); track item.product.id) {
                <div class="cart-item">
                  <img [src]="item.product.imageUrl" [alt]="item.product.name" class="item-thumb" />
                  <div class="item-info">
                    <span class="item-tier" [ngClass]="'tier-' + item.product.tier.toLowerCase()">
                      {{ item.product.tier === 'MANDATORY' ? '🟢 Must-Have' : '🟡 Optional' }}
                    </span>
                    <h4 class="item-name">{{ item.product.name }}</h4>
                    <span class="item-price">₹{{ item.product.price }}</span>

                    <div class="qty-control">
                      <button (click)="api.updateQuantity(item.product.id, -1)" class="qty-btn">-</button>
                      <span class="qty-val">{{ item.quantity }}</span>
                      <button (click)="api.updateQuantity(item.product.id, 1)" class="qty-btn">+</button>
                      <button (click)="api.removeFromCart(item.product.id)" class="remove-btn">Remove</button>
                    </div>
                  </div>
                </div>
              }
            }
          </div>

          <!-- Drawer Footer -->
          @if (api.cart().length > 0) {
            <div class="drawer-footer">
              <div class="bill-row">
                <span>Subtotal</span>
                <strong>₹{{ api.cartTotal() }}</strong>
              </div>
              <div class="bill-row">
                <span>Shipping</span>
                <span class="free-text">{{ api.cartTotal() >= 999 ? 'FREE' : '₹99' }}</span>
              </div>
              <div class="bill-row total-row">
                <span>Estimated Total</span>
                <strong class="total-val">₹{{ api.cartTotal() >= 999 ? api.cartTotal() : api.cartTotal() + 99 }}</strong>
              </div>

              <button (click)="checkout()" class="btn btn-primary btn-lg full-btn">
                Proceed to Safe Checkout &rarr;
              </button>

              <div class="security-badges">
                <span>🔒 256-bit Encrypted</span>
                <span>•</span>
                <span>📦 Discrete Maternal Packaging</span>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .drawer-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(27, 51, 39, 0.45);
      backdrop-filter: blur(4px);
      z-index: 2000;
      display: flex;
      justify-content: flex-end;
    }
    .drawer-panel {
      width: 100%;
      max-width: 440px;
      height: 100%;
      background: #fff;
      display: flex;
      flex-direction: column;
      box-shadow: var(--shadow-xl);
      animation: slideDrawer 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes slideDrawer {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .drawer-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-light);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .header-title h3 {
      font-size: 1.25rem;
      color: var(--sage-900);
    }
    .item-count {
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .close-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--sage-50);
      font-size: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .shipping-progress {
      background: var(--sage-50);
      padding: 0.75rem 1.5rem;
      border-bottom: 1px solid var(--border-subtle);
    }
    .shipping-msg {
      font-size: 0.82rem;
      color: var(--sage-800);
      margin-bottom: 0.4rem;
    }
    .shipping-msg.unlocked {
      color: var(--tier-mandatory-text);
    }
    .progress-bar {
      height: 4px;
      background: var(--border-light);
      border-radius: var(--radius-full);
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: var(--sage-700);
      transition: width var(--transition-smooth);
    }

    .drawer-items {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .empty-basket {
      text-align: center;
      padding: 3rem 1rem;
    }
    .empty-icon {
      font-size: 2.5rem;
      display: block;
      margin-bottom: 0.5rem;
    }
    .empty-basket h4 {
      font-size: 1.2rem;
      color: var(--sage-900);
      margin-bottom: 0.25rem;
    }
    .empty-basket p {
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .cart-item {
      display: flex;
      gap: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border-subtle);
    }
    .item-thumb {
      width: 72px;
      height: 72px;
      border-radius: var(--radius-md);
      object-fit: cover;
      background: var(--bg-alt);
    }
    .item-info {
      flex: 1;
    }
    .item-tier {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      display: inline-block;
      margin-bottom: 0.2rem;
    }
    .item-tier.tier-mandatory {
      color: var(--tier-mandatory-text);
    }
    .item-tier.tier-optional {
      color: var(--tier-optional-text);
    }
    .item-name {
      font-size: 0.92rem;
      font-weight: 700;
      color: var(--sage-900);
      line-height: 1.3;
      margin-bottom: 0.25rem;
    }
    .item-price {
      font-weight: 700;
      color: var(--sage-800);
      font-size: 0.95rem;
      display: block;
      margin-bottom: 0.5rem;
    }
    .qty-control {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .qty-btn {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      background: var(--sage-50);
      border: 1px solid var(--border-light);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      cursor: pointer;
    }
    .qty-val {
      font-size: 0.85rem;
      font-weight: 600;
    }
    .remove-btn {
      margin-left: auto;
      font-size: 0.75rem;
      color: var(--text-muted);
      cursor: pointer;
    }
    .remove-btn:hover {
      color: var(--blush-700);
      text-decoration: underline;
    }

    .drawer-footer {
      padding: 1.25rem 1.5rem;
      border-top: 1px solid var(--border-light);
      background: var(--bg-surface);
    }
    .bill-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.88rem;
      margin-bottom: 0.5rem;
      color: var(--text-secondary);
    }
    .total-row {
      font-size: 1.15rem;
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border-subtle);
      color: var(--sage-900);
    }
    .total-val {
      font-family: var(--font-serif);
      font-size: 1.35rem;
    }
    .free-text {
      color: var(--tier-mandatory-text);
      font-weight: 700;
    }
    .full-btn {
      width: 100%;
      margin-top: 1rem;
    }
    .security-badges {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.72rem;
      color: var(--text-muted);
      margin-top: 0.85rem;
    }
  `]
})
export class CartDrawerComponent {
  api = inject(ApiService);

  close() {
    this.api.isCartOpen.set(false);
  }

  checkout() {
    this.api.showToast('Redirecting to secure gateway... Demo Order placed successfully!');
    this.api.clearCart();
    this.close();
  }
}
