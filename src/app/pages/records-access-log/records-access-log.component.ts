import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RecordsService } from '../../services/records.service';
import { AccessLogEntry } from '../../models/records.models';

const ACTION_META: Record<string, { icon: string; label: string }> = {
  UPLOAD: { icon: 'upload', label: 'Uploaded' },
  VIEW: { icon: 'visibility', label: 'Viewed' },
  DOWNLOAD: { icon: 'download', label: 'Downloaded' },
  SHARE: { icon: 'share', label: 'Shared' },
  REVOKE_SHARE: { icon: 'link_off', label: 'Access revoked' },
  DELETE: { icon: 'delete', label: 'Deleted' }
};

const ACTOR_LABELS: Record<string, string> = {
  OWNER: 'by you',
  SHARED_PROVIDER: 'by a professional you shared it with',
  ADMIN: 'by a NartureBelle™ administrator'
};

/** Every view, download, share and delete of the user's records (API keeps one log per record; merged here). */
@Component({
  selector: 'app-records-access-log',
  standalone: true,
  imports: [MatIconModule, CommonModule, RouterLink],
  template: `
    <div class="log-page">
      <div class="container">
        <div class="log-header animate-in">
          <div>
            <h1>Access History</h1>
            <p class="lead">Every time one of your documents is viewed, downloaded, shared or deleted.</p>
          </div>
          <a routerLink="/records" class="btn btn-outline btn-sm"><mat-icon class="icon-sm">arrow_back</mat-icon> Back to vault</a>
        </div>

        @if (loading()) {
          @for (i of [1, 2, 3]; track i) { <div class="skeleton" style="height: 64px; margin-bottom: 0.75rem"></div> }
        } @else if (log().length === 0) {
          <div class="empty"><mat-icon class="hero-icon">history</mat-icon><p>No activity yet.</p></div>
        } @else {
          <div class="log-list">
            @for (entry of log(); track entry.id) {
              <div class="log-row glass">
                <mat-icon class="action-icon">{{ meta(entry.action).icon }}</mat-icon>
                <div>
                  <strong>{{ meta(entry.action).label }}</strong> — {{ entry.recordName }}
                  <span class="actor">{{ actor(entry.actorRelationship) }}</span>
                  <div class="hint">{{ entry.occurredAt | date:'medium' }}</div>
                </div>
              </div>
            }
          </div>
          <p class="hint footnote">Activity for documents you've deleted isn't listed here.</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .log-page { padding: 3rem 0 5rem; max-width: 720px; margin: 0 auto; }
    .log-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .log-header h1 { font-size: 1.7rem; }
    .lead { color: var(--text-secondary); margin-top: 0.25rem; }
    .log-list { display: flex; flex-direction: column; gap: 0.7rem; }
    .log-row { display: flex; gap: 0.85rem; align-items: flex-start; border-radius: var(--radius-md); padding: 0.85rem 1rem; font-size: 0.9rem; color: var(--sage-900); }
    .action-icon { font-size: 1.25rem; width: 1.25rem; height: 1.25rem; color: var(--trust-700); flex-shrink: 0; margin-top: 0.1rem; }
    .actor { color: var(--text-secondary); margin-left: 0.25rem; }
    .hint { font-size: 0.78rem; color: var(--text-muted); }
    .footnote { margin-top: 1rem; }
    .empty { text-align: center; padding: 2.5rem 1rem; color: var(--text-secondary); }
  `]
})
export class RecordsAccessLogComponent implements OnInit {
  private recordsService = inject(RecordsService);
  loading = signal(true);
  log = signal<AccessLogEntry[]>([]);

  ngOnInit() {
    this.recordsService.getAllAccessLogs().subscribe({
      next: (entries) => { this.log.set(entries); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  meta(action: string) {
    return ACTION_META[action] ?? { icon: 'circle', label: action };
  }

  actor(rel: string): string {
    return ACTOR_LABELS[rel] ?? '';
  }
}
