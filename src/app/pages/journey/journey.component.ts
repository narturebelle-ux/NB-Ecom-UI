import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CareRecommendationsComponent } from '../../components/care-recommendations/care-recommendations.component';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { CommerceService } from '../../services/commerce.service';
import { ProviderService } from '../../services/provider.service';
import { OnboardingService } from '../../services/onboarding.service';
import { FeatureToggleService } from '../../services/feature-toggle.service';
import { RevealDirective } from '../../directives/reveal.directive';
import {
  Journey,
  JourneyStatus,
  JOURNEY_STATUS_LABELS,
  NextAction,
  PROFESSIONAL_TYPE_LABELS
} from '../../models/maternal.models';
import { Entitlement, planDisplayName } from '../../models/commerce.models';
import { Booking, providerInitials } from '../../models/provider.models';

const ALL_STATUSES: JourneyStatus[] = ['PREGNANCY', 'PRE_DELIVERY', 'DELIVERY_COMPLETED', 'POSTPARTUM', 'CHILDCARE_0_7'];

/** Short labels for the stage track; full labels still come from JOURNEY_STATUS_LABELS. */
const TRACK_LABELS: Record<JourneyStatus, string> = {
  PREGNANCY: 'Pregnancy',
  PRE_DELIVERY: 'Pre-delivery',
  DELIVERY_COMPLETED: 'Delivery',
  POSTPARTUM: 'Postpartum',
  CHILDCARE_0_7: 'Childcare'
} as Record<JourneyStatus, string>;

interface QuickAction { icon: string; title: string; text: string; link: string; feature?: 'careBooking' | 'recordsVault' | 'childTracker' | 'joyCircle' | 'productRecommendations'; }

/**
 * My Journey — the signed-in home. Built from GET /me/dashboard (journey + next actions),
 * GET /entitlements (plan wallet), GET /bookings (upcoming sessions) and the onboarding call.
 */
