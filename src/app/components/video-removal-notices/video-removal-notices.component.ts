import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RecordsService } from '../../services/records.service';
import { ApiService } from '../../services/api.service';
import { saveFromSignedLink } from '../../services/signed-link';
import { HealthRecord } from '../../models/records.models';
import { daysUntilRemoval, fileReadiness, openRefusalMessage, videoNeedsWarning, videoRemovalDate } from '../../models/storage.models';

/**
 * "This video will be removed on <date>. Download it now." for every video from the API's `warnFrom`
 * (D49: kept 30 days, warned from day 23) until its `removalAt`. Shown on My Journey and the records page. Pass `records` when the page
 * already has them; otherwise the component loads them itself and stays silent if that fails.
 */
@Component({
  selector: 'app-video-removal-notices',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @for (r of warnings(); track r.id) {
      <div class="notice" role="alert">
        <mat-icon class="notice-icon">schedule</mat-icon>
        <div class="notice-text">
          <strong>This video will be removed on {{ removal(r) | date:'d MMM y' }}. Download it now.</strong>
          <span>{{ r.originalFileName }} · {{ daysLeftText(r) }}</span>
        </div>
        <button class="btn btn-primary btn-sm notice-btn" type="button"
                [disabled]="busyId() === r.id || ready(r) !== 'READY'" (click)="download(r)">
          <mat-icon class="icon-sm">download</mat-icon>
          {{ busyId() === r.id ? 'Preparing…' : 'Download' }}
        </button>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .notice {
      display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap;
      padding: 0.9rem 1.1rem; margin-bottom: 0.85rem; border-radius: var(--radius-lg);
      background: var(--warn-bg); border: 1px solid var(--warn-border); color: var(--warn-text);
    }
    .notice-icon { flex-shrink: 0; }
    .notice-text { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 0.15rem; }
    .notice-text strong { font-size: 0.92rem; }
    .notice-text span { font-size: 0.8rem; opacity: 0.9; overflow-wrap: anywhere; }
    .notice-btn { display: inline-flex; align-items: center; gap: 0.35rem; min-height: 44px; }
    .notice-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    @media (max-width: 600px) {
      .notice-btn { width: 100%; justify-content: center; }
    }
  `]
})
export class VideoRemovalNoticesComponent implements OnInit {
  private recordsService = inject(RecordsService);
  private api = inject(ApiService);

  /** The page's records, if it has them. Left unset, the component loads them. */
  records = input<HealthRecord[] | null>(null);
  private loaded = signal<HealthRecord[]>([]);
  busyId = signal<number | null>(null);

  warnings = computed(() => {
    const now = new Date();
    return (this.records() ?? this.loaded())
      .filter(r => videoNeedsWarning(r, now))
      .sort((a, b) => videoRemovalDate(a)!.getTime() - videoRemovalDate(b)!.getTime());
  });

  ngOnInit() {
    if (this.records() === null) {
      this.recordsService.getRecords().subscribe({ next: rs => this.loaded.set(rs), error: () => {} });
    }
  }

  removal(r: HealthRecord): Date | null { return videoRemovalDate(r); }
  ready(r: HealthRecord) { return fileReadiness(r); }

  daysLeftText(r: HealthRecord): string {
    const d = daysUntilRemoval(r);
    return d === null ? '' : d <= 1 ? 'Last day to download' : `${d} days left`;
  }

  download(r: HealthRecord) {
    this.busyId.set(r.id);
    this.recordsService.getDownloadUrl(r.id, 'attachment').subscribe({
      next: res => { this.busyId.set(null); saveFromSignedLink(res.downloadUrl); },
      error: err => {
        this.busyId.set(null);
        if (err?.status === 401 || err?.status === 403) return;
        this.api.showToast(err?.status === 409 ? openRefusalMessage(err?.error?.code) : 'We couldn’t start the download. Please try again.');
      }
    });
  }
}
