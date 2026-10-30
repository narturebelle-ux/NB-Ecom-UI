import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RecordsService } from '../../services/records.service';
import { ProviderService } from '../../services/provider.service';
import { ApiService } from '../../services/api.service';
import { ConsentDocument } from '../../models/maternal.models';
import {
  HealthRecord,
  RECORD_CATEGORY_LABELS,
  RecordCategory,
  RecordShare,
  ShareTargetType,
  toLocalDateTime
} from '../../models/records.models';
import { Booking, Provider } from '../../models/provider.models';

/** Browser-only flag from before the API had RECORDS_STORAGE; cleared once the real grant is checked. */
const LEGACY_CONSENT_KEY = 'nb_records_storage_consent';
const CATEGORIES: RecordCategory[] = ['SCAN', 'LAB_REPORT', 'PRESCRIPTION', 'DISCHARGE_SUMMARY', 'OTHER'];

/** Records vault against the real API (UI_INTEGRATION_GUIDE.md §10). */
@Component({
  selector: 'app-records',
  standalone: true,
  imports: [MatIconModule, CommonModule, FormsModule, RouterLink],
  template: `
    <div class="records-page">
      <div class="container">
        <div class="records-header animate-in">
          <div>
            <h1>Records Vault</h1>
            <p class="lead">Keep your reports and scans in one private place, and share them only when you choose.</p>
          </div>
          <a routerLink="/records/access-log" class="btn btn-outline btn-sm"><mat-icon class="icon-sm">history</mat-icon> Access history</a>
        </div>

        @if (!hasConsented()) {
          <div class="card glass consent-box">
            <mat-icon class="hero-icon">lock</mat-icon>
            <h2>Before you add documents</h2>
            <ul class="consent-points">
              <li><mat-icon class="icon-sm">cloud_upload</mat-icon> Files are stored in our secure cloud storage and opened only through short-lived links.</li>
              <li><mat-icon class="icon-sm">visibility</mat-icon> Only you can see them, unless you share a document with a professional for a set time.</li>
              <li><mat-icon class="icon-sm">history</mat-icon> Every view, download and share is recorded in your access history.</li>
            </ul>
            <label class="consent-row">
              <input type="checkbox" [(ngModel)]="consentChecked" />
              I agree to NartureBelle™ storing the documents I upload, as described above.
            </label>
            @if (storageDoc(); as doc) {
              <details class="consent-doc">
                <summary>Read the full {{ doc.title || 'records storage agreement' }} (version {{ doc.version }})</summary>
                <p class="consent-doc-body">{{ doc.bodyMarkdown }}</p>
              </details>
            }
            @if (consentError()) { <p class="error-msg">{{ consentError() }}</p> }
            <button class="btn btn-primary" [disabled]="!consentChecked || !storageDoc() || consentSaving()" (click)="giveConsent()">
              {{ consentSaving() ? 'Saving…' : 'Continue' }}
            </button>
          </div>
        } @else {
          <div class="card glass upload-box">
            <h2>Add a document</h2>
            <div class="upload-row">
              <label class="file-pick">
                <mat-icon>upload_file</mat-icon>
                <span>{{ selectedFile()?.name || 'Choose a file (PDF or photo)' }}</span>
                <input type="file" accept=".pdf,image/*" (change)="onFileSelected($event)" #fileInput hidden />
              </label>
              <select class="form-control category-select" [(ngModel)]="uploadCategory">
                @for (c of categories; track c) { <option [ngValue]="c">{{ categoryLabel(c) }}</option> }
              </select>
              <button class="btn btn-primary" [disabled]="!selectedFile() || uploading()" (click)="upload(fileInput)">
                @if (uploading()) { Uploading… } @else { <mat-icon class="icon-sm">cloud_upload</mat-icon> Upload }
              </button>
            </div>
            @if (uploadError()) { <p class="error"><mat-icon class="icon-sm">error_outline</mat-icon> {{ uploadError() }}</p> }
          </div>

          @if (loading()) {
            @for (i of [1, 2]; track i) { <div class="skeleton" style="height: 84px; margin-bottom: 1rem"></div> }
          } @else if (list().length === 0) {
            <div class="empty">
              <mat-icon class="hero-icon">folder_open</mat-icon>
              <p>No documents yet. Scans, lab reports and prescriptions you add will appear here.</p>
            </div>
          } @else {
            <div class="record-list">
              @for (r of list(); track r.id) {
                <div class="record-card card glass" [class.open]="openId() === r.id">
                  <div class="record-head" (click)="toggleOpen(r)">
                    <mat-icon class="doc-icon">{{ r.mimeType === 'application/pdf' ? 'picture_as_pdf' : 'image' }}</mat-icon>
                    <div class="record-meta">
                      <strong>{{ r.originalFileName }}</strong>
                      <span class="hint">{{ categoryLabel(r.category) }} · {{ formatSize(r.sizeBytes) }} · {{ r.createdAt | date:'mediumDate' }}</span>
                    </div>
                    @if (r.scanStatus === 'NOT_SCANNED') {
                      <span class="scan-badge" title="Virus scanning isn't enabled yet">Not scanned yet</span>
                    }
                    <mat-icon class="chev">expand_more</mat-icon>
                  </div>

                  @if (openId() === r.id) {
                    <div class="record-body">
                      <div class="action-row">
                        <button class="btn-link" (click)="download(r)"><mat-icon class="icon-sm">download</mat-icon> Download</button>
                        <label class="inline-select">
                          <mat-icon class="icon-sm">label</mat-icon>
                          <select [ngModel]="r.category" (ngModelChange)="changeCategory(r, $event)">
                            @for (c of categories; track c) { <option [ngValue]="c">{{ categoryLabel(c) }}</option> }
                          </select>
                        </label>
                        <button class="btn-link danger" (click)="confirmDeleteId.set(r.id)"><mat-icon class="icon-sm">delete</mat-icon> Delete</button>
                      </div>

                      @if (confirmDeleteId() === r.id) {
                        <div class="confirm-box">
                          Delete “{{ r.originalFileName }}”? Any active shares will be revoked.
                          <button class="btn-link danger" (click)="remove(r)">Yes, delete</button>
                          <button class="btn-link" (click)="confirmDeleteId.set(null)">Cancel</button>
                        </div>
                      }

                      <div class="share-section">
                        <h3><mat-icon class="icon-sm">share</mat-icon> Sharing</h3>
                        @for (s of shares(); track s.id) {
                          <div class="share-row">
                            <span>
                              {{ shareTargetLabel(s) }}
                              <span class="hint">
                                @if (records.isShareActive(s)) { until {{ s.expiresAt | date:'mediumDate' }} }
                                @else { {{ s.revokedAt ? 'revoked' : 'expired' }} }
                              </span>
                            </span>
                            @if (records.isShareActive(s)) {
                              <button class="btn-link danger" (click)="revoke(s)">Revoke</button>
                            }
                          </div>
                        } @empty {
                          <p class="hint">Not shared with anyone.</p>
                        }

                        <div class="share-form">
                          <p class="share-what">Share <strong>this document only</strong> — nothing else in your vault.</p>
                          <div class="share-controls">
                            <select class="form-control" [(ngModel)]="shareType">
                              <option value="PROVIDER">With a professional</option>
                              <option value="BOOKING">With a booked session</option>
                            </select>
                            @if (shareType === 'PROVIDER') {
                              <select class="form-control" [(ngModel)]="shareTargetId">
                                <option [ngValue]="null">Choose a professional</option>
                                @for (p of providers(); track p.id) { <option [ngValue]="p.id">{{ p.displayName }}</option> }
                              </select>
                            } @else {
                              <select class="form-control" [(ngModel)]="shareTargetId">
                                <option [ngValue]="null">Choose a booking</option>
                                @for (b of bookings(); track b.id) {
                                  <option [ngValue]="b.id">{{ providerName(b.providerId) }} · {{ b.scheduledStart | date:'MMM d, h:mm a' }}</option>
                                }
                              </select>
                            }
                            <div class="days">
                              <input type="number" class="form-control" min="1" max="180" [(ngModel)]="shareDays" />
                              <span>days</span>
                            </div>
                            <button class="btn btn-primary btn-sm" [disabled]="!shareTargetId || !shareDays || sharing()" (click)="createShare(r)">Share</button>
                          </div>
                          @if (shareType === 'PROVIDER' && providers().length === 0) { <p class="hint">No verified professionals are available yet.</p> }
                          @if (shareType === 'BOOKING' && bookings().length === 0) { <p class="hint">You don't have any active bookings.</p> }
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .records-page { padding: 3rem 0 5rem; max-width: 820px; margin: 0 auto; }
    .records-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1.75rem; flex-wrap: wrap; }
    .records-header h1 { font-size: 1.9rem; }
    .lead { color: var(--text-secondary); margin-top: 0.25rem; }
    .card { border-radius: var(--radius-xl); padding: 1.5rem; margin-bottom: 1.25rem; }
    .card:hover { transform: none; }
    h2 { font-size: 1.15rem; margin-bottom: 1rem; }

    .consent-box { text-align: center; padding: 2.25rem; }
    .consent-points { list-style: none; text-align: left; max-width: 520px; margin: 0 auto 1.5rem; display: flex; flex-direction: column; gap: 0.65rem; }
    .consent-points li { display: flex; gap: 0.6rem; align-items: flex-start; font-size: 0.9rem; color: var(--text-secondary); }
    .consent-points mat-icon { color: var(--trust-700); margin-top: 0.15rem; }
    .consent-doc { margin: 0.75rem 0; font-size: 0.85rem; }
    .error-msg { color: #a0281c; font-size: 0.85rem; margin: 0.5rem 0; }
    .consent-doc summary { cursor: pointer; color: var(--trust-700); font-weight: 600; }
    .consent-doc-body { white-space: pre-line; color: var(--text-secondary); margin-top: 0.5rem; }
    .consent-row { display: flex; gap: 0.6rem; justify-content: center; font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 1.25rem; align-items: center; }

    .upload-row { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
    .file-pick { flex: 1; min-width: 220px; display: flex; align-items: center; gap: 0.6rem; padding: 0.7rem 1rem; border: 1.5px dashed var(--sage-200); border-radius: var(--radius-md); background: var(--sage-50); color: var(--sage-800); cursor: pointer; font-size: 0.88rem; overflow: hidden; }
    .file-pick span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .file-pick:hover { border-color: var(--sage-500); }
    .category-select { width: auto; }
    .error { display: flex; align-items: center; gap: 0.35rem; margin-top: 0.85rem; font-size: 0.85rem; color: #a0281c; }

    .empty { text-align: center; padding: 2.5rem 1rem; color: var(--text-secondary); }
    .record-list { display: flex; flex-direction: column; gap: 0.85rem; }
    .record-card { padding: 0; margin: 0; overflow: hidden; }
    .record-head { display: flex; align-items: center; gap: 0.85rem; padding: 1rem 1.25rem; cursor: pointer; }
    .doc-icon { color: var(--trust-700); }
    .record-meta { flex: 1; min-width: 0; }
    .record-meta strong { display: block; color: var(--sage-900); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .hint { font-size: 0.78rem; color: var(--text-muted); }
    .scan-badge { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #92610a; background: #fff8eb; border: 1px solid #fbd38d; padding: 0.15rem 0.5rem; border-radius: var(--radius-full); white-space: nowrap; }
    .chev { color: var(--text-muted); transition: transform var(--transition-smooth); }
    .record-card.open .chev { transform: rotate(180deg); }
    .record-body { border-top: 1px solid var(--border-light); padding: 1.1rem 1.25rem 1.25rem; animation: fadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    .action-row { display: flex; gap: 1.25rem; align-items: center; flex-wrap: wrap; margin-bottom: 1rem; }
    .btn-link { font-size: 0.84rem; font-weight: 600; color: var(--sage-800); }
    .btn-link.danger { color: #a0281c; }
    .inline-select { display: inline-flex; align-items: center; gap: 0.25rem; color: var(--sage-800); font-size: 0.84rem; }
    .inline-select select { border: none; background: transparent; font-weight: 600; color: var(--sage-800); cursor: pointer; }
    .confirm-box { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; padding: 0.75rem 1rem; border-radius: var(--radius-md); background: #fdecea; border: 1px solid #f5b7b1; color: #a0281c; font-size: 0.85rem; margin-bottom: 1rem; }

    .share-section h3 { display: flex; align-items: center; gap: 0.35rem; font-family: var(--font-sans); font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); margin-bottom: 0.6rem; }
    .share-row { display: flex; justify-content: space-between; align-items: center; padding: 0.45rem 0; border-bottom: 1px solid var(--border-subtle); font-size: 0.86rem; color: var(--sage-900); }
    .share-form { margin-top: 0.9rem; padding: 0.9rem; border-radius: var(--radius-md); background: var(--trust-50); border: 1px solid var(--trust-200); }
    .share-what { font-size: 0.82rem; color: var(--trust-900); margin-bottom: 0.6rem; }
    .share-controls { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
    .share-controls .form-control { width: auto; padding: 0.5rem 0.7rem; font-size: 0.85rem; }
    .days { display: flex; align-items: center; gap: 0.35rem; font-size: 0.82rem; color: var(--text-secondary); }
    .days .form-control { width: 70px; }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
  `]
})
export class RecordsComponent implements OnInit {
  records = inject(RecordsService);
  private providerService = inject(ProviderService);
  private api = inject(ApiService);