@Component({
  selector: 'app-journey',
  standalone: true,
  imports: [MatIconModule, CommonModule, RouterLink, FormsModule, RevealDirective, CareRecommendationsComponent],
  template: `
    <div class="journey-page">
      <div class="container wide">

        <!-- Greeting -->
        <header class="greet animate-in">
          <div>
            <span class="kicker">{{ today | date:'EEEE, d MMMM' }}</span>
            <h1>{{ greeting() }}, {{ firstName() }}</h1>
            <p class="subtitle">Here’s your care at a glance.</p>
          </div>
          @if (features.isEnabled('careBooking')) {
            <a routerLink="/care" class="btn btn-primary"><mat-icon class="icon-sm">calendar_add_on</mat-icon> Book a session</a>
          }
        </header>

        @if (loading()) {
          <div class="grid">
            <div class="skeleton" style="height: 230px; border-radius: var(--radius-xl)"></div>
            <div class="skeleton" style="height: 230px; border-radius: var(--radius-xl)"></div>
          </div>
        } @else if (errorMsg()) {
          <div class="status-banner is-error">{{ errorMsg() }} <button class="btn-link" (click)="loadDashboard()">Try again</button></div>
        } @else if ((journeySetupRequired() && !settingUp()) && !editing()) {
          <div class="panel glass setup-card">
            <mat-icon class="hero-icon">eco</mat-icon>
            <h2>Set up your journey</h2>
            <p>Tell us where you are so we can tailor your timeline. You can change this anytime.</p>
            <button class="btn btn-primary" (click)="settingUp.set(true)">Set up my journey</button>
          </div>
        } @else if (settingUp() || editing()) {
          <div class="panel glass form-card">
            <h2>{{ editing() ? 'Update your journey' : 'Set up your journey' }}</h2>
            <div class="form-group">
              <label class="form-label" for="stage">Current stage</label>
              <select id="stage" class="form-control" [(ngModel)]="formStatus">
                @for (s of statuses; track s) { <option [ngValue]="s">{{ statusLabel(s) }}</option> }
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="edd">Expected delivery date (optional)</label>
              <input id="edd" type="date" class="form-control" [(ngModel)]="formEdd" />
              <span class="field-hint">Only relevant during pregnancy. Leave blank if not applicable.</span>
            </div>
            @if (formError()) { <div class="status-banner is-error">{{ formError() }}</div> }
            <div class="form-actions">
              <button class="btn btn-primary" [disabled]="saving()" (click)="save()">
                {{ saving() ? 'Saving…' : (editing() ? 'Save changes' : 'Start my journey') }}
              </button>
              @if (editing()) { <button class="btn btn-outline" [disabled]="saving()" (click)="cancelEdit()">Cancel</button> }
            </div>
          </div>
        } @else if (activeJourney(); as journey) {

          <!-- Hero: where you are -->
          <section class="hero-card animate-in">
            <div class="hero-main">
              <div class="badges">
                <span class="badge-pill sage">{{ statusLabel(journey.status) }}</span>
                @if (journey.trimester) { <span class="badge-pill blush">Trimester {{ journey.trimester }}</span> }
              </div>
              <h2>{{ journey.gestationalWeek ? 'Week ' + journey.gestationalWeek : statusLabel(journey.status) }}</h2>
              @if (journey.expectedDeliveryDate) {
                <p class="edd"><mat-icon class="icon-sm">event</mat-icon> Expected delivery <strong>{{ journey.expectedDeliveryDate | date:'d MMM y' }}</strong>
                  @if (daysToGo() !== null && daysToGo()! > 0) { <span class="dot">·</span> {{ daysToGo() }} days to go }
                </p>
              }

              <ol class="track" aria-label="Your care stages">
                @for (s of statuses; track s; let i = $index) {
                  <li [class.done]="i < stageIndex()" [class.current]="i === stageIndex()">
                    <span class="node">@if (i < stageIndex()) { <mat-icon>check</mat-icon> }</span>
                    <span class="lbl">{{ trackLabel(s) }}</span>
                  </li>
                }
              </ol>

              <button class="btn-link light" (click)="startEdit(journey)"><mat-icon class="icon-sm">edit</mat-icon> Update stage or due date</button>
            </div>

            @if (journey.gestationalWeek) {
              <div class="ring" role="img" [attr.aria-label]="'Week ' + journey.gestationalWeek + ' of 40'">
                <svg viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" class="ring-bg" />
                  <circle cx="60" cy="60" r="52" class="ring-fg" [attr.stroke-dasharray]="ringDash(journey.gestationalWeek)" />
                </svg>
                <div class="ring-text"><strong>{{ journey.gestationalWeek }}</strong><span>of 40 weeks</span></div>
              </div>
            }
          </section>

          <!-- Quick actions -->
          <section class="quick">
            @for (a of quickActions(); track a.link; let i = $index) {
              <a class="quick-tile glass-soft" [routerLink]="a.link" appReveal [revealDelay]="i * 60">
                <mat-icon class="q-icon">{{ a.icon }}</mat-icon>
                <span><strong>{{ a.title }}</strong><small>{{ a.text }}</small></span>
                <mat-icon class="q-arrow">arrow_forward</mat-icon>
              </a>
            }
          </section>

          <div class="grid">
            <!-- Left column -->
            <div class="col">
              <!-- Upcoming sessions -->
              <section class="panel glass" appReveal>
                <div class="panel-head">
                  <h3><mat-icon>event_available</mat-icon> Upcoming sessions</h3>
                  @if (features.isEnabled('careBooking')) { <a routerLink="/care/bookings" class="see-all">All bookings</a> }
                </div>
                @if (upcoming().length) {
                  <ul class="sessions">
                    @for (b of upcoming(); track b.id) {
                      <li>
                        <div class="date-chip"><span>{{ b.scheduledStart | date:'MMM' }}</span><strong>{{ b.scheduledStart | date:'d' }}</strong></div>
                        <div class="s-body">
                          <strong>{{ providerName(b.providerId) }}</strong>
                          <span>{{ professionalLabel(b.professionalType) }} · {{ b.scheduledStart | date:'EEE, h:mm a' }}</span>
                        </div>
                        <span class="avatar">{{ initials(providerName(b.providerId)) }}</span>
                      </li>
                    }
                  </ul>
                } @else {
                  <div class="empty">
                    <mat-icon>calendar_month</mat-icon>
                    <div>
                      <strong>No sessions booked yet</strong>
                      <p>
                        @if (sessionsLeft() > 0) { You have {{ sessionsLeft() }} sessions in your plan, ready when you are. }
                        @else { Choose a plan to start booking sessions with verified professionals. }
                      </p>
                    </div>
                    @if (features.isEnabled('careBooking') && sessionsLeft() > 0) {
                      <a routerLink="/care" class="btn btn-outline btn-sm">Find a professional</a>
                    } @else if (sessionsLeft() === 0) {
                      <a routerLink="/plans" class="btn btn-outline btn-sm">See plans</a>
                    }
                  </div>
                }
              </section>

              <!-- Care timeline -->
              <section class="panel glass" appReveal>
                <div class="panel-head">
                  <h3><mat-icon>route</mat-icon> Your care timeline</h3>
                  <span class="muted-tag">{{ statusLabel(journey.status) }}</span>
                </div>
                @if (nextActions().length === 0) {
                  <div class="empty">
                    <mat-icon>spa</mat-icon>
                    <div><strong>You’re up to date</strong><p>Nothing is due at this stage. We’ll add steps here as your journey moves on.</p></div>
                  </div>
                } @else {
                  <ol class="timeline">
                    @for (action of nextActions(); track action.title) {
                      <li [class.optional]="action.optional">
                        <span class="t-dot"><mat-icon>{{ action.optional ? 'lightbulb' : 'check_circle' }}</mat-icon></span>
                        <div>
                          <div class="t-head">
                            <strong>{{ action.title }}</strong>
                            @if (action.optional) { <span class="optional-badge">Optional</span> }
                          </div>
                          <p>{{ action.description }}</p>
                          <span class="professional-tag">{{ professionalLabel(action.professionalType) }}</span>
                        </div>
                      </li>
                    }
                  </ol>
                }
                <p class="clinical-disclaimer"><mat-icon class="icon-sm">info</mat-icon> This guidance is pending clinical review and isn’t medical advice. Always confirm with your own doctor.</p>
              </section>
            </div>

            <!-- Right column -->
            <aside class="col">
              <!-- Care plan -->
              <section class="panel glass" appReveal>
                <div class="panel-head">
                  <h3><mat-icon>workspace_premium</mat-icon> My care plan</h3>
                </div>
                @if (activeEntitlements().length === 0) {
                  <div class="empty column">
                    <p>No active care plan yet.</p>
                    <a routerLink="/plans" class="btn btn-primary btn-sm">Choose a plan</a>
                  </div>
                } @else {
                  <div class="plan-sum">
                    <div><strong>{{ planName(activeEntitlements()[0].planCode) }}</strong><span>Valid until {{ activeEntitlements()[0].expiresAt | date:'d MMM y' }}</span></div>
                    <div class="big"><strong>{{ sessionsLeft() }}</strong><span>sessions left</span></div>
                  </div>
                  <div class="wallet-list">
                    @for (e of activeEntitlements(); track e.id) {
                      <div class="wallet-row">
                        <div class="wallet-head">
                          <span>{{ professionalLabel(e.professionalType) }}</span>
                          <small>{{ e.remainingSessions }}/{{ e.totalSessions }}</small>
                        </div>
                        <div class="wallet-bar"><div class="wallet-bar-fill" [style.width.%]="(e.remainingSessions / e.totalSessions) * 100"></div></div>
                      </div>
                    }
                  </div>
                }
              </section>

              <!-- Products recommended by her professionals after completed sessions -->
              <app-care-recommendations />

              <!-- Onboarding call -->
              @if (ob.state().call || ob.state().callRequested) {
                <section class="panel glass call-card" appReveal>
                  <mat-icon class="call-icon">support_agent</mat-icon>
                  <div>
                    <strong>Your care coordinator{{ ob.state().call?.coordinator ? ': ' + ob.state().call!.coordinator!.displayName : '' }}</strong>
                    @if (ob.state().call; as call) {
                      <p>Onboarding call {{ isPast(call.startsAt) ? 'was on' : 'on' }} <b>{{ call.startsAt | date:'EEE d MMM, h:mm a' }}</b>.@if (call.coordinator?.languages?.length) { Speaks {{ call.coordinator!.languages.join(', ') }}. }</p>
                    } @else {
                      <p>They’ll call you to arrange your onboarding call. You don’t need to do anything.</p>
                    }
                  </div>
                </section>
              }

              <!-- Trust / safety -->
              <section class="panel trust-card" appReveal>
                <h3><mat-icon>verified_user</mat-icon> You’re in safe hands</h3>
                <ul>
                  <li><mat-icon class="icon-sm">badge</mat-icon> Every professional is verified before they can see you</li>
                  <li><mat-icon class="icon-sm">lock</mat-icon> Your records stay private. You choose who sees them, and for how long</li>
                  <li><mat-icon class="icon-sm">history</mat-icon> You can see every time a record is opened</li>
                </ul>
                <p class="emergency"><mat-icon class="icon-sm">emergency</mat-icon> In an emergency, call your local emergency services or go to the nearest hospital.</p>
              </section>
            </aside>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .journey-page { padding: 2.5rem 0 4.5rem; min-height: calc(100vh - 160px); }
    .wide { max-width: 1160px; }

    .greet { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.75rem; }
    .kicker { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--sage-600); }
    .greet h1 { font-size: clamp(1.7rem, 3vw, 2.3rem); color: var(--sage-900); margin: 0.2rem 0; }
    .subtitle { color: var(--text-secondary); margin: 0; }

    /* Hero */
    .hero-card {
      position: relative; overflow: hidden; display: flex; justify-content: space-between; align-items: center; gap: 2rem;
      padding: 2.25rem 2.5rem; border-radius: var(--radius-xl); color: #fff; margin-bottom: 1.25rem;
      background: radial-gradient(circle at 85% 20%, rgba(255,255,255,0.14), transparent 45%),
                  linear-gradient(135deg, var(--sage-700), var(--sage-900));
      box-shadow: var(--shadow-lg);
    }
    .hero-card::after { content: ''; position: absolute; right: -80px; bottom: -120px; width: 320px; height: 320px; border-radius: 50%; background: rgba(250, 234, 225, 0.08); }
    .hero-main { flex: 1; min-width: 0; position: relative; z-index: 1; }
    .badges { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
    .badge-pill { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 0.3rem 0.75rem; border-radius: var(--radius-full); }
    .badge-pill.sage { background: rgba(255,255,255,0.16); color: #fff; }
    .badge-pill.blush { background: var(--blush-100); color: var(--blush-800); }
    .hero-card h2 { font-size: clamp(2rem, 4vw, 2.8rem); margin: 0 0 0.35rem; color: #fff; }
    .edd { display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; color: rgba(255,255,255,0.85); margin: 0 0 1.5rem; }
    .edd strong { color: #fff; }
    .dot { opacity: 0.6; }

    .track { list-style: none; display: flex; padding: 0; margin: 0 0 1.25rem; max-width: 560px; }
    .track li { flex: 1; position: relative; display: flex; flex-direction: column; align-items: center; gap: 0.45rem; text-align: center; }
    .track li::before { content: ''; position: absolute; top: 10px; left: -50%; width: 100%; height: 2px; background: rgba(255,255,255,0.22); }
    .track li:first-child::before { display: none; }
    .track li.done::before, .track li.current::before { background: var(--blush-200); }
    .node { position: relative; z-index: 1; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; background: var(--sage-800); border: 2px solid rgba(255,255,255,0.35); }
    .node mat-icon { font-size: 14px; width: 14px; height: 14px; color: var(--sage-900); }
    .track li.done .node { background: var(--blush-200); border-color: var(--blush-200); }
    .track li.current .node { background: #fff; border-color: #fff; box-shadow: 0 0 0 5px rgba(255,255,255,0.18); }
    .lbl { font-size: 0.72rem; color: rgba(255,255,255,0.7); }
    .track li.current .lbl { color: #fff; font-weight: 700; }

    .btn-link.light { color: rgba(255,255,255,0.9); }
    .btn-link.light:hover { color: #fff; }

    .ring { position: relative; width: 170px; height: 170px; flex-shrink: 0; z-index: 1; }
    .ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
    .ring-bg { fill: none; stroke: rgba(255,255,255,0.15); stroke-width: 10; }
    .ring-fg { fill: none; stroke: var(--blush-200); stroke-width: 10; stroke-linecap: round; transition: stroke-dasharray 1s ease; }
    .ring-text { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .ring-text strong { font-family: var(--font-serif); font-size: 2.6rem; line-height: 1; }
    .ring-text span { font-size: 0.75rem; opacity: 0.8; margin-top: 0.25rem; }

    /* Quick actions */
    .quick { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0.9rem; margin-bottom: 1.25rem; }
    .quick-tile { display: flex; align-items: center; gap: 0.85rem; padding: 1rem 1.1rem; border-radius: var(--radius-lg); text-decoration: none; color: inherit; transition: transform 0.2s, box-shadow 0.2s; }
    .quick-tile:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
    .q-icon { width: 42px; height: 42px; font-size: 22px; flex-shrink: 0; border-radius: 12px; display: grid; place-items: center; background: var(--sage-100); color: var(--sage-700); }
    .quick-tile span { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .quick-tile strong { color: var(--sage-900); font-size: 0.92rem; }
    .quick-tile small { color: var(--text-muted); font-size: 0.76rem; }
    .q-arrow { font-size: 18px; width: 18px; height: 18px; color: var(--sage-500); transition: transform 0.2s; }
    .quick-tile:hover .q-arrow { transform: translateX(3px); }

    /* Grid */
    .grid { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(0, 1fr); gap: 1.25rem; align-items: start; }
    .col { display: flex; flex-direction: column; gap: 1.25rem; }
    @media (max-width: 900px) {
      .grid { grid-template-columns: 1fr; }
      .hero-card { flex-direction: column-reverse; align-items: flex-start; padding: 1.75rem; }
      .ring { width: 130px; height: 130px; }
    }

    .panel { border-radius: var(--radius-xl); padding: 1.5rem 1.6rem; }
    .panel-head { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
    .panel h3 { display: flex; align-items: center; gap: 0.5rem; font-size: 1.08rem; color: var(--sage-900); margin: 0; }
    .panel h3 mat-icon { color: var(--sage-600); font-size: 22px; width: 22px; height: 22px; }
    .see-all { font-size: 0.82rem; font-weight: 700; color: var(--sage-700); }
    .muted-tag { font-size: 0.72rem; font-weight: 700; color: var(--text-muted); background: var(--sage-50); padding: 0.2rem 0.6rem; border-radius: var(--radius-full); }

    .empty { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.1rem; border-radius: var(--radius-md); background: var(--sage-50); border: 1px dashed var(--sage-200); flex-wrap: wrap; }
    .empty > mat-icon { color: var(--sage-500); font-size: 28px; width: 28px; height: 28px; }
    .empty > div { flex: 1; min-width: 180px; }
    .empty strong { color: var(--sage-900); font-size: 0.92rem; }
    .empty p { margin: 0.15rem 0 0; font-size: 0.83rem; color: var(--text-secondary); }
    .empty.column { flex-direction: column; align-items: flex-start; }

    .sessions { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.6rem; }
    .sessions li { display: flex; align-items: center; gap: 0.9rem; padding: 0.75rem; border-radius: var(--radius-md); background: #fff; border: 1px solid var(--border-light); }
    .date-chip { width: 50px; text-align: center; border-radius: 12px; background: var(--blush-50); color: var(--blush-800); padding: 0.35rem 0; }
    .date-chip span { display: block; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; }
    .date-chip strong { font-size: 1.2rem; }
    .s-body { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .s-body strong { color: var(--sage-900); font-size: 0.92rem; }
    .s-body span { font-size: 0.8rem; color: var(--text-muted); }
    .avatar { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: var(--sage-100); color: var(--sage-800); font-weight: 700; font-size: 0.78rem; }

    .timeline { list-style: none; padding: 0; margin: 0 0 1rem; }
    .timeline li { display: flex; gap: 0.85rem; position: relative; padding-bottom: 1.1rem; }
    .timeline li:not(:last-child)::before { content: ''; position: absolute; left: 13px; top: 30px; bottom: 0; width: 2px; background: var(--sage-100); }
    .t-dot { width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0; display: grid; place-items: center; background: var(--sage-100); }
    .t-dot mat-icon { font-size: 16px; width: 16px; height: 16px; color: var(--sage-700); }
    .timeline li.optional .t-dot { background: var(--blush-50); }
    .timeline li.optional .t-dot mat-icon { color: var(--blush-700); }
    .t-head { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .t-head strong { font-size: 0.93rem; color: var(--sage-900); }
    .timeline p { font-size: 0.84rem; color: var(--text-secondary); margin: 0.2rem 0 0.35rem; line-height: 1.5; }
    .optional-badge { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); background: var(--sage-50); padding: 0.12rem 0.5rem; border-radius: var(--radius-full); }
    .professional-tag { font-size: 0.7rem; font-weight: 700; color: var(--blush-700); text-transform: uppercase; letter-spacing: 0.03em; }
    .clinical-disclaimer { display: flex; gap: 0.4rem; align-items: flex-start; font-size: 0.76rem; color: #92610a; background: #fff8eb; border: 1px solid #fbd38d; border-radius: var(--radius-md); padding: 0.55rem 0.8rem; margin: 0; }

    .plan-sum { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.9rem 1rem; border-radius: var(--radius-md); background: linear-gradient(135deg, var(--sage-50), var(--blush-50)); margin-bottom: 1.1rem; }
    .plan-sum div { display: flex; flex-direction: column; }
    .plan-sum strong { color: var(--sage-900); }
    .plan-sum span { font-size: 0.76rem; color: var(--text-muted); }
    .plan-sum .big { align-items: flex-end; }
    .plan-sum .big strong { font-family: var(--font-serif); font-size: 1.9rem; line-height: 1; }
    .wallet-list { display: flex; flex-direction: column; gap: 0.85rem; }
    .wallet-head { display: flex; justify-content: space-between; font-size: 0.84rem; color: var(--sage-900); margin-bottom: 0.3rem; }
    .wallet-head small { color: var(--text-muted); font-weight: 600; }
    .wallet-bar { height: 7px; border-radius: var(--radius-full); background: var(--sage-50); overflow: hidden; }
    .wallet-bar-fill { height: 100%; background: linear-gradient(90deg, var(--sage-500), var(--sage-700)); border-radius: var(--radius-full); transition: width 0.6s ease; }

    .call-card { display: flex; gap: 0.9rem; align-items: flex-start; }
    .call-icon { width: 44px; height: 44px; font-size: 24px; flex-shrink: 0; border-radius: 50%; display: grid; place-items: center; background: var(--blush-100); color: var(--blush-800); }
    .call-card strong { color: var(--sage-900); }
    .call-card p { margin: 0.2rem 0 0; font-size: 0.85rem; color: var(--text-secondary); }

    .trust-card { background: linear-gradient(160deg, var(--trust-50), #fff); border: 1px solid var(--trust-100); }
    .trust-card h3 { margin-bottom: 0.85rem; color: var(--trust-900); }
    .trust-card h3 mat-icon { color: var(--trust-700); }
    .trust-card ul { list-style: none; padding: 0; margin: 0 0 1rem; display: flex; flex-direction: column; gap: 0.6rem; }
    .trust-card li { display: flex; gap: 0.5rem; font-size: 0.84rem; color: var(--trust-900); line-height: 1.45; }
    .trust-card li mat-icon { color: var(--trust-500); flex-shrink: 0; margin-top: 1px; }
    .emergency { display: flex; gap: 0.45rem; font-size: 0.78rem; color: var(--text-secondary); margin: 0; padding-top: 0.85rem; border-top: 1px solid var(--trust-100); }
    .emergency mat-icon { color: var(--blush-700); flex-shrink: 0; }

    .setup-card { padding: 2.5rem; text-align: center; max-width: 560px; margin: 0 auto; }
    .setup-card h2 { font-size: 1.3rem; color: var(--sage-900); margin-bottom: 0.5rem; }
    .setup-card p { color: var(--text-secondary); margin-bottom: 1.5rem; }
    .form-card { padding: 2rem; max-width: 560px; margin: 0 auto; }
    .form-card h2 { font-size: 1.2rem; color: var(--sage-900); margin-bottom: 1.25rem; }
    .form-group { margin-bottom: 1.1rem; }
    .form-label { display: block; font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.35rem; }
    .field-hint { display: block; margin-top: 0.3rem; font-size: 0.78rem; color: var(--text-muted); }
    .form-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }

    .status-banner { padding: 0.75rem 1rem; border-radius: 10px; margin-bottom: 1.25rem; font-size: 0.85rem; font-weight: 600; }
    .status-banner.is-error { background: #fdecea; color: #a0281c; border: 1px solid #f5b7b1; }
  `]
})
export class JourneyComponent implements OnInit {
  api = inject(ApiService);
  ob = inject(OnboardingService);
  features = inject(FeatureToggleService);
  private commerce = inject(CommerceService);
  private providers = inject(ProviderService);

