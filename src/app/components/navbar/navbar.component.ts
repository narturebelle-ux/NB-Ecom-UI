import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { FirebaseAuthService } from '../../services/firebase-auth.service';
import { CommonModule } from '@angular/common';
import { FeatureDirective } from '../../directives/feature.directive';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, FeatureDirective],
  template: `
    <!-- Top Announcement Bar -->
    <div class="announcement-bar">
      <div class="container announcement-content">
        <span>✨ <strong>Free OB-GYN Live Masterclass:</strong> 1st Trimester Nutrition &amp; Safe Scans this Saturday!</span>
        <a routerLink="/doctors-live" class="announcement-link">Reserve Free Seat &rarr;</a>
      </div>
    </div>

    <!-- Main Navigation Header -->
    <header class="main-header glass">
      <div class="container header-container">
        <!-- Brand Logo -->
        <a routerLink="/" class="brand-logo">
          <img src="favicon.svg" alt="NartureBelle logo" class="logo-mark">
          <div class="logo-text">
            <span class="brand-title">NartureBelle<span class="trademark">™</span></span>
            <span class="brand-sub">Nurturing You, Nurturing Life</span>
          </div>
        </a>

        <!-- Desktop Navigation Links -->
        <nav class="nav-links">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link">Home</a>

          <!-- Trimester Stage Pills -->
          <div class="stage-nav-group">
            <a routerLink="/products/month-3" routerLinkActive="active" class="nav-link stage-pill m3">
              <span class="pill-dot"></span>Month 3
            </a>
            <a routerLink="/products/month-6" routerLinkActive="active" class="nav-link stage-pill m6">
              <span class="pill-dot"></span>Month 6
            </a>
            <a routerLink="/products/month-9" routerLinkActive="active" class="nav-link stage-pill m9">
              <span class="pill-dot"></span>Month 9
            </a>
          </div>

          <a routerLink="/checklists" routerLinkActive="active" class="nav-link highlight-link">
            <span>📋</span> Checkup Checklist
          </a>

          <!-- Feature-toggled nav links -->
          <a *appFeature="'nurseCompanion'" routerLink="/services/nurse-companion" routerLinkActive="active" class="nav-link nurse-link">
            <span>👩‍⚕️</span> Nurse Companion
          </a>
          <a *appFeature="'doctorLiveSessions'" routerLink="/doctors-live" routerLinkActive="active" class="nav-link doctor-link">
            <span>🔴</span> Doctor Live
          </a>
        </nav>

        <!-- Right Header Actions -->
        <div class="header-actions">
          <button (click)="openAssessment()" class="btn btn-secondary btn-sm assessment-btn">
            <span>✨</span> Find My Routine
          </button>

          <!-- Cart Drawer Toggle -->
          <button (click)="toggleCart()" class="cart-btn" aria-label="Shopping Cart">
            <span class="cart-icon">🛍️</span>
            @if (api.cartCount() > 0) {
              <span class="cart-badge">{{ api.cartCount() }}</span>
            }
          </button>

          <!-- Auth: signed-in user dropdown -->
          @if (api.currentUser(); as user) {
            <div class="user-menu" [class.menu-open]="isUserMenuOpen">
              <button class="user-pill" (click)="toggleUserMenu()" type="button">
                <span class="user-avatar">🌸</span>
                <span class="user-name">{{ getFirstName(user) }}</span>
                <span class="chevron">{{ isUserMenuOpen ? '▲' : '▼' }}</span>
              </button>
              @if (isUserMenuOpen) {
                <div class="user-dropdown">
                  <a routerLink="/profile" class="dropdown-item" (click)="isUserMenuOpen = false">
                    <span>👤</span> My Profile
                  </a>
                  <hr class="dropdown-divider">
                  <button class="dropdown-item sign-out-item" (click)="signOut()">
                    <span>🚪</span> Sign Out
                  </button>
                </div>
              }
            </div>
          } @else {
            <a routerLink="/auth/login" class="btn btn-outline btn-sm login-btn">Sign In</a>
          }

          <!-- Mobile Hamburger Toggle -->
          <button (click)="toggleMobileMenu()" class="mobile-toggle" aria-label="Toggle Navigation">
            <span>{{ isMobileOpen ? '✕' : '☰' }}</span>
          </button>
        </div>
      </div>

      <!-- Mobile Navigation Drawer -->
      @if (isMobileOpen) {
        <div class="mobile-menu glass">
          <a routerLink="/" (click)="isMobileOpen = false" class="mobile-nav-link">Home</a>
          <div class="mobile-stages-title">Browse By Pregnancy Milestone:</div>
          <div class="mobile-stages-grid">
            <a routerLink="/products/month-3" (click)="isMobileOpen = false" class="mobile-stage-btn m3">
              <strong>Month 3</strong><span>1st Trimester</span>
            </a>
            <a routerLink="/products/month-6" (click)="isMobileOpen = false" class="mobile-stage-btn m6">
              <strong>Month 6</strong><span>2nd Trimester</span>
            </a>
            <a routerLink="/products/month-9" (click)="isMobileOpen = false" class="mobile-stage-btn m9">
              <strong>Month 9</strong><span>3rd Trimester</span>
            </a>
          </div>
          <hr class="mobile-divider">
          <a routerLink="/checklists" (click)="isMobileOpen = false" class="mobile-nav-link">
            📋 Prenatal Checkup Checklist &amp; Labs
          </a>
          <a *appFeature="'nurseCompanion'" routerLink="/services/nurse-companion" (click)="isMobileOpen = false" class="mobile-nav-link">
            👩‍⚕️ Dedicated Nurse Care Companion
          </a>
          <a *appFeature="'doctorLiveSessions'" routerLink="/doctors-live" (click)="isMobileOpen = false" class="mobile-nav-link">
            🔴 OB-GYN Live Webinars
          </a>
          <hr class="mobile-divider">
          @if (api.currentUser(); as user) {
            <a routerLink="/profile" (click)="isMobileOpen = false" class="mobile-nav-link profile-link">
              👤 My Profile ({{ getFirstName(user) }})
            </a>
            <button (click)="signOut()" class="btn btn-outline btn-sm mobile-action-btn">
              🚪 Sign Out
            </button>
          } @else {
            <a routerLink="/auth/login" (click)="isMobileOpen = false" class="btn btn-outline btn-sm mobile-action-btn">
              Sign In
            </a>
          }
          <button (click)="openAssessment(); isMobileOpen = false" class="btn btn-primary btn-sm mobile-action-btn">
            ✨ Take 60s Pregnancy Checkup
          </button>
        </div>
      }
    </header>
  `,
  styles: [`
    .announcement-bar {
      background: linear-gradient(90deg, #1b3327, #2e4f3e);
      color: #fff;
      font-size: 0.82rem;
      padding: 0.5rem 0;
      text-align: center;
    }
    .announcement-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .announcement-link {
      color: #fbe6dd;
      font-weight: 700;
      text-decoration: underline;
    }

    .main-header {
      position: sticky;
      top: 0;
      z-index: 1000;
      border-bottom: 1px solid rgba(46, 79, 62, 0.08);
      box-shadow: 0 4px 20px rgba(46, 79, 62, 0.05);
    }
    .header-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 74px;
      gap: 1.5rem;
    }

    .brand-logo {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      text-decoration: none;
    }
    .logo-mark {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }
    .logo-text {
      display: flex;
      flex-direction: column;
    }
    .brand-title {
      font-family: var(--font-serif);
      font-size: 1.45rem;
      font-weight: 700;
      color: var(--sage-900);
      line-height: 1.1;
      letter-spacing: -0.01em;
    }
    .trademark {
      font-weight: 400;
      font-size: 0.6em;
      vertical-align: super;
    }
    .brand-sub {
      font-size: 0.68rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }
    .nav-link {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-secondary);
      padding: 0.4rem 0.6rem;
      border-radius: var(--radius-sm);
      transition: all var(--transition-fast);
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }
    .nav-link:hover, .nav-link.active {
      color: var(--sage-900);
      background-color: var(--sage-50);
    }

    .stage-nav-group {
      display: flex;
      align-items: center;
      background: var(--sage-50);
      padding: 0.2rem;
      border-radius: var(--radius-full);
      border: 1px solid var(--border-light);
    }
    .stage-pill {
      font-size: 0.82rem;
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-full);
    }
    .stage-pill.active {
      background: #fff;
      box-shadow: 0 2px 6px rgba(46,79,62,0.1);
      color: var(--sage-900);
    }
    .pill-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: var(--blush-700);
      display: inline-block;
    }

    .highlight-link { color: var(--sage-800); font-weight: 700; }
    .nurse-link { color: var(--blush-800); font-weight: 700; }
    .doctor-link { color: #a32222; font-weight: 700; }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .assessment-btn { white-space: nowrap; }
    .cart-btn {
      position: relative;
      background: var(--bg-surface);
      border: 1px solid var(--border-light);
      width: 42px;
      height: 42px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .cart-btn:hover {
      background: var(--sage-50);
      border-color: var(--sage-700);
      transform: scale(1.05);
    }
    .cart-icon { font-size: 1.25rem; }
    .cart-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background-color: var(--blush-700);
      color: #fff;
      font-size: 0.7rem;
      font-weight: 800;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #fff;
    }

    /* User dropdown menu */
    .user-menu {
      position: relative;
    }
    .user-pill {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: var(--sage-50);
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-full);
      border: 1px solid var(--border-light);
      cursor: pointer;
      transition: all 0.2s;
    }
    .user-pill:hover, .menu-open .user-pill {
      border-color: var(--sage-700);
      background: #e8f0ec;
    }
    .user-avatar { font-size: 1rem; }
    .user-name {
      font-weight: 600;
      font-size: 0.85rem;
      color: var(--sage-900);
    }
    .chevron {
      font-size: 0.6rem;
      color: var(--text-muted);
      margin-left: 0.1rem;
    }
    .user-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      background: #fff;
      border: 1px solid var(--border-light);
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(27,51,39,0.12);
      min-width: 180px;
      z-index: 2000;
      overflow: hidden;
      animation: dropIn 0.15s ease;
    }
    @keyframes dropIn {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.75rem 1.1rem;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--sage-900);
      cursor: pointer;
      background: none;
      border: none;
      width: 100%;
      text-align: left;
      text-decoration: none;
      transition: background 0.15s;
    }
    .dropdown-item:hover { background: var(--sage-50); }
    .dropdown-divider {
      border: none;
      border-top: 1px solid var(--border-subtle);
      margin: 0;
    }
    .sign-out-item { color: #a32222; }
    .sign-out-item:hover { background: #fdecea; }

    .mobile-toggle {
      display: none;
      font-size: 1.5rem;
      color: var(--sage-900);
      cursor: pointer;
    }

    /* Mobile Menu */
    .mobile-menu {
      padding: 1.25rem;
      border-top: 1px solid var(--border-light);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .mobile-nav-link {
      font-weight: 600;
      font-size: 1rem;
      color: var(--sage-900);
      padding: 0.5rem 0;
    }
    .profile-link { color: var(--blush-800); }
    .mobile-stages-title {
      font-size: 0.8rem;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--text-muted);
      margin-top: 0.5rem;
    }
    .mobile-stages-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
    }
    .mobile-stage-btn {
      background: #fff;
      padding: 0.6rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-light);
      text-align: center;
      display: flex;
      flex-direction: column;
    }
    .mobile-stage-btn strong { font-size: 0.9rem; color: var(--sage-900); }
    .mobile-stage-btn span { font-size: 0.7rem; color: var(--text-muted); }
    .mobile-divider {
      border: none;
      border-top: 1px solid var(--border-subtle);
      margin: 0.5rem 0;
    }
    .mobile-action-btn { width: 100%; justify-content: center; }

    @media (max-width: 1024px) {
      .nav-links { display: none; }
      .mobile-toggle { display: block; }
      .assessment-btn { display: none; }
    }
  `]
})
export class NavbarComponent {
  api = inject(ApiService);
  firebaseAuth = inject(FirebaseAuthService);
  router = inject(Router);

  isMobileOpen = false;
  isUserMenuOpen = false;

  toggleMobileMenu() {
    this.isMobileOpen = !this.isMobileOpen;
  }

  toggleUserMenu() {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  openAssessment() {
    this.api.isAssessmentOpen.set(true);
    this.isUserMenuOpen = false;
  }

  toggleCart() {
    this.api.isCartOpen.set(!this.api.isCartOpen());
    this.isUserMenuOpen = false;
  }

  getFirstName(user: any): string {
    if (user?.firstName) return user.firstName;
    if (user?.name) return user.name.split(' ')[0];
    return 'You';
  }

  signOut() {
    this.isUserMenuOpen = false;
    this.isMobileOpen = false;
    this.firebaseAuth.logout()
      .then(() => {
        this.api.logout();
        this.router.navigate(['/']);
      })
      .catch(() => {
        this.api.logout();
        this.router.navigate(['/']);
      });
  }
}
