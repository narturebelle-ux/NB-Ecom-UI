import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  template: `
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="container hero-container">
        <div class="hero-content">
          <div class="hero-pill animate-in">
            <mat-icon class="icon-sm">eco</mat-icon>
            <span>Professional-Led Care Coordination</span>
          </div>
          <h1 class="hero-title animate-in" style="animation-delay: 0.05s">
            Stage-Aware Care, From <span class="highlight-mandatory">Pregnancy to Childhood.</span>
          </h1>
          <p class="hero-desc animate-in" style="animation-delay: 0.1s">
            NartureBelle connects you with verified doctors, nurses and specialists who guide you through every stage — pregnancy, delivery, postpartum recovery, and early childcare up to age 7 — with your records kept secure and private throughout.
          </p>

          <div class="hero-cta-group animate-in" style="animation-delay: 0.15s">
            <a routerLink="/auth/login" class="btn btn-primary btn-lg">
              Get Started <mat-icon class="icon-sm">arrow_forward</mat-icon>
            </a>
          </div>

          <div class="hero-trust-row animate-in" style="animation-delay: 0.2s">
            <div class="trust-item">
              <mat-icon class="trust-icon">verified</mat-icon>
              <span>Verified Doctors &amp; Nurses</span>
            </div>
            <div class="divider"></div>
            <div class="trust-item">
              <mat-icon class="trust-icon">lock</mat-icon>
              <span>Secure, Private Records</span>
            </div>
            <div class="divider"></div>
            <div class="trust-item">
              <mat-icon class="trust-icon">eco</mat-icon>
              <span>Pregnancy to Age 7</span>
            </div>
          </div>
        </div>

        <div class="hero-card-column">
          <div class="journey-box card glass">
            <span class="box-tag">Your Care Journey</span>
            <h3>One partner, every stage</h3>
            <div class="journey-steps">
              <div class="journey-step">
                <span class="step-dot"></span>
                <div>
                  <strong>Pregnancy</strong>
                  <p>Stage-aware guidance from your first trimester onward</p>
                </div>
              </div>
              <div class="journey-step">
                <span class="step-dot"></span>
                <div>
                  <strong>Delivery &amp; Postpartum</strong>
                  <p>Support through delivery prep and recovery</p>
                </div>
              </div>
              <div class="journey-step">
                <span class="step-dot"></span>
                <div>
                  <strong>Early Childcare</strong>
                  <p>Continued care coordination up to age 7</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- What We Are / Are Not -->
    <section class="scope-section">
      <div class="container">
        <div class="scope-grid">
          <div class="scope-card card is-card">
            <h3><mat-icon class="icon-sm scope-icon is-icon">check_circle</mat-icon> What NartureBelle Is</h3>
            <ul>
              <li>A platform to find and coordinate care with verified maternal and child-health professionals</li>
              <li>A secure place to keep your health records and share them with your care team on your terms</li>
              <li>Stage-aware guidance that adapts to where you actually are in your journey</li>
            </ul>
          </div>
          <div class="scope-card card is-not-card">
            <h3><mat-icon class="icon-sm scope-icon is-not-icon">block</mat-icon> What NartureBelle Is Not</h3>
            <ul>
              <li>Not emergency care — in a medical emergency, contact your local emergency services immediately</li>
              <li>Not a replacement for your personal doctor or obstetrician's direct clinical advice</li>
              <li>Not a diagnostic service — recommendations are guidance, not a diagnosis</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Three Pillars -->
    <section class="pillars-section">
      <div class="container">
        <div class="section-header">
          <span class="tagline">How It Works</span>
          <h2>Care Coordination, Built Around You</h2>
          <p>Every mother's journey is different. We meet you wherever you're starting from.</p>
        </div>

        <div class="pillars-grid">
          <div class="pillar-card card">
            <div class="pillar-icon-box bg-sage">
              <mat-icon>stethoscope</mat-icon>
            </div>
            <span class="pillar-num">Pillar 01</span>
            <h3>Verified Professionals</h3>
            <p>
              Every doctor, nurse and specialist on NartureBelle is credential-verified before they can see you — so you know exactly who you're talking to.
            </p>
          </div>

          <div class="pillar-card card">
            <div class="pillar-icon-box bg-blush">
              <mat-icon>eco</mat-icon>
            </div>
            <span class="pillar-num">Pillar 02</span>
            <h3>Your Stage, Your Journey</h3>
            <p>
              Your care timeline adapts to where you are today — whether you're just starting your first trimester or already navigating early childcare.
            </p>
          </div>

          <div class="pillar-card card">
            <div class="pillar-icon-box bg-gold">
              <mat-icon>lock</mat-icon>
            </div>
            <span class="pillar-num">Pillar 03</span>
            <h3>Secure Records, Your Control</h3>
            <p>
              Keep your health records in one private place, and choose exactly what you share with your care team — and for how long.
            </p>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .hero-section {
      padding: 4.5rem 0 3.5rem 0;
      background: radial-gradient(circle at 80% 20%, rgba(235, 241, 237, 0.8) 0%, transparent 60%),
                  radial-gradient(circle at 10% 80%, rgba(253, 241, 238, 0.8) 0%, transparent 60%);
    }
    .hero-container {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 3.5rem;
      align-items: center;
    }

    .hero-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--sage-100);
      color: var(--sage-900);
      padding: 0.4rem 0.95rem;
      border-radius: var(--radius-full);
      font-size: 0.82rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1.25rem;
    }
    .hero-title {
      font-size: 3.1rem;
      line-height: 1.15;
      color: var(--sage-900);
      margin-bottom: 1.25rem;
      letter-spacing: -0.02em;
    }
    .highlight-mandatory {
      color: var(--blush-700);
      font-style: italic;
    }
    .hero-desc {
      font-size: 1.15rem;
      color: var(--text-secondary);
      line-height: 1.6;
      margin-bottom: 2rem;
      max-width: 560px;
    }

    .hero-cta-group {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 2.5rem;
    }

    .hero-trust-row {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border-light);
      flex-wrap: wrap;
    }
    .trust-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .trust-icon {
      font-size: 1.3rem;
      width: 1.3rem;
      height: 1.3rem;
      color: var(--sage-700);
    }
    .trust-item span {
      font-size: 0.82rem;
      color: var(--text-muted);
    }
    .divider {
      width: 1px;
      height: 32px;
      background: var(--border-light);
    }

    .journey-box {
      padding: 2.25rem;
      border-radius: var(--radius-xl);
      background: rgba(255, 255, 255, 0.9);
      box-shadow: var(--shadow-lg);
    }
    .box-tag {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 800;
      color: var(--blush-700);
      display: block;
      margin-bottom: 0.35rem;
    }
    .journey-box h3 {
      font-size: 1.5rem;
      color: var(--sage-900);
      margin-bottom: 1.5rem;
    }
    .journey-steps {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .journey-step {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }
    .step-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--sage-700);
      margin-top: 0.4rem;
      flex-shrink: 0;
    }
    .journey-step strong {
      display: block;
      font-size: 0.95rem;
      color: var(--sage-900);
    }
    .journey-step p {
      font-size: 0.82rem;
      color: var(--text-muted);
      margin-top: 0.15rem;
    }

    /* What we are / aren't */
    .scope-section {
      padding: 3.5rem 0;
    }
    .scope-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }
    .scope-card {
      padding: 2rem;
    }
    .scope-card h3 {
      font-size: 1.2rem;
      margin-bottom: 1rem;
      color: var(--sage-900);
    }
    .scope-card ul {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .scope-card li {
      font-size: 0.92rem;
      line-height: 1.5;
      color: var(--text-secondary);
      padding-left: 1.1rem;
      position: relative;
    }
    .scope-card li::before {
      content: '—';
      position: absolute;
      left: 0;
      color: var(--text-muted);
    }
    .is-not-card {
      background: #fdf8f6;
      border-color: var(--border-light);
    }

    /* Pillars Section */
    .pillars-section {
      padding: 4rem 0 5rem;
    }
    .pillars-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2rem;
    }
    .pillar-card {
      padding: 2.25rem;
      display: flex;
      flex-direction: column;
    }
    .pillar-icon-box {
      width: 56px;
      height: 56px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.25rem;
      transition: transform var(--transition-spring);
    }
    .pillar-icon-box mat-icon {
      font-size: 1.75rem;
      width: 1.75rem;
      height: 1.75rem;
      color: var(--sage-800);
    }
    .pillar-card:hover .pillar-icon-box { transform: scale(1.08) rotate(-3deg); }
    .scope-card h3 { display: flex; align-items: center; gap: 0.5rem; }
    .scope-icon.is-icon { color: var(--sage-600); }
    .scope-icon.is-not-icon { color: var(--blush-700); }
    .bg-sage { background: var(--sage-100); }
    .bg-blush { background: var(--blush-100); }
    .bg-gold { background: var(--gold-100); }

    .pillar-num {
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-bottom: 0.35rem;
    }
    .pillar-card h3 {
      font-size: 1.35rem;
      margin-bottom: 0.75rem;
      color: var(--sage-900);
    }
    .pillar-card p {
      font-size: 0.92rem;
      color: var(--text-secondary);
      line-height: 1.6;
    }

    .section-header {
      text-align: center;
      max-width: 620px;
      margin: 0 auto 3rem;
    }
    .tagline {
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 800;
      color: var(--blush-700);
      display: block;
      margin-bottom: 0.5rem;
    }
    .section-header h2 {
      font-size: 2rem;
      color: var(--sage-900);
      margin-bottom: 0.75rem;
    }
    .section-header p {
      color: var(--text-secondary);
      font-size: 1rem;
    }

    @media (max-width: 992px) {
      .hero-container {
        grid-template-columns: 1fr;
      }
      .scope-grid {
        grid-template-columns: 1fr;
      }
      .pillars-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class HomeComponent {}