  statuses = ALL_STATUSES;
  today = new Date();

  loading = signal(true);
  errorMsg = signal<string | null>(null);
  journeySetupRequired = signal(true);
  activeJourney = signal<Journey | null>(null);
  nextActions = signal<NextAction[]>([]);
  bookings = signal<Booking[]>([]);
  private providerNames = signal(new Map<number, string>());

  settingUp = signal(false);
  editing = signal(false);
  saving = signal(false);
  formError = signal<string | null>(null);
  formStatus: JourneyStatus = 'PREGNANCY';
  formEdd = '';

  activeEntitlements = computed(() => this.commerce.entitlements().filter((e: Entitlement) => !this.commerce.isExpired(e)));
  sessionsLeft = computed(() => this.activeEntitlements().reduce((n, e) => n + e.remainingSessions, 0));

  upcoming = computed(() =>
    this.bookings()
      .filter(b => b.status === 'BOOKED' && new Date(b.scheduledStart).getTime() > Date.now())
      .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart))
      .slice(0, 3)
  );

  stageIndex = computed(() => {
    const j = this.activeJourney();
    return j ? this.statuses.indexOf(j.status) : -1;
  });

  daysToGo = computed(() => {
    const edd = this.activeJourney()?.expectedDeliveryDate;
    if (!edd) return null;
    return Math.ceil((new Date(edd + 'T00:00:00').getTime() - Date.now()) / 86_400_000);
  });

  quickActions = computed<QuickAction[]>(() =>
    ([
      { icon: 'medical_services', title: 'Find a professional', text: 'Verified doctors & specialists', link: '/care', feature: 'careBooking' },
      { icon: 'event_note', title: 'My bookings', text: 'Reschedule or cancel', link: '/care/bookings', feature: 'careBooking' },
      { icon: 'folder_shared', title: 'Records vault', text: 'Upload & share securely', link: '/records', feature: 'recordsVault' },
      { icon: 'child_care', title: 'Child & vaccines', text: 'Track your baby’s care', link: '/child', feature: 'childTracker' },
      { icon: 'diversity_3', title: 'Joy Circle', text: 'Meet other parents', link: '/joy-circle', feature: 'joyCircle' },
      { icon: 'shopping_bag', title: 'For you', text: 'Products for your stage', link: '/recommendations', feature: 'productRecommendations' },
      { icon: 'checklist', title: 'Checkup checklist', text: 'Scans & tests by stage', link: '/checklists' },
      { icon: 'manage_accounts', title: 'Profile & privacy', text: 'Your details & consents', link: '/profile' }
    ] as QuickAction[]).filter(a => !a.feature || this.features.isEnabled(a.feature)).slice(0, 4)
  );

  greeting(): string {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }

  firstName(): string {
    const user = this.api.currentUser();
    return user?.firstName || user?.name?.split(' ')[0] || 'there';
  }

  statusLabel(status: JourneyStatus): string { return JOURNEY_STATUS_LABELS[status]; }
  trackLabel(status: JourneyStatus): string { return TRACK_LABELS[status] ?? JOURNEY_STATUS_LABELS[status]; }
  professionalLabel(type: string): string { return (PROFESSIONAL_TYPE_LABELS as Record<string, string>)[type] || type; }
  planName(code: string): string { return planDisplayName(code); }
  providerName(id: number): string { return this.providerNames().get(id) ?? 'Your care professional'; }
  initials(name: string): string { return providerInitials(name) || 'NB'; }
  isPast(iso: string): boolean { return new Date(iso).getTime() < Date.now(); }

  ringDash(week: number): string {
    const c = 2 * Math.PI * 52;
    const filled = Math.min(1, Math.max(0, week / 40)) * c;
    return `${filled} ${c}`;
  }

  ngOnInit() {
    this.loadDashboard();
    this.commerce.loadEntitlements().subscribe({ error: () => { /* plan card shows "no plan" */ } });
    forkJoin({ bookings: this.providers.getBookings(), providers: this.providers.getProviders() }).subscribe({
      next: ({ bookings, providers }) => {
        this.providerNames.set(new Map(providers.map(p => [p.id, p.displayName])));
        this.bookings.set(bookings);
      },
      error: () => { /* sessions card shows its empty state */ }
    });
  }

  loadDashboard() {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.api.getDashboard().subscribe({
      next: (dashboard) => {
        this.loading.set(false);
        this.journeySetupRequired.set(dashboard.journeySetupRequired);
        this.activeJourney.set(dashboard.journey);
        this.nextActions.set(dashboard.nextActions || []);
      },
      error: (err) => {
        this.loading.set(false);
        // 401/403 (incl. CONSENT_REQUIRED → /auth/consent) are handled by the auth interceptor.
        if (err?.status !== 401 && err?.status !== 403) this.errorMsg.set('Could not load your journey.');
      }
    });
  }

  startEdit(journey: Journey) {
    this.formStatus = journey.status;
    this.formEdd = journey.expectedDeliveryDate || '';
    this.formError.set(null);
    this.editing.set(true);
  }

  cancelEdit() { this.editing.set(false); }

  save() {
    this.saving.set(true);
    this.formError.set(null);
    const edd = this.formEdd || null;
    const active = this.activeJourney();
    const request = active
      ? this.api.updateJourney(active.id, { status: this.formStatus, expectedDeliveryDate: edd })
      : this.api.createJourney(this.formStatus, edd);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.settingUp.set(false);
        this.editing.set(false);
        this.api.showToast(active ? 'Journey updated.' : 'Your journey is set up!');
        this.loadDashboard();
      },
      error: (err) => {
        this.saving.set(false);
        if (err?.status === 409) this.formError.set(err?.error?.message || 'An active journey already exists.');
        else if (err?.status === 400) this.formError.set(err?.error?.message || 'Please check the dates entered.');
        else if (err?.status !== 401 && err?.status !== 403) this.formError.set('Something went wrong. Please try again.');
      }
    });
  }
}
