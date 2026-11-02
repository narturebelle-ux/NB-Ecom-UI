import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { ProviderApplicationService } from '../../services/provider-application.service';
import {
  APPLICATION_STATUS_LABELS,
  ApplicationStatus,
  ChangeRequestForReview,
  FLAG_LABELS,
  PROFESSION_LABELS,
  QueueItem
} from '../../models/provider-application.models';
import { PROVIDER_PAGE_STYLES } from '../provider-shared/provider-page.styles';

interface QueueTab { key: string; label: string; statuses: ApplicationStatus[]; }

/** Staff queue: applications by stage, and pending profile changes. Operations and Medical Reviewers only. */
@Component({
  selector: 'app-admin-provider-applications',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="provider-page">
      <div class="container wide">
        <header class="head">
          <span class="kicker">Admin</span>
          <h1>Professional applications</h1>
          <p class="muted">Operations checks first, then a different person, the Medical Reviewer, gives the final decision.</p>
        </header>

        <div class="choice-row tabs">
          @for (t of tabs; track t.key) {
            <button class="choice" [class.selected]="tab().key === t.key" (click)="select(t)">{{ t.label }}</button>
          }
        </div>

        @if (loading()) {
          <p class="muted">Loading…</p>
        } @else if (errorMsg()) {
          <div class="error"><mat-icon class="icon-sm">error</mat-icon> {{ errorMsg() }}</div>
        } @else {
          @for (item of items(); track item.id) {
            <a class="row-item" [routerLink]="['/admin/provider-applications', item.id]">
              <span class="row-main">
                <strong>{{ item.applicantName || 'Applicant #' + item.id }}</strong>
                <span>{{ professionLabel(item) }}@if (item.submittedAt) { · submitted {{ item.submittedAt | date:'d MMM y' }} }</span>
              </span>
              @for (f of item.flags; track f) { <span class="badge-pill warn">{{ flagLabel(f) }}</span> }
              @if (item.recheckRequired) { <span class="badge-pill danger">Re-check needed</span> }
              <span class="badge-pill">{{ statusLabel(item.status) }}</span>
            </a>
          } @empty {
            <p class="muted">Nothing here right now.</p>
          }

          @if (tab().key === 'live' && changes().length) {
            <h2>Pending profile changes</h2>
            @for (c of changes(); track c.id) {
              <a class="row-item" [routerLink]="['/admin/provider-applications', c.applicationId]">
                <span class="row-main"><strong>{{ c.type }}</strong><span>Requested {{ c.createdAt | date:'d MMM y' }}</span></span>
                <mat-icon class="icon-sm">chevron_right</mat-icon>
              </a>
            }
          }
        }
      </div>
    </div>
  `,
  styles: [PROVIDER_PAGE_STYLES, `
    .head { margin-bottom: 1.5rem; }
    .head h1 { font-size: clamp(1.7rem, 3.2vw, 2.2rem); color: var(--sage-900); margin: 0.4rem 0; }
    .tabs { margin-bottom: 1.25rem; }
    h2 { font-size: 1.05rem; color: var(--sage-900); margin: 1.5rem 0 0.6rem; }
    .row-item { flex-wrap: wrap; }
  `]
})
export class AdminProviderApplicationsComponent implements OnInit {
  private applications = inject(ProviderApplicationService);
  private api = inject(ApiService);

  tabs: QueueTab[] = [
    { key: 'operations', label: 'Operations check', statuses: ['OPERATIONS_REVIEW'] },
    { key: 'medical', label: 'Medical review', statuses: ['MEDICAL_REVIEW'] },
    { key: 'setup', label: 'In setup', statuses: ['VERIFIED'] },
    { key: 'live', label: 'Live', statuses: ['ACTIVE', 'PAUSED', 'SUSPENDED'] },
    { key: 'closed', label: 'Closed', statuses: ['REJECTED', 'WITHDRAWN', 'CLOSED'] }
  ];

  tab = signal<QueueTab>(this.tabs[0]);
  loading = signal(true);
  errorMsg = signal<string | null>(null);
  items = signal<QueueItem[]>([]);
  changes = signal<ChangeRequestForReview[]>([]);

  ngOnInit() {
    const isMedical = this.api.currentUser()?.roles?.includes('MEDICAL_REVIEWER');
    const isOperations = this.api.currentUser()?.roles?.includes('OPERATIONS_ADMIN');
    this.select(isMedical && !isOperations ? this.tabs[1] : this.tabs[0]);
  }

  select(tab: QueueTab) {
    this.tab.set(tab);
    this.loading.set(true);
    this.errorMsg.set(null);
    this.applications.queue(tab.statuses).subscribe({
      next: items => { this.items.set(items); this.loading.set(false); },
      error: () => { this.loading.set(false); this.errorMsg.set('We couldn’t load the applications. Please try again.'); }
    });
    if (tab.key === 'live') {
      this.applications.pendingChanges().subscribe({ next: changes => this.changes.set(changes), error: () => this.changes.set([]) });
    }
  }

  professionLabel(item: QueueItem): string {
    return PROFESSION_LABELS[item.profession] ?? item.profession;
  }

  statusLabel(status: ApplicationStatus): string {
    return APPLICATION_STATUS_LABELS[status];
  }

  flagLabel(flag: string): string {
    return FLAG_LABELS[flag] ?? flag;
  }
}
