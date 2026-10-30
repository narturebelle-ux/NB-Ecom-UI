import { Component, computed, effect, inject, untracked } from '@angular/core';
import { isAdminUser, isProfessionalUser, isReviewerUser } from '../../models/maternal.models';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { FirebaseAuthService } from '../../services/firebase-auth.service';
import { NotificationService } from '../../services/notification.service';
import { OnboardingService } from '../../services/onboarding.service';
import { ThemeService } from '../../services/theme.service';
import { CommerceService } from '../../services/commerce.service';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FeatureDirective } from '../../directives/feature.directive';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, MatIconModule, FeatureDirective],
  template: `
    <!-- Top Announcement Bar (legacy lead-gen promo — hidden, not deleted) -->
    <div *appFeature="'legacyLeadForms'" class="announcement-bar">
      <div class="container announcement-content">
        <span><strong>Free OB-GYN Live Masterclass:</strong> 1st Trimester Nutrition &amp; Safe Scans this Saturday!</span>
        <a routerLink="/doctors-live" class="announcement-link">Reserve Free Seat &rarr;</a>
      </div>
    </div>

    <!-- Main Navigation Header -->
    <header class="main-header glass">
      <div class="container header-container">
        <!-- Brand Logo -->
        <a routerLink="/" class="brand-logo">
          <img src="favicon.svg" alt="NartureBelle™ logo" class="logo-mark">
          <div class="logo-text">
            <span class="brand-title">NartureBelle<span class="trademark">™</span></span>
            <span class="brand-sub">Nurturing You, Nurturing Life</span>
          </div>
        </a>

        <!-- Desktop Navigation Links — signed-in users only; guests only need sign in / get started.
             Until onboarding is complete, the only destination is onboarding itself. -->
        @if (isAdmin()) {
          <nav class="nav-links">
            <a routerLink="/admin/careers" routerLinkActive="active" class="nav-link"><mat-icon class="icon-sm">admin_panel_settings</mat-icon> Careers admin</a>
            <a routerLink="/admin/ideas" routerLinkActive="active" class="nav-link"><mat-icon class="icon-sm">lightbulb</mat-icon> Ideas admin</a>
          </nav>
        }
        @if (isProfessional()) {
          <nav class="nav-links">
            <a routerLink="/provider" routerLinkActive="active" class="nav-link">My sessions</a>
            @if (isReviewer()) { <a routerLink="/review/health-rules" routerLinkActive="active" class="nav-link">Rule review</a> }
          </nav>
        }
        @if (api.currentUser() && !isProfessional() && !onboarding.onboarded()) {
          <nav class="nav-links">
            <a routerLink="/onboarding" routerLinkActive="active" class="nav-link onboarding-link">
              <mat-icon class="icon-sm">flag</mat-icon> Complete your onboarding
            </a>
          </nav>
        }
        @if (api.currentUser() && !isProfessional() && onboarding.onboarded()) {
        <nav class="nav-links">
          <a routerLink="/journey" routerLinkActive="active" class="nav-link">My Journey</a>
          <a *appFeature="'careBooking'" routerLink="/care" routerLinkActive="active" class="nav-link">Care</a>
          <a *appFeature="'recordsVault'" routerLink="/records" routerLinkActive="active" class="nav-link">Records</a>
          <a *appFeature="'childTracker'" routerLink="/child" routerLinkActive="active" class="nav-link">Child</a>
          <a *appFeature="'joyCircle'" routerLink="/joy-circle" routerLinkActive="active" class="nav-link">Joy Circle</a>
          <a *appFeature="'productRecommendations'" routerLink="/recommendations" routerLinkActive="active" class="nav-link">For you</a>
          <a *appFeature="'aiAssistant'" routerLink="/ai" routerLinkActive="active" class="nav-link">AI</a>
          @if (!hasActivePlan()) { <a routerLink="/plans" routerLinkActive="active" class="nav-link">Plans</a> }


          <a routerLink="/checklists" routerLinkActive="active" class="nav-link highlight-link">
            <mat-icon class="icon-sm">fact_check</mat-icon> Checkup Checklist
          </a>

          <!-- Legacy lead-gen nav links — hidden, not deleted -->
          <a *appFeature="'legacyLeadForms'" routerLink="/services/nurse-companion" routerLinkActive="active" class="nav-link nurse-link">
            <mat-icon class="icon-sm">medical_services</mat-icon> Nurse Companion
          </a>
          <a *appFeature="'legacyLeadForms'" routerLink="/doctors-live" routerLinkActive="active" class="nav-link doctor-link">
            <mat-icon class="icon-sm">videocam</mat-icon> Doctor Live
          </a>
        </nav>
        }

        <!-- Right Header Actions -->
        <div class="header-actions">
          <button type="button" class="cart-btn theme-toggle" (click)="theme.toggle()"
                  [attr.aria-label]="theme.theme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
                  [attr.title]="theme.theme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'">
            <mat-icon class="cart-icon">{{ theme.theme() === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
          </button>

          <!-- Cart Drawer Toggle -->
          <button *appFeature="'productRecommendations'" (click)="toggleCart()" class="cart-btn" aria-label="Shopping Cart">
            <mat-icon class="cart-icon">shopping_bag</mat-icon>
            @if (api.cartCount() > 0) {
              <span class="cart-badge">{{ api.cartCount() }}</span>
            }
          </button>

          <!-- Reminder bell (roadmap §Phase 5) -->
          @if (api.currentUser()) {
            <div class="bell-menu" [class.menu-open]="isBellOpen">
              <button class="bell-btn" (click)="toggleBell()" type="button" aria-label="Reminders">
                <mat-icon>notifications</mat-icon>
                @if (notifications.unreadCount() > 0) {
                  <span class="cart-badge">{{ notifications.unreadCount() }}</span>
                }
              </button>
              @if (isBellOpen) {
                <div class="bell-dropdown">
                  @if (notifications.reminders().length === 0) {
                    <p class="bell-empty">No reminders right now.</p>
                  } @else {
                    @for (r of notifications.reminders(); track r.id) {
                      <div class="bell-item" [class.unread]="!notifications.isRead(r.id)" (click)="openReminder(r.id)">
                        <strong>{{ r.title }}</strong>
                        <p>{{ r.body }}</p>
                        <button class="dismiss-btn" (click)="dismissReminder($event, r.id)">Dismiss</button>
                      </div>
                    }
                  }
                </div>
              }
            </div>
          }

          <!-- Auth: signed-in user dropdown -->
          @if (api.currentUser(); as user) {
            <div class="user-menu" [class.menu-open]="isUserMenuOpen">
              <button class="user-pill" (click)="toggleUserMenu()" type="button">
                <mat-icon class="user-avatar">account_circle</mat-icon>
                <span class="user-name">{{ getDisplayName(user) }}</span>
                <mat-icon class="chevron">{{ isUserMenuOpen ? 'expand_less' : 'expand_more' }}</mat-icon>
              </button>
              @if (isUserMenuOpen) {
                <div class="user-dropdown">
                  @if (needsName(user)) {
                    <a routerLink="/profile" class="dropdown-item" (click)="isUserMenuOpen = false">
                      <mat-icon class="icon-sm">edit</mat-icon> Add your name
                    </a>
                    <hr class="dropdown-divider">
                  }
                  <a routerLink="/profile" class="dropdown-item" (click)="isUserMenuOpen = false">
                    <mat-icon class="icon-sm">person</mat-icon> My Profile
                  </a>
                  @if (hasActivePlan()) {
                    <a routerLink="/ideas" class="dropdown-item" (click)="isUserMenuOpen = false">
                      <mat-icon class="icon-sm">lightbulb</mat-icon> Share an Idea
                    </a>
                  }
                  @if (!isProfessional()) {
                    <a routerLink="/invite" class="dropdown-item" (click)="isUserMenuOpen = false">
                      <mat-icon class="icon-sm">card_giftcard</mat-icon> Refer &amp; Invite
                    </a>
                  }
                  <a routerLink="/profile" fragment="privacy" class="dropdown-item" (click)="isUserMenuOpen = false">
                    <mat-icon class="icon-sm">shield_person</mat-icon> Privacy
                  </a>
                  <hr class="dropdown-divider">
                  <button class="dropdown-item sign-out-item" (click)="signOut()">
                    <mat-icon class="icon-sm">logout</mat-icon> Sign Out
                  </button>
                </div>
              }
            </div>
          } @else {
            <a routerLink="/about" class="btn btn-ghost-nav btn-sm about-link">About us</a>
            <a routerLink="/auth/login" class="btn btn-ghost-nav btn-sm login-btn">Sign in</a>
            <a routerLink="/auth/signup" class="btn btn-primary btn-sm get-started-btn">Get started</a>
          }

          <!-- Mobile Hamburger Toggle (signed-in only; guests have nothing to navigate to yet) -->
          @if (api.currentUser()) {
            <button (click)="toggleMobileMenu()" class="mobile-toggle" aria-label="Toggle Navigation">
              <mat-icon>{{ isMobileOpen ? 'close' : 'menu' }}</mat-icon>
            </button>
          }
        </div>
      </div>

      <!-- Mobile Navigation Drawer -->
      @if (isMobileOpen && api.currentUser()) {
        <div class="mobile-menu glass">
          @if (isProfessional()) {
            <a routerLink="/provider" (click)="isMobileOpen = false" class="mobile-nav-link"><mat-icon class="icon-sm">event_note</mat-icon> My sessions</a>
            @if (isReviewer()) { <a routerLink="/review/health-rules" (click)="isMobileOpen = false" class="mobile-nav-link"><mat-icon class="icon-sm">fact_check</mat-icon> Rule review</a> }
          } @else if (!onboarding.onboarded()) {
            <a routerLink="/onboarding" (click)="isMobileOpen = false" class="mobile-nav-link onboarding-link">
              <mat-icon class="icon-sm">flag</mat-icon> Complete your onboarding
            </a>
          } @else {

          @if (api.currentUser()) {
            <a routerLink="/journey" (click)="isMobileOpen = false" class="mobile-nav-link"><mat-icon class="icon-sm">eco</mat-icon> My Journey</a>
            <a *appFeature="'careBooking'" routerLink="/care" (click)="isMobileOpen = false" class="mobile-nav-link">Care</a>
            <a *appFeature="'recordsVault'" routerLink="/records" (click)="isMobileOpen = false" class="mobile-nav-link">Records</a>
            <a *appFeature="'childTracker'" routerLink="/child" (click)="isMobileOpen = false" class="mobile-nav-link">Child</a>
            <a *appFeature="'joyCircle'" routerLink="/joy-circle" (click)="isMobileOpen = false" class="mobile-nav-link">Joy Circle</a>
            <a *appFeature="'productRecommendations'" routerLink="/recommendations" (click)="isMobileOpen = false" class="mobile-nav-link">For you</a>
            <a *appFeature="'aiAssistant'" routerLink="/ai" (click)="isMobileOpen = false" class="mobile-nav-link">AI</a>
          }
          @if (!hasActivePlan()) {
            <a routerLink="/plans" (click)="isMobileOpen = false" class="mobile-nav-link"><mat-icon class="icon-sm">workspace_premium</mat-icon> Care Plans</a>
          }

          <hr class="mobile-divider">
          <a routerLink="/checklists" (click)="isMobileOpen = false" class="mobile-nav-link">
            <mat-icon class="icon-sm">fact_check</mat-icon> Prenatal Checkup Checklist &amp; Labs
          </a>
          <a *appFeature="'legacyLeadForms'" routerLink="/services/nurse-companion" (click)="isMobileOpen = false" class="mobile-nav-link">
            Dedicated Nurse Care Companion
          </a>
          <a *appFeature="'legacyLeadForms'" routerLink="/doctors-live" (click)="isMobileOpen = false" class="mobile-nav-link">
            OB-GYN Live Webinars
          </a>
          }
          <hr class="mobile-divider">
          @if (api.currentUser(); as user) {
            <a routerLink="/profile" (click)="isMobileOpen = false" class="mobile-nav-link profile-link">
              <mat-icon class="icon-sm">person</mat-icon> My Profile ({{ getDisplayName(user) }})
            </a>
            @if (hasActivePlan()) {
              <a routerLink="/ideas" (click)="isMobileOpen = false" class="mobile-nav-link">
                <mat-icon class="icon-sm">lightbulb</mat-icon> Share an Idea
              </a>
            }
            @if (!isProfessional()) {
              <a routerLink="/invite" (click)="isMobileOpen = false" class="mobile-nav-link">
                <mat-icon class="icon-sm">card_giftcard</mat-icon> Refer &amp; Invite
              </a>
            }
            <a routerLink="/profile" fragment="privacy" (click)="isMobileOpen = false" class="mobile-nav-link">
              <mat-icon class="icon-sm">shield_person</mat-icon> Privacy
            </a>
            <button (click)="signOut()" class="btn btn-outline btn-sm mobile-action-btn">
              <mat-icon class="icon-sm">logout</mat-icon> Sign Out
            </button>
          } @else {
            <a routerLink="/auth/login" (click)="isMobileOpen = false" class="btn btn-outline btn-sm mobile-action-btn">
              Sign In
            </a>
          }
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
      background: var(--bg-surface);
      box-shadow: 0 2px 6px rgba(46,79,62,0.1);
      color: var(--sage-900);
    }
    .pill-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: var(--solid-blush-700);
      display: inline-block;
    }

    .highlight-link { color: var(--sage-800); font-weight: 700; }
    .onboarding-link { color: var(--sage-900); font-weight: 700; background: var(--sage-50); border: 1px solid var(--sage-200); border-radius: var(--radius-full); padding: 0.4rem 0.9rem; }
    .nurse-link { color: var(--blush-800); font-weight: 700; }
    .doctor-link { color: var(--danger-text); font-weight: 700; }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .login-btn, .get-started-btn { white-space: nowrap; flex-shrink: 0; }
    .btn-ghost-nav { background: transparent; color: var(--sage-800); font-weight: 700; }
    .btn-ghost-nav:hover { background: var(--sage-50); color: var(--sage-900); }
    @media (max-width: 480px) { .login-btn { display: none; } }
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
    .cart-icon { font-size: 1.25rem; width: 1.25rem; height: 1.25rem; }
    .cart-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background-color: var(--solid-blush-700);
      color: #fff;
      font-size: 0.7rem;
      font-weight: 800;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--bg-surface);
    }

    /* Reminder bell (roadmap §Phase 5) */
    .bell-menu { position: relative; }
    .bell-btn {
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
      font-size: 1.1rem;
    }
    .bell-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      background: var(--bg-surface);
      border: 1px solid var(--border-light);
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(27,51,39,0.12);
      min-width: 280px;
      max-height: 360px;
      overflow-y: auto;
      z-index: 2000;
      padding: 0.5rem;
      animation: dropIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .bell-empty { font-size: 0.85rem; color: var(--text-muted); padding: 0.75rem; text-align: center; }
    .bell-item {
      padding: 0.65rem 0.75rem;
      border-radius: 8px;
      cursor: pointer;
      margin-bottom: 0.25rem;
    }
    .bell-item:hover { background: var(--sage-50); }
    .bell-item.unread { background: var(--sage-50); }
    .bell-item strong { display: block; font-size: 0.85rem; color: var(--sage-900); }
    .bell-item p { font-size: 0.78rem; color: var(--text-secondary); margin: 0.2rem 0 0.35rem; }
    .dismiss-btn { background: none; border: none; color: var(--text-muted); font-size: 0.72rem; text-decoration: underline; cursor: pointer; padding: 0; }

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
      background: var(--sage-100);
    }
    .user-avatar { font-size: 1.3rem; width: 1.3rem; height: 1.3rem; color: var(--sage-700); }
    .user-name {
      font-weight: 600;
      font-size: 0.85rem;
      color: var(--sage-900);
    }
    .chevron {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      color: var(--text-muted);
      margin-left: 0.1rem;
      transition: transform var(--transition-fast);
    }
    .user-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      background: var(--bg-surface);
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
    .sign-out-item { color: var(--danger-text); }
    .sign-out-item:hover { background: var(--danger-bg); }

    .mobile-toggle {
      display: none;
      font-size: 1.5rem;
      color: var(--sage-900);
      cursor: pointer;
    }

    /* Mobile Menu */
    .mobile-menu {
      animation: dropIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
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
      background: var(--bg-surface);
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
      .about-link { display: none; }
      .mobile-toggle { display: block; }
    }
    /* Phones: keep the menu button on screen. The name and tagline give way; the menu has the same details. */
    @media (max-width: 640px) {
      .brand-sub, .user-name, .chevron { display: none; }
      .brand-title { font-size: 1.1rem; }
      .header-actions { gap: 0.35rem; }
      .cart-btn { width: 36px; height: 36px; }
      .user-pill { padding: 0.35rem; }
    }
    @media (max-width: 380px) {
      .logo-text { display: none; }
    }
  `]
})
export class NavbarComponent {
  api = inject(ApiService);
  firebaseAuth = inject(FirebaseAuthService);
  notifications = inject(NotificationService);
  onboarding = inject(OnboardingService);
  theme = inject(ThemeService);
  private commerce = inject(CommerceService);
  /** Once she has a plan, it lives on My Journey instead of the nav, and Share an Idea opens up. If the check fails, Plans stays visible. */
  hasActivePlan = this.commerce.hasActivePlan;
  private planCheckedFor: number | null = null;
  isProfessional = computed(() => isProfessionalUser(this.api.currentUser()));
  /** Reviewers include MEDICAL_REVIEWER staff, who aren't professionals, so they get the link even outside the portal. */
  isReviewer = computed(() => isReviewerUser(this.api.currentUser()));
  isAdmin = computed(() => isAdminUser(this.api.currentUser()));
  router = inject(Router);