  categories = CATEGORIES;
  hasConsented = signal(false);
  consentChecked = false;
  storageDoc = signal<ConsentDocument | null>(null);
  consentSaving = signal(false);
  consentError = signal<string | null>(null);

  loading = signal(true);
  list = signal<HealthRecord[]>([]);
  selectedFile = signal<File | null>(null);
  uploadCategory: RecordCategory = 'OTHER';
  uploading = signal(false);
  uploadError = signal<string | null>(null);

  openId = signal<number | null>(null);
  confirmDeleteId = signal<number | null>(null);
  shares = signal<RecordShare[]>([]);
  providers = signal<Provider[]>([]);
  bookings = signal<Booking[]>([]);
  shareType: ShareTargetType = 'PROVIDER';
  shareTargetId: number | null = null;
  shareDays = 7;
  sharing = signal(false);

  private providerNames = new Map<number, string>();

  ngOnInit() {
    this.loadStorageConsent();
    this.refresh();
    this.providerService.getProviders().subscribe({
      next: (ps) => {
        this.providers.set(ps);
        this.providerNames = new Map(ps.map(p => [p.id, p.displayName]));
      },
      error: () => {}
    });
    this.providerService.getBookings().subscribe({
      next: (bs) => this.bookings.set(bs.filter(b => b.status === 'BOOKED' || b.status === 'IN_PROGRESS')),
      error: () => {}
    });
  }

