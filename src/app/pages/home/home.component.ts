import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { CommerceService } from '../../services/commerce.service';
import { OnboardingService } from '../../services/onboarding.service';
import { RevealDirective } from '../../directives/reveal.directive';
import { Plan } from '../../models/commerce.models';

/**
 * Landing page. Deliberately avoids invented social proof (no testimonials, user counts or
 * ratings) — every claim here describes something the product actually does. The plans teaser
 * reads live prices from the public GET /plans rather than hard-coding them (roadmap rule).
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, RevealDirective],
  template: `
    <!-- ============ HERO ============ -->
    <section class="hero">
      <div class="container hero-grid">
        <div class="hero-copy">
          <div class="eyebrow animate-in">
            <mat-icon class="icon-sm">eco</mat-icon>
            Care coordination for mothers & young families
          </div>
          <h1 class="hero-title animate-in" style="animation-delay: 60ms">
            Every stage of motherhood, <em>with a team that knows you.</em>
          </h1>
          <p class="hero-lead animate-in" style="animation-delay: 120ms">
            From your first trimester to your child's seventh birthday, NartureBelle connects you with
            verified doctors, nurses and specialists — and keeps your plan, your appointments and your
            records together in one private place.
          </p>
          <div class="hero-ctas animate-in" style="animation-delay: 180ms">
            @if (api.currentUser()) {
              <a [routerLink]="onboarding.onboarded() ? '/journey' : '/onboarding'" class="btn btn-primary btn-lg">{{ onboarding.onboarded() ? 'Go to my journey' : 'Continue onboarding' }} <mat-icon class="icon-sm">arrow_forward</mat-icon></a>
            } @else {
              <a routerLink="/auth/signup" class="btn btn-primary btn-lg">Start your journey <mat-icon class="icon-sm">arrow_forward</mat-icon></a>
            }
            <a href="#how-it-works" class="btn btn-ghost btn-lg">See how it works</a>
          </div>
          <ul class="hero-assurances animate-in" style="animation-delay: 240ms">
            <li><mat-icon class="icon-sm">verified</mat-icon> Credential-verified professionals</li>
            <li><mat-icon class="icon-sm">lock</mat-icon> You decide who sees your records</li>
            <li><mat-icon class="icon-sm">event_available</mat-icon> Join at any stage</li>
          </ul>
        </div>

        <!-- Illustrative product preview (decorative; real data lives in My Journey) -->
        <div class="hero-visual" aria-hidden="true">
          <div class="blob blob-a"></div>
          <div class="blob blob-b"></div>

          <div class="preview-card glass float-slow">
            <div class="preview-head">
              <span class="preview-label">My Journey</span>
              <span class="preview-chip">Trimester 2</span>
            </div>
            <div class="preview-week">
              <svg viewBox="0 0 120 120" class="ring">
                <circle cx="60" cy="60" r="50" class="ring-track" />
                <circle cx="60" cy="60" r="50" class="ring-fill" />
              </svg>
              <div class="ring-text"><strong>23</strong><span>weeks</span></div>
            </div>
            <div class="preview-list">
              <div class="preview-item">
                <span class="dot sage"></span>
                <div><strong>Second-trimester check-up</strong><span>Gynecologist · this week</span></div>
              </div>
              <div class="preview-item">
                <span class="dot blush"></span>
                <div><strong>Nutrition planning</strong><span>Nutritionist · booked Thu, 10:00</span></div>
              </div>
            </div>
          </div>

          <div class="float-chip chip-verified glass float-fast">
            <span class="mini-avatar">AS</span>
            <div><strong>Your gynecologist</strong><span><mat-icon class="tiny">verified</mat-icon> Verified</span></div>
          </div>

          <div class="float-chip chip-share glass float-mid">
            <mat-icon class="chip-icon">lock</mat-icon>
            <div><strong>Scan report shared</strong><span>Access ends in 7 days</span></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ STAGES ============ -->
    <section class="stages">
      <div class="container">
        <div class="section-intro" appReveal>
          <span class="kicker">One continuous journey</span>
          <h2>Care that moves with you, stage by stage</h2>
          <p>Your timeline adapts to where you are today — and never asks you to catch up on stages you've already passed.</p>
        </div>

        <ol class="stage-track">
          @for (s of stages; track s.title; let i = $index) {
            <li class="stage" appReveal [revealDelay]="i * 90">
              <span class="stage-icon"><mat-icon>{{ s.icon }}</mat-icon></span>
              <span class="stage-step">{{ i + 1 }}</span>
              <h3>{{ s.title }}</h3>
              <p>{{ s.text }}</p>
            </li>
          }
        </ol>
      </div>
    </section>

    <!-- ============ HOW IT WORKS ============ -->
    <section class="how" id="how-it-works">
      <div class="container how-grid">
        <div class="how-intro" appReveal>
          <span class="kicker">How it works</span>
          <h2>Three calm steps to getting started</h2>
          <p>No long forms at sign-up. You share what you want, when you want.</p>
          <a routerLink="/auth/signup" class="btn btn-outline">Create your account</a>
        </div>
        <div class="how-steps">
          @for (step of steps; track step.title; let i = $index) {
            <div class="how-step glass" appReveal [revealDelay]="i * 110">
              <span class="how-num">0{{ i + 1 }}</span>
              <div>
                <h3>{{ step.title }}</h3>
                <p>{{ step.text }}</p>
              </div>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- ============ CARE TEAM ============ -->
    <section class="team">
      <div class="container">
        <div class="section-intro" appReveal>
          <span class="kicker">Your care team</span>
          <h2>The right professional for each moment</h2>
          <p>Every professional is credential-verified before they can be booked — you always know who you're talking to.</p>
        </div>
        <div class="team-grid">
          @for (t of team; track t.title; let i = $index) {
            <div class="team-card" appReveal [revealDelay]="(i % 3) * 80">
              <span class="team-icon" [class]="'tone-' + t.tone"><mat-icon>{{ t.icon }}</mat-icon></span>
              <h3>{{ t.title }}</h3>
              <p>{{ t.text }}</p>
            </div>
          }
        </div>
        <div class="team-cta" appReveal>
          <a routerLink="/care" class="btn btn-ghost">Browse verified professionals <mat-icon class="icon-sm">arrow_forward</mat-icon></a>
        </div>
      </div>
    </section>

    <!-- ============ TRUST ============ -->
    <section class="trust">
      <div class="container trust-grid">
        <div class="trust-copy" appReveal>
          <span class="kicker light">Privacy & trust</span>
          <h2>Your health information stays yours</h2>
          <p>
            We built NartureBelle around consent. You agree to how your information is used before
            anything is personalised, and you can review or withdraw that consent at any time.
          </p>
          <ul class="trust-list">
            <li><mat-icon>fact_check</mat-icon><div><strong>Consent first</strong><span>Nothing is personalised until you've agreed — and you can change your mind.</span></div></li>
            <li><mat-icon>share</mat-icon><div><strong>Share on your terms</strong><span>Share a record with one professional, for a set time, and revoke it whenever you like.</span></div></li>
            <li><mat-icon>history</mat-icon><div><strong>See every access</strong><span>An access history shows who viewed, downloaded or shared your records.</span></div></li>
          </ul>
        </div>

        <div class="honesty glass-deep" appReveal [revealDelay]="120">
          <h3>What NartureBelle is — and isn't</h3>
          <div class="honesty-cols">
            <div>
              <span class="honesty-head is"><mat-icon class="icon-sm">check_circle</mat-icon> We are</span>
              <ul>
                <li>A way to find and coordinate care with verified professionals</li>
                <li>A private place for your plan, sessions and records</li>
                <li>Guidance that adapts to your stage</li>
              </ul>
            </div>
            <div>
              <span class="honesty-head isnt"><mat-icon class="icon-sm">block</mat-icon> We are not</span>
              <ul>
                <li>Emergency care — call your local emergency services</li>
                <li>A replacement for your own doctor's clinical advice</li>
                <li>A diagnostic service</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ PLANS TEASER ============ -->
    <section class="plans-teaser">
      <div class="container">
        <div class="plans-card glass" appReveal>
          <div>
            <span class="kicker">Care plans</span>
            <h2>One plan, your whole care team</h2>
            <p>
              Each plan includes sessions with the professionals you need at your stage, tracked in a
              simple session wallet.
              @if (lowestPrice(); as price) {
                Plans start at <strong>₹{{ price | number:'1.0-0' }}</strong>, with an installment option.
              }
            </p>
          </div>
          <a routerLink="/plans" class="btn btn-primary btn-lg">Compare plans <mat-icon class="icon-sm">arrow_forward</mat-icon></a>
        </div>
      </div>
    </section>

    <!-- ============ FAQ ============ -->
    <section class="faq">
      <div class="container faq-grid">
        <div class="section-intro left" appReveal>
          <span class="kicker">Questions</span>
          <h2>Good to know</h2>
          <p>Something we haven't answered? Our care team is happy to help.</p>
        </div>
        <div class="faq-list">
          @for (q of faqs; track q.q; let i = $index) {
            <details class="faq-item" appReveal [revealDelay]="i * 60">
              <summary>{{ q.q }} <mat-icon class="faq-chevron">expand_more</mat-icon></summary>
              <p>{{ q.a }}</p>
            </details>
          }
        </div>
      </div>
    </section>

    <!-- ============ FINAL CTA ============ -->
    <section class="final-cta">
      <div class="container">
        <div class="final-card" appReveal>
          <h2>Wherever you are in your journey, start here.</h2>
          <p>Create your account in a minute, then tell us a little about you so we can suggest the right care.</p>
          @if (api.currentUser()) {
            <a [routerLink]="onboarding.onboarded() ? '/journey' : '/onboarding'" class="btn btn-light btn-lg">{{ onboarding.onboarded() ? 'Go to my journey' : 'Continue onboarding' }}</a>
          } @else {
            <a routerLink="/auth/signup" class="btn btn-light btn-lg">Get started</a>
          }
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; overflow-x: clip; }
    section { padding: 5.5rem 0; }
    .kicker { display: inline-block; font-size: 0.78rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--blush-700); margin-bottom: 0.75rem; }
    .kicker.light { color: var(--solid-blush-200); }
    h2 { font-size: clamp(1.8rem, 3vw, 2.5rem); letter-spacing: -0.015em; margin-bottom: 1rem; }
    .section-intro { max-width: 640px; margin: 0 auto 3.25rem; text-align: center; }
    .section-intro.left { text-align: left; margin: 0; }
    .section-intro p { color: var(--text-secondary); font-size: 1.05rem; }
    .btn-ghost { background: var(--bg-glass-strong); color: var(--sage-800); border: 1px solid var(--border-light); backdrop-filter: blur(10px); }
    .btn-ghost:hover { background: var(--bg-surface); transform: translateY(-2px); box-shadow: var(--shadow-sm); }
    .btn-light { background: var(--bg-surface); color: var(--sage-900); box-shadow: var(--shadow-md); }
    .btn-light:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }

    /* ---------- Hero ---------- */
    .hero { padding: 4.5rem 0 5rem; position: relative; }
    .hero-grid { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 3.5rem; align-items: center; }
    .eyebrow { display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.4rem 0.95rem; border-radius: var(--radius-full); background: var(--bg-glass-strong); border: 1px solid var(--border-light); color: var(--sage-800); font-size: 0.82rem; font-weight: 700; margin-bottom: 1.5rem; }
    .hero-title { font-size: clamp(2.4rem, 5vw, 3.6rem); line-height: 1.08; letter-spacing: -0.025em; color: var(--sage-900); margin-bottom: 1.4rem; }
    .hero-title em { font-style: italic; color: var(--blush-700); font-weight: 600; }
    .hero-lead { font-size: 1.15rem; line-height: 1.65; color: var(--text-secondary); max-width: 540px; margin-bottom: 2.1rem; }
    .hero-ctas { display: flex; gap: 0.85rem; flex-wrap: wrap; margin-bottom: 2.25rem; }
    .hero-assurances { list-style: none; display: flex; flex-wrap: wrap; gap: 0.6rem 1.4rem; }
    .hero-assurances li { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.86rem; color: var(--text-secondary); font-weight: 500; }
    .hero-assurances mat-icon { color: var(--trust-500); }

    .hero-visual { position: relative; min-height: 470px; }
    .blob { position: absolute; border-radius: 50%; filter: blur(42px); opacity: 0.75; }
    .blob-a { width: 340px; height: 340px; background: var(--sage-200); top: 20px; right: 10px; }
    .blob-b { width: 260px; height: 260px; background: var(--blush-200); bottom: 10px; left: 20px; }

    .preview-card { position: absolute; top: 40px; left: 50%; transform: translateX(-50%); width: min(340px, 90%); border-radius: var(--radius-xl); padding: 1.6rem; }
    .preview-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.1rem; }
    .preview-label { font-family: var(--font-serif); font-weight: 600; font-size: 1.15rem; color: var(--sage-900); }
    .preview-chip { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--blush-800); background: var(--blush-100); padding: 0.25rem 0.65rem; border-radius: var(--radius-full); }
    .preview-week { position: relative; width: 130px; height: 130px; margin: 0 auto 1.25rem; }
    .ring { width: 100%; height: 100%; transform: rotate(-90deg); }
    .ring-track { fill: none; stroke: var(--sage-100); stroke-width: 10; }
    .ring-fill { fill: none; stroke: var(--sage-600); stroke-width: 10; stroke-linecap: round; stroke-dasharray: 314; stroke-dashoffset: 314; animation: ring-draw 1.6s 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes ring-draw { to { stroke-dashoffset: 133; } }
    .ring-text { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .ring-text strong { font-family: var(--font-serif); font-size: 2.1rem; color: var(--sage-900); line-height: 1; }
    .ring-text span { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; }
    .preview-list { display: flex; flex-direction: column; gap: 0.7rem; }
    .preview-item { display: flex; gap: 0.7rem; align-items: flex-start; padding: 0.7rem 0.8rem; border-radius: var(--radius-md); background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); }
    .preview-item strong { display: block; font-size: 0.85rem; color: var(--sage-900); }
    .preview-item span { font-size: 0.75rem; color: var(--text-muted); }
    .dot { width: 9px; height: 9px; border-radius: 50%; margin-top: 0.4rem; flex-shrink: 0; }
    .dot.sage { background: var(--solid-sage-500); }
    .dot.blush { background: var(--solid-blush-500); }

    .float-chip { position: absolute; display: flex; align-items: center; gap: 0.65rem; padding: 0.75rem 1rem; border-radius: var(--radius-lg); }
    .float-chip strong { display: block; font-size: 0.8rem; color: var(--sage-900); }
    .float-chip span { display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.72rem; color: var(--text-muted); }
    .chip-verified { top: 6px; left: 0; }
    .chip-share { bottom: 26px; right: 0; }
    .mini-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; color: var(--sage-800); background: linear-gradient(135deg, var(--sage-100), var(--trust-100)); }
    .chip-icon { color: var(--trust-700); background: var(--trust-100); border-radius: 50%; padding: 0.45rem; box-sizing: content-box; font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    .tiny { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; color: var(--trust-500); }

    .float-slow { animation: float 7s ease-in-out infinite; }
    .float-mid { animation: float 6s ease-in-out -2s infinite; }
    .float-fast { animation: float 5s ease-in-out -1s infinite; }
    .preview-card.float-slow { animation-name: float-centered; }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
    @keyframes float-centered { 0%, 100% { transform: translate(-50%, 0); } 50% { transform: translate(-50%, -10px); } }

    /* ---------- Stages ---------- */
    .stages { background: linear-gradient(180deg, transparent, var(--glow-sage) 30%, transparent); }
    .stage-track { list-style: none; display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; position: relative; }
    .stage-track::before { content: ''; position: absolute; top: 32px; left: 12%; right: 12%; height: 2px; background: linear-gradient(90deg, var(--sage-200), var(--blush-200), var(--trust-200)); z-index: 0; }
    .stage { position: relative; z-index: 1; text-align: center; padding: 0 0.5rem; }
    .stage-icon { width: 64px; height: 64px; margin: 0 auto 1rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--bg-surface); border: 1px solid var(--border-light); box-shadow: var(--shadow-sm); color: var(--sage-700); transition: transform var(--transition-spring); }
    .stage:hover .stage-icon { transform: translateY(-4px) scale(1.06); }
    .stage-step { display: block; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.1em; color: var(--text-muted); margin-bottom: 0.35rem; }
    .stage h3 { font-size: 1.15rem; margin-bottom: 0.45rem; }
    .stage p { font-size: 0.88rem; color: var(--text-secondary); line-height: 1.55; }

    /* ---------- How it works ---------- */
    .how-grid { display: grid; grid-template-columns: 0.85fr 1.15fr; gap: 3.5rem; align-items: center; }
    .how-intro p { color: var(--text-secondary); margin-bottom: 1.75rem; font-size: 1.05rem; }
    .how-steps { display: flex; flex-direction: column; gap: 1rem; }
    .how-step { display: flex; gap: 1.25rem; align-items: flex-start; padding: 1.4rem 1.6rem; border-radius: var(--radius-lg); transition: transform var(--transition-smooth), box-shadow var(--transition-smooth); }
    .how-step:hover { transform: translateX(6px); box-shadow: var(--shadow-lg); }
    .how-num { font-family: var(--font-serif); font-size: 1.9rem; font-weight: 600; color: var(--blush-500); line-height: 1; min-width: 2.4rem; }
    .how-step h3 { font-size: 1.1rem; margin-bottom: 0.3rem; }
    .how-step p { font-size: 0.9rem; color: var(--text-secondary); }

    /* ---------- Team ---------- */
    .team-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; }
    .team-card { padding: 1.6rem; border-radius: var(--radius-lg); background: var(--bg-glass-strong); border: 1px solid var(--border-light); transition: transform var(--transition-smooth), box-shadow var(--transition-smooth), border-color var(--transition-smooth); }
    .team-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-md); border-color: var(--sage-200); }
    .team-icon { width: 48px; height: 48px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; }
    .tone-sage { background: var(--sage-100); color: var(--sage-700); }
    .tone-blush { background: var(--blush-100); color: var(--blush-800); }
    .tone-trust { background: var(--trust-100); color: var(--trust-700); }
    .tone-gold { background: var(--gold-100); color: var(--gold-700); }
    .team-card h3 { font-size: 1.08rem; margin-bottom: 0.35rem; }
    .team-card p { font-size: 0.87rem; color: var(--text-secondary); line-height: 1.55; }
    .team-cta { text-align: center; margin-top: 2.25rem; }

    /* ---------- Trust ---------- */
    .trust { background: radial-gradient(circle at 15% 20%, #275448 0%, var(--solid-sage-900) 60%); color: #e3efe8; border-radius: 40px; margin: 0 1.25rem; }
    .trust h2 { color: #fff; }
    .trust-grid { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 3.5rem; align-items: center; }
    .trust-copy > p { color: #c4d9cd; font-size: 1.05rem; margin-bottom: 2rem; }
    .trust-list { list-style: none; display: flex; flex-direction: column; gap: 1.25rem; }
    .trust-list li { display: flex; gap: 1rem; align-items: flex-start; }
    .trust-list mat-icon { flex-shrink: 0; color: var(--solid-sage-200); background: rgba(255,255,255,0.08); border-radius: var(--radius-md); padding: 0.55rem; box-sizing: content-box; }
    .trust-list strong { display: block; color: #fff; margin-bottom: 0.15rem; }
    .trust-list span { font-size: 0.9rem; color: #b6cdbf; }
    .honesty { border-radius: var(--radius-xl); padding: 2rem; }
    .honesty h3 { color: #fff; font-size: 1.25rem; margin-bottom: 1.4rem; }
    .honesty-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .honesty-head { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.78rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.75rem; }
    .honesty-head.is { color: var(--solid-sage-200); }
    .honesty-head.isnt { color: var(--solid-blush-200); }
    .honesty ul { list-style: none; display: flex; flex-direction: column; gap: 0.6rem; }
    .honesty li { font-size: 0.86rem; line-height: 1.5; color: #d5e5db; padding-left: 0.9rem; position: relative; }
    .honesty li::before { content: ''; position: absolute; left: 0; top: 0.55rem; width: 5px; height: 5px; border-radius: 50%; background: rgba(255,255,255,0.4); }

    /* ---------- Plans teaser ---------- */
    .plans-card { display: flex; align-items: center; justify-content: space-between; gap: 2rem; padding: 2.5rem 3rem; border-radius: var(--radius-xl); flex-wrap: wrap; }
    .plans-card h2 { margin-bottom: 0.6rem; }
    .plans-card p { color: var(--text-secondary); max-width: 560px; }

    /* ---------- FAQ ---------- */
    .faq { padding-top: 2rem; }
    .faq-grid { display: grid; grid-template-columns: 0.75fr 1.25fr; gap: 3.5rem; align-items: start; }
    .faq-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .faq-item { border-radius: var(--radius-md); background: var(--bg-glass-strong); border: 1px solid var(--border-light); transition: box-shadow var(--transition-smooth), border-color var(--transition-smooth); }
    .faq-item[open] { box-shadow: var(--shadow-sm); border-color: var(--sage-200); }
    .faq-item summary { list-style: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 1.1rem 1.3rem; font-weight: 600; color: var(--sage-900); }
    .faq-item summary::-webkit-details-marker { display: none; }
    .faq-chevron { color: var(--text-muted); transition: transform var(--transition-smooth); flex-shrink: 0; }
    .faq-item[open] .faq-chevron { transform: rotate(180deg); }
    .faq-item p { padding: 0 1.3rem 1.2rem; color: var(--text-secondary); font-size: 0.93rem; line-height: 1.65; animation: fadeUp 0.35s cubic-bezier(0.16, 1, 0.3, 1); }

    /* ---------- Final CTA ---------- */
    .final-cta { padding-top: 1rem; }
    .final-card { text-align: center; padding: 4rem 2rem; border-radius: 40px; color: #fff; background:
        radial-gradient(circle at 85% 15%, rgba(207, 137, 114, 0.45) 0%, transparent 45%),
        radial-gradient(circle at 10% 90%, rgba(92, 130, 163, 0.45) 0%, transparent 45%),
        var(--solid-sage-800); box-shadow: var(--shadow-xl); }
    .final-card h2 { color: #fff; max-width: 680px; margin: 0 auto 0.85rem; }
    .final-card p { color: #d2e3d9; margin-bottom: 2rem; font-size: 1.05rem; }

    /* ---------- Responsive ---------- */
    @media (max-width: 992px) {
      section { padding: 4rem 0; }
      .hero-grid, .how-grid, .trust-grid, .faq-grid { grid-template-columns: 1fr; gap: 2.5rem; }
      .hero-visual { min-height: 440px; max-width: 460px; margin: 0 auto; width: 100%; }
      .stage-track { grid-template-columns: repeat(2, 1fr); row-gap: 2.5rem; }
      .stage-track::before { display: none; }
      .team-grid { grid-template-columns: repeat(2, 1fr); }
      .trust { margin: 0 0.75rem; border-radius: 28px; }
      .plans-card { padding: 2rem; }
    }
    @media (max-width: 600px) {
      .hero { padding-top: 2.5rem; }
      .team-grid, .stage-track { grid-template-columns: 1fr; }
      .honesty-cols { grid-template-columns: 1fr; }
      .chip-verified { left: -4px; }
      .chip-share { right: -4px; }
      .final-card { padding: 3rem 1.25rem; border-radius: 28px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .float-slow, .float-mid, .float-fast { animation: none; }
      .preview-card.float-slow { transform: translateX(-50%); }
      .ring-fill { animation: none; stroke-dashoffset: 133; }
    }
  `]
})
export class HomeComponent implements OnInit {
  api = inject(ApiService);
  private commerce = inject(CommerceService);
  onboarding = inject(OnboardingService);

  private plans = signal<Plan[]>([]);
  lowestPrice = computed(() => {
    const prices = this.plans().map(p => p.oneTimePrice);
    return prices.length ? Math.min(...prices) : null;
  });

  readonly stages = [
    { icon: 'pregnant_woman', title: 'Pregnancy', text: 'Stage-aware check-ups, nutrition and wellbeing from your first trimester.' },
    { icon: 'local_hospital', title: 'Delivery', text: 'Birth planning and preparation with your care team, close to the day.' },
    { icon: 'favorite', title: 'Postpartum', text: 'Recovery, feeding support and your own wellbeing after birth.' },
    { icon: 'child_care', title: 'Early childhood', text: 'Check-ups and vaccination tracking for your child, up to age seven.' }
  ];

  readonly steps = [
    { title: 'Create your account', text: 'Sign in with Google, email or your phone number, then review and accept our terms and privacy notice.' },
    { title: 'Tell us about you', text: 'A short set of questions about your stage, due date and the support you want. We use it to suggest the plan that fits you best.' },
    { title: 'Meet your care team', text: 'Choose your plan, talk to your care coordinator on a short onboarding call, sign your documents — then book sessions with verified professionals.' }
  ];

  readonly team = [
    { icon: 'stethoscope', tone: 'sage', title: 'Gynecologists', text: 'Routine pregnancy check-ups, pre-delivery planning and postnatal care.' },
    { icon: 'restaurant', tone: 'gold', title: 'Nutritionists', text: 'Trimester-specific nutrition planning that fits how you actually eat.' },
    { icon: 'water_drop', tone: 'blush', title: 'Lactation consultants', text: 'Preparation before birth and feeding support after.' },
    { icon: 'child_care', tone: 'trust', title: 'Pediatricians', text: 'Newborn and early-childhood check-ups as your baby grows.' },
    { icon: 'self_improvement', tone: 'sage', title: 'Postpartum physiotherapists', text: 'Gentle, guided recovery for your body after delivery.' },
    { icon: 'psychology', tone: 'blush', title: 'Clinical psychologists', text: 'Support for your emotional wellbeing — always optional, never required.' }
  ];

  readonly faqs = [
    { q: 'Does NartureBelle replace my own doctor?', a: 'No. NartureBelle helps you find and coordinate care with verified professionals, but it isn’t a replacement for your own doctor’s or obstetrician’s clinical advice, and it isn’t a diagnostic service.' },
    { q: 'What should I do in an emergency?', a: 'NartureBelle is not emergency care. In a medical emergency, contact your local emergency services or go to the nearest hospital immediately.' },
    { q: 'Can I join late in pregnancy, or after my baby is born?', a: 'Yes. You can start at any stage — pregnancy, delivery, postpartum or early childhood. Your timeline begins from where you are and never marks earlier stages as missed.' },
    { q: 'What happens after I sign up?', a: 'You’ll answer a few questions about your stage and the support you’d like, see a recommended plan, and — once you’ve chosen and paid — schedule a short onboarding call and sign your onboarding documents. Then your full care journey opens up. You can update your details any time.' },
    { q: 'How are professionals verified?', a: 'Every professional’s credentials are reviewed before they can be booked. Only verified, active professionals appear in the directory.' },
    { q: 'Who can see my health records?', a: 'You decide. You can share a record with a specific professional for a set period, revoke access whenever you like, and see a history of who has viewed it.' }
  ];

  ngOnInit() {
    this.commerce.getPlans().subscribe({
      next: plans => this.plans.set(plans),
      error: () => { /* teaser simply omits the "from" price */ }
    });
  }
}
