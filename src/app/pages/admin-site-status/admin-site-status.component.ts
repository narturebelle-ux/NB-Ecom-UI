import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { FeatureToggleService } from '../../services/feature-toggle.service';

/** Admin: turn the maintenance screen on before a release and off once it's checked. */
@Component({
  selector: 'app-admin-site-status',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="admin-page">
      <div class="container narrow">
        <span class="kicker">Admin</span>
        <h1>Maintenance screen</h1>
        <p class="hint">Turn this on a few minutes before a release. Visitors then see “Something beautiful is on the way” instead of the app, and pages already open switch over within a minute. Admins still get in. Turn it off once the release is checked, and every waiting page reloads onto the new version.</p>

        @if (loading()) {
          <p class="hint">Loading…</p>
        } @else if (errorMsg()) {
          <div class="card empty"><p>{{ errorMsg() }}</p></div>
        } @else {
          <div class="card">
            <div class="state" [class.on]="on()">
              <mat-icon>{{ on() ? 'construction' : 'check_circle' }}</mat-icon>
              <strong>{{ on() ? 'On: visitors see the maintenance screen' : 'Off: the app is open to everyone' }}</strong>
            </div>
            <label for="reason">Reason <span class="opt">kept in the audit log</span></label>
            <textarea id="reason" class="form-control" rows="2" maxlength="500" [placeholder]="on() ? 'e.g. Release checked' : 'e.g. Releasing the new booking flow at 6 pm'" [(ngModel)]="reason"></textarea>
            <div class="actions">
              <button class="btn btn-sm" [class.btn-primary]="!on()" [class.btn-outline]="on()" [disabled]="!reason.trim() || busy()" (click)="set(!on())">
                {{ on() ? 'Turn off and reopen the app' : 'Turn on the maintenance screen' }}
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .admin-page { padding: 2.5rem 0 5rem; }
    .narrow { max-width: 860px; }
    .kicker { font-size: 0.78rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trust-700); }
    h1 { font-size: 2rem; color: var(--sage-900); }
    .hint { font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1rem; }
    .card { background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 14px; padding: 1rem 1.2rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .state { display: flex; align-items: center; gap: 0.5rem; color: var(--sage-700); margin-bottom: 0.4rem; }
    .state.on { color: var(--gold-700); }
    label { font-size: 0.82rem; font-weight: 600; color: var(--sage-900); }
    .opt { font-weight: 400; color: var(--text-muted); }
    .actions { display: flex; justify-content: flex-end; }
    .empty { text-align: center; color: var(--text-secondary); }
  `]
})
export class AdminSiteStatusComponent implements OnInit {
  private features = inject(FeatureToggleService);
  private api = inject(ApiService);

  on = signal(false);
  loading = signal(true);
  errorMsg = signal<string | null>(null);
  busy = signal(false);
  reason = '';

  ngOnInit() {
    this.features.current().subscribe({
      next: flags => {
        this.loading.set(false);
        if (flags.maintenanceMode === undefined) this.errorMsg.set('This server doesn’t have the maintenance switch yet. It comes with the Care API’s maintenance-flag update.');
        else this.on.set(flags.maintenanceMode);
      },
      error: () => { this.loading.set(false); this.errorMsg.set('We couldn’t reach the Care API to read the switch.'); }
    });
  }

  set(enabled: boolean) {
    this.busy.set(true);
    this.features.setFlag('maintenanceMode', enabled, this.reason.trim()).subscribe({
      next: () => {
        this.busy.set(false);
        this.on.set(enabled);
        this.reason = '';
        this.api.showToast(enabled ? 'The maintenance screen is on.' : 'The maintenance screen is off. The app is open again.');
      },
      error: err => {
        this.busy.set(false);
        this.api.showToast(err?.status === 403 ? 'Only NartureBelle™ admins can change this.' : err?.status === 404 ? 'This server doesn’t have the maintenance switch yet.' : 'Couldn’t change the switch.');
      }
    });
  }
}