  private refresh() {
    this.loading.set(true);
    this.records.getRecords().subscribe({
      next: (rs) => { this.list.set(rs); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  /** RECORDS_STORAGE consent (API 43c0d60): read from GET /me/consents, document text from /consent-documents/current. */
  private loadStorageConsent() {
    try { localStorage.removeItem(LEGACY_CONSENT_KEY); } catch { /* blocked storage */ }
    this.api.getMyConsents().subscribe({
      next: status => this.hasConsented.set(
        status.history.some(c => c.documentType === 'RECORDS_STORAGE' && !c.revokedAt)
      ),
      error: () => {}
    });
    this.api.getConsentDocuments().subscribe({
      next: docs => this.storageDoc.set(docs.find(d => d.type === 'RECORDS_STORAGE') ?? null),
      error: () => this.consentError.set('We couldn’t load the storage agreement. Please reload the page.')
    });
  }

  giveConsent() {
    const doc = this.storageDoc();
    if (!this.consentChecked || !doc) return;
    this.consentSaving.set(true);
    this.consentError.set(null);
    this.api.grantConsent('RECORDS_STORAGE', doc.version).subscribe({
      next: () => {
        this.consentSaving.set(false);
        this.hasConsented.set(true);
      },
      error: () => {
        this.consentSaving.set(false);
        this.consentError.set('We couldn’t save your agreement. Please try again.');
      }
    });
  }

  categoryLabel(c: RecordCategory): string {
    return RECORD_CATEGORY_LABELS[c] ?? c;
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  providerName(id: number): string {
    return this.providerNames.get(id) ?? 'your care provider';
  }

  shareTargetLabel(s: RecordShare): string {
    if (s.shareTargetType === 'PROVIDER') return `Shared with ${this.providerName(s.targetProviderId!)}`;
    const b = this.bookings().find(x => x.id === s.targetBookingId);
    return b ? `Shared for your session with ${this.providerName(b.providerId)}` : 'Shared with a booked session';
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] || null);
    this.uploadError.set(null);
  }

  upload(fileInput: HTMLInputElement) {
    const file = this.selectedFile();
    if (!file) return;
    this.uploading.set(true);
    this.uploadError.set(null);
    this.records.upload(file, this.uploadCategory).subscribe({
      next: (rec) => {
        this.uploading.set(false);
        this.selectedFile.set(null);
        fileInput.value = '';
        this.list.set([rec, ...this.list()]);
        this.api.showToast(`“${rec.originalFileName}” added to your vault.`);
      },
      error: (err) => {
        this.uploading.set(false);
        if (err?.error?.code === 'CONSENT_REQUIRED' && (err.error.pending ?? []).includes('RECORDS_STORAGE')) {
          // Agreement was revoked (e.g. from Profile) since this page loaded: ask again.
          this.hasConsented.set(false);
          this.consentChecked = false;
          return;
        }
        if (err?.status === 401 || err?.status === 403) return;
        if (err?.error?.code === 'VALIDATION_FAILED') {
          this.uploadError.set(err.error.message || 'That file type or size isn’t supported.');
        } else if (err?.status === 0 || err?.status >= 500) {
          // Includes storage not being configured yet on the server (see API §10).
          this.uploadError.set('Uploads aren’t available right now — our secure storage is still being set up. Please try again later.');
        } else {
          this.uploadError.set(err?.error?.message || 'Upload failed. Please try again.');
        }
      }
    });
  }

  toggleOpen(r: HealthRecord) {
    if (this.openId() === r.id) {
      this.openId.set(null);
      return;
    }
    this.openId.set(r.id);
    this.confirmDeleteId.set(null);
    this.shareTargetId = null;
    this.shares.set([]);
    // Opening a record is a real VIEW and is audited server-side.
    this.records.viewRecord(r.id).subscribe({ error: () => {} });
    this.records.getShares(r.id).subscribe({ next: s => this.shares.set(s), error: () => {} });
  }

  download(r: HealthRecord) {
    this.records.getDownloadUrl(r.id).subscribe({
      next: (res) => window.open(res.downloadUrl, '_blank', 'noopener'),
      error: (err) => {
        if (err?.status === 401 || err?.status === 403) return;
        this.api.showToast('Downloads aren’t available right now — our secure storage is still being set up.');
      }
    });
  }

  changeCategory(r: HealthRecord, category: RecordCategory) {
    this.records.updateCategory(r.id, category).subscribe({
      next: (updated) => this.list.set(this.list().map(x => x.id === updated.id ? updated : x)),
      error: () => this.api.showToast('Could not update the category.')
    });
  }

  remove(r: HealthRecord) {
    this.records.deleteRecord(r.id).subscribe({
      next: () => {
        this.list.set(this.list().filter(x => x.id !== r.id));
        this.openId.set(null);
        this.api.showToast(`Deleted “${r.originalFileName}”.`);
      },
      error: () => this.api.showToast('Could not delete the document.')
    });
  }

  createShare(r: HealthRecord) {
    if (!this.shareTargetId || !this.shareDays) return;
    const days = Math.min(180, Math.max(1, Math.round(this.shareDays)));
    const expires = new Date();
    expires.setDate(expires.getDate() + days);
    this.sharing.set(true);
    this.records.share(r.id, this.shareType, this.shareTargetId, toLocalDateTime(expires)).subscribe({
      next: (s) => {
        this.sharing.set(false);
        this.shares.set([s, ...this.shares()]);
        this.shareTargetId = null;
        this.api.showToast(`Shared for ${days} day${days === 1 ? '' : 's'}.`);
      },
      error: (err) => {
        this.sharing.set(false);
        this.api.showToast(err?.error?.message || 'Could not share the document.');
      }
    });
  }

  revoke(s: RecordShare) {
    this.records.revokeShare(s.id).subscribe({
      next: (updated) => this.shares.set(this.shares().map(x => x.id === updated.id ? updated : x)),
      error: () => this.api.showToast('Could not revoke access.')
    });
  }
}
