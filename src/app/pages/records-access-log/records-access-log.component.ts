import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RecordsService } from '../../services/records.service';
import { AccessLogEntry } from '../../models/records.models';

@Component({
  selector: 'app-records-access-log',
  standalone: true,
  imports: [MatIconModule, CommonModule, RouterLink],
  template: `
    <div class="log-page">
      <div class="container">
        <div class="log-header">
          <h1>Access History</h1>
          <a routerLink="/records" class="btn btn-outline">Back to Vault</a>
        </div>

        @if (log().length === 0) {
          <p class="field-hint">No activity yet.</p>
        } @else {
          <div class="log-list">
            @for (entry of log(); track entry.id) {
              <div class="log-row">
                <mat-icon class="action-icon">{{ icon(entry.action) }}</mat-icon>
                <div>
                  <strong>{{ entry.action }}</strong> — {{ entry.recordName }}
                  @if (entry.detail) { <span class="field-hint">({{ entry.detail }})</span> }
                  <div class="field-hint">{{ entry.at | date:'medium' }}</div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .log-page { padding: 3rem 0 5rem; max-width: 640px; margin: 0 auto; }
    .log-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .log-header h1 { font-size: 1.6rem; color: var(--sage-900); }
    .log-list { display: flex; flex-direction: column; gap: 0.9rem; }
    .log-row { display: flex; gap: 0.75rem; align-items: flex-start; background: #fff; border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 0.85rem 1rem; }
    .action-icon { font-size: 1.2rem; width: 1.2rem; height: 1.2rem; color: var(--trust-700); flex-shrink: 0; }
    .btn-outline { padding: 0.55rem 1rem; border-radius: 8px; border: 1.5px solid var(--border-color); color: var(--text-secondary); text-decoration: none; font-size: 0.85rem; font-weight: 700; }
  `]
})
export class RecordsAccessLogComponent implements OnInit {
  private recordsService = inject(RecordsService);
  log = signal<AccessLogEntry[]>([]);

  ngOnInit() {
    this.log.set(this.recordsService.getAccessLog());
  }

  icon(action: AccessLogEntry['action']): string {
    switch (action) {
      case 'UPLOAD': return 'upload';
      case 'VIEW': return 'visibility';
      case 'DOWNLOAD': return 'download';
      case 'SHARE': return 'share';
      case 'DELETE': return 'delete';
      default: return 'circle';
    }
  }
}
