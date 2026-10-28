import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

/**
 * Placeholder for the Phase 1 "My Journey" dashboard (roadmap §Phase 1, brief §1.3).
 * Real content needs GET /me/dashboard, which the API hasn't shipped yet — this shows
 * an honest "not available yet" state instead of guessing at a response shape.
 * Replace with the real dashboard once NB-Ecomm-API/UI_INTEGRATION_GUIDE.md publishes
 * the Phase 0/1 contract (GET /me/dashboard, POST/GET/PATCH /me/journeys, consent endpoints).
 */
@Component({
  selector: 'app-journey',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="journey-page">
      <div class="journey-card card glass">
        <span class="icon">🌱</span>
        <h1>My Journey</h1>
        <p class="lead">
          Hi {{ firstName() }}, this is where your personalised, stage-aware care timeline will live —
          what's next for you and your baby, from pregnancy through early childcare.
        </p>
        <p class="status">This is coming soon. We're still building it.</p>
        <a routerLink="/profile" class="btn btn-outline">Go to Profile &amp; Privacy</a>
      </div>
    </div>
  `,
  styles: [`
    .journey-page {
      min-height: calc(100vh - 160px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem 1rem;
    }
    .journey-card {
      max-width: 480px;
      width: 100%;
      padding: 2.5rem;
      text-align: center;
      border-radius: var(--radius-xl);
      background: #fff;
      box-shadow: 0 20px 45px rgba(27, 51, 39, 0.08);
      border: 1px solid var(--border-light);
    }
    .icon { font-size: 2.5rem; display: block; margin-bottom: 0.75rem; }
    h1 { font-size: 1.5rem; color: var(--primary-deep); margin-bottom: 0.75rem; }
    .lead { font-size: 0.92rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1rem; }
    .status { font-size: 0.85rem; color: var(--text-muted); font-style: italic; margin-bottom: 1.5rem; }
  `]
})
export class JourneyComponent {
  api = inject(ApiService);

  firstName(): string {
    const user = this.api.currentUser();
    return user?.firstName || user?.name?.split(' ')[0] || 'there';
  }
}