  isMobileOpen = false;
  isUserMenuOpen = false;
  isBellOpen = false;

  constructor() {
    // Reminders are generated server-side every 15 min; load them once the app is unlocked.
    effect(() => {
      if (this.api.currentUser() && this.onboarding.onboarded()) untracked(() => this.notifications.refresh());
    });
    effect(() => {
      const id = this.api.currentUser()?.id ?? null;
      if (id === this.planCheckedFor) return;
      this.planCheckedFor = id;
      untracked(() => {
        this.commerce.entitlements.set([]);
        if (id) this.commerce.loadEntitlements().subscribe({ error: () => {} });
      });
    });
  }

  toggleBell() {
    this.isBellOpen = !this.isBellOpen;
    if (this.isBellOpen) this.notifications.refresh();
  }

  openReminder(id: number) {
    this.notifications.markRead(id);
  }

  dismissReminder(event: Event, id: number) {
    event.stopPropagation();
    this.notifications.dismiss(id);
  }

  toggleMobileMenu() {
    this.isMobileOpen = !this.isMobileOpen;
  }

  toggleUserMenu() {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  toggleCart() {
    this.api.isCartOpen.set(!this.api.isCartOpen());
    this.isUserMenuOpen = false;
  }

  /** Full "First Last" per roadmap §0.5, falling back to first name only, then email, then a prompt. */
  getDisplayName(user: any): string {
    if (user?.firstName) return [user.firstName, user.lastName].filter(Boolean).join(' ');
    if (user?.name) return user.name;
    if (user?.email) return user.email;
    return 'Add your name';
  }

  /** Phone-only users with no name on file get prompted to add one. */
  needsName(user: any): boolean {
    return !user?.firstName && !user?.name && !user?.email;
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
