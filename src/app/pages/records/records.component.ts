import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
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
import {
  FALLBACK_UPLOAD_RULES,
  FileReadiness,
  UploadRules,
  VIDEO_KEEP_DAYS,
  acceptAttribute,
  fileReadiness,
  formatBytes,
  latestShareEnd,
  openRefusalMessage,
  recordKind,
  restorableUntil,
  rulesHint,
  uploadProblem,
  videoNeedsWarning,
  videoRemovalDate
} from '../../models/storage.models';
import { FileUpload, RecordUploadService } from '../../services/record-upload.service';
import { saveFromSignedLink } from '../../services/signed-link';
import { VideoRemovalNoticesComponent } from '../../components/video-removal-notices/video-removal-notices.component';

/** Browser-only flag from before the API had RECORDS_STORAGE; cleared once the real grant is checked. */
const LEGACY_CONSENT_KEY = 'nb_records_storage_consent';
const CATEGORIES: RecordCategory[] = ['SCAN', 'LAB_REPORT', 'PRESCRIPTION', 'DISCHARGE_SUMMARY', 'OTHER'];

/** Records vault against the real API (UI_INTEGRATION_GUIDE.md §10). */
@Component({
  selector: 'app-records',
  standalone: true,
  imports: [MatIconModule, CommonModule, FormsModule, RouterLink, VideoRemovalNoticesComponent],
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
            <h2>Add a document{{ allowsVideo() ? ' or video' : '' }}</h2>
            @if (activeUpload(); as up) {
              <div class="progress-box" [class.failed]="up.state().phase === 'failed'">
                <div class="progress-head">
                  <mat-icon class="icon-sm">{{ up.mimeType.startsWith('video/') ? 'movie' : 'upload_file' }}</mat-icon>
                  <strong class="progress-name">{{ up.file.name }}</strong>
                  <span class="hint">{{ progressText(up) }}</span>
                </div>
                <div class="progress-track" role="progressbar" aria-label="Upload progress"
                     aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="up.percent()">
                  <div class="progress-fill" [style.width.%]="up.state().phase === 'finishing' ? 100 : up.percent()"></div>
                </div>
                @if (up.state().phase === 'failed') {
                  <p class="error"><mat-icon class="icon-sm">error_outline</mat-icon> {{ up.state().error }}</p>
                }
                <div class="progress-actions">
                  @switch (up.state().phase) {
                    @case ('uploading') {
                      <button class="btn btn-outline btn-sm" type="button" (click)="cancelUpload(up)">Cancel</button>
                      @if (up.mimeType.startsWith('video/')) { <span class="hint">Keep this page open until the upload finishes.</span> }
                    }
                    @case ('finishing') { <span class="hint">Saving to your vault…</span> }
                    @case ('failed') {
                      <button class="btn btn-primary btn-sm" type="button" (click)="retryUpload(up)"><mat-icon class="icon-sm">refresh</mat-icon> Retry</button>
                      <button class="btn btn-outline btn-sm" type="button" (click)="cancelUpload(up)">Cancel</button>
                    }
                  }
                </div>
              </div>
            } @else {
              <div class="upload-row">
                <label class="file-pick">
                  <mat-icon>upload_file</mat-icon>
                  <span>{{ selectedFile()?.name || 'Choose a file (' + rulesHint() + ')' }}</span>
                  <input type="file" [accept]="accept()" (change)="onFileSelected($event)" #fileInput hidden />
                </label>
                <select class="form-control category-select" [(ngModel)]="uploadCategory">
                  @for (c of categories; track c) { <option [ngValue]="c">{{ categoryLabel(c) }}</option> }
                </select>
                <button class="btn btn-primary" [disabled]="!selectedFile()" (click)="upload(fileInput)">
                  <mat-icon class="icon-sm">cloud_upload</mat-icon> Upload
                </button>
              </div>
              @if (allowsVideo()) {
                <p class="hint retention-hint"><mat-icon class="icon-sm">info</mat-icon> Videos are kept for {{ keepDays }} days, then removed. We’ll remind you to download them first.</p>
              }
              @if (uploadError()) { <p class="error"><mat-icon class="icon-sm">error_outline</mat-icon> {{ uploadError() }}</p> }
            }
          </div>

          <app-video-removal-notices [records]="list()" />

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
                    <mat-icon class="doc-icon">{{ fileIcon(r) }}</mat-icon>
                    <div class="record-meta">
                      <strong>{{ r.originalFileName }}</strong>
                      <span class="hint">{{ categoryLabel(r.category) }} · {{ formatSize(r.sizeBytes) }} · {{ r.createdAt | date:'mediumDate' }}</span>
                      @if (removalDate(r); as removal) {
                        <span class="removal" [class.soon]="warn(r)"><mat-icon class="icon-xs">schedule</mat-icon> Removed on {{ removal | date:'d MMM y' }}</span>
                      } @else if (restorableUntil(r); as until) {
                        <span class="removal soon"><mat-icon class="icon-xs">delete</mat-icon> Removed. Support can restore it until {{ until | date:'d MMM y' }}</span>
                      }
                    </div>
                    @switch (readiness(r)) {
                      @case ('CHECKING') { <span class="scan-badge checking" title="We check every new file for viruses before it can be opened">Being checked</span> }
                      @case ('BLOCKED') { <span class="scan-badge blocked" title="This file failed the virus check">Blocked</span> }
                      @case ('REMOVED') { <span class="scan-badge blocked" title="This video was removed after 30 days">Removed</span> }
                      @default {
                        @if (r.scanStatus === 'NOT_SCANNED') {
                          <span class="scan-badge" title="Virus scanning isn't enabled yet">Not scanned yet</span>
                        }
                      }
                    }
                    <mat-icon class="chev">expand_more</mat-icon>
                  </div>

                  @if (openId() === r.id) {
                    <div class="record-body">
                      @switch (readiness(r)) {
                        @case ('CHECKING') {
                          <p class="state-note"><mat-icon class="icon-sm">hourglass_top</mat-icon> We’re checking this file for viruses. It can be opened once the check finishes, usually within a few minutes.</p>
                        }
                        @case ('BLOCKED') {
                          <p class="state-note blocked"><mat-icon class="icon-sm">gpp_bad</mat-icon> This file didn’t pass our virus check, so it can’t be opened or shared. Please delete it and upload a clean copy.</p>
                        }
                        @case ('REMOVED') {
                          <p class="state-note"><mat-icon class="icon-sm">delete</mat-icon> This video was removed after {{ keepDays }} days.
                            @if (restorableUntil(r); as until) { If you need it back, contact support before {{ until | date:'d MMM y' }}. }</p>
                        }
                      }
                      @if (isVideo(r) && playUrl(); as src) {
                        <video class="player" controls playsinline preload="metadata" [src]="src" (error)="onPlayerError()"></video>
                      }
                      @if (isVideo(r) && playerExpired()) {
                        <p class="hint">The video couldn’t play; its short-lived link may have expired. Press Play to load it again.</p>
                      }
                      <div class="action-row">
                        @if (isVideo(r) && !playUrl()) {
                          <button class="btn-link" [disabled]="!canOpen(r) || playLoading()" (click)="play(r)"><mat-icon class="icon-sm">play_circle</mat-icon> {{ playLoading() ? 'Loading…' : 'Play' }}</button>
                        }
                        <button class="btn-link" [disabled]="!canOpen(r)" (click)="download(r)"><mat-icon class="icon-sm">download</mat-icon> Download</button>
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

                      @if (readiness(r) !== 'BLOCKED' && readiness(r) !== 'REMOVED') {
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
                      }
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
    .error-msg { color: var(--danger-text); font-size: 0.85rem; margin: 0.5rem 0; }
    .consent-doc summary { cursor: pointer; color: var(--trust-700); font-weight: 600; }
    .consent-doc-body { white-space: pre-line; color: var(--text-secondary); margin-top: 0.5rem; }
    .consent-row { display: flex; gap: 0.6rem; justify-content: center; font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 1.25rem; align-items: center; }

    .upload-row { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
    .file-pick { flex: 1; min-width: 220px; display: flex; align-items: center; gap: 0.6rem; padding: 0.7rem 1rem; border: 1.5px dashed var(--sage-200); border-radius: var(--radius-md); background: var(--sage-50); color: var(--sage-800); cursor: pointer; font-size: 0.88rem; overflow: hidden; }
    .file-pick span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .file-pick:hover { border-color: var(--sage-500); }
    .category-select { width: auto; }
    .retention-hint { display: flex; align-items: center; gap: 0.35rem; margin-top: 0.75rem; }
    .progress-box { display: flex; flex-direction: column; gap: 0.6rem; }
    .progress-head { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; color: var(--sage-800); }
    .progress-name { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--sage-900); }
    .progress-track { height: 10px; border-radius: var(--radius-full); background: var(--sage-50); border: 1px solid var(--sage-100); overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, var(--solid-sage-500), var(--solid-sage-700)); border-radius: var(--radius-full); transition: width 0.3s ease; }
    .progress-box.failed .progress-fill { background: var(--danger-text); opacity: 0.6; }
    .progress-actions { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; }
    .progress-actions .btn { min-height: 40px; }
    .removal { display: inline-flex; align-items: center; gap: 0.2rem; margin-top: 0.15rem; font-size: 0.76rem; color: var(--text-muted); }
    .removal.soon { color: var(--warn-text); font-weight: 600; }
    .icon-xs { font-size: 14px; width: 14px; height: 14px; }
    .scan-badge.checking { color: var(--trust-900); background: var(--trust-50); border-color: var(--trust-200); }
    .scan-badge.blocked { color: var(--danger-text); background: var(--danger-bg); border-color: var(--danger-border); }
    .state-note { display: flex; gap: 0.45rem; align-items: flex-start; font-size: 0.84rem; color: var(--text-secondary); background: var(--sage-50); border-radius: var(--radius-md); padding: 0.65rem 0.85rem; margin-bottom: 1rem; }
    .state-note.blocked { color: var(--danger-text); background: var(--danger-bg); }
    .player { width: 100%; max-height: 60vh; border-radius: var(--radius-md); background: #000; margin-bottom: 0.75rem; }
    .btn-link:disabled { opacity: 0.5; cursor: not-allowed; }
    .error { display: flex; align-items: center; gap: 0.35rem; margin-top: 0.85rem; font-size: 0.85rem; color: var(--danger-text); }

    .empty { text-align: center; padding: 2.5rem 1rem; color: var(--text-secondary); }
    .record-list { display: flex; flex-direction: column; gap: 0.85rem; }
    .record-card { padding: 0; margin: 0; overflow: hidden; }
    .record-head { display: flex; align-items: center; gap: 0.85rem; padding: 1rem 1.25rem; cursor: pointer; }
    .doc-icon { color: var(--trust-700); }
    .record-meta { flex: 1; min-width: 0; }
    .record-meta strong { display: block; color: var(--sage-900); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .hint { font-size: 0.78rem; color: var(--text-muted); }
    .scan-badge { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--warn-text); background: var(--warn-bg); border: 1px solid var(--warn-border); padding: 0.15rem 0.5rem; border-radius: var(--radius-full); white-space: nowrap; }
    .chev { color: var(--text-muted); transition: transform var(--transition-smooth); }
    .record-card.open .chev { transform: rotate(180deg); }
    .record-body { border-top: 1px solid var(--border-light); padding: 1.1rem 1.25rem 1.25rem; animation: fadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    .action-row { display: flex; gap: 1.25rem; align-items: center; flex-wrap: wrap; margin-bottom: 1rem; }
    .btn-link { font-size: 0.84rem; font-weight: 600; color: var(--sage-800); }
    .btn-link.danger { color: var(--danger-text); }
    .inline-select { display: inline-flex; align-items: center; gap: 0.25rem; color: var(--sage-800); font-size: 0.84rem; }
    .inline-select select { border: none; background: transparent; font-weight: 600; color: var(--sage-800); cursor: pointer; }
    .confirm-box { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; padding: 0.75rem 1rem; border-radius: var(--radius-md); background: var(--danger-bg); border: 1px solid var(--danger-border); color: var(--danger-text); font-size: 0.85rem; margin-bottom: 1rem; }

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
export class RecordsComponent implements OnInit, OnDestroy {
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
  uploadError = signal<string | null>(null);

  private uploads = inject(RecordUploadService);
  /** The upload in progress, kept by the service so it survives leaving the page. */
  activeUpload = this.uploads.current;
  rules = signal<UploadRules>(FALLBACK_UPLOAD_RULES);
  accept = computed(() => acceptAttribute(this.rules()));
  rulesHint = computed(() => rulesHint(this.rules()));
  allowsVideo = computed(() => this.rules().kinds.some(k => k.kind === 'VIDEO'));
  readonly keepDays = VIDEO_KEEP_DAYS;
  playUrl = signal<string | null>(null);
  playLoading = signal(false);
  playerExpired = signal(false);
  private checkTimer: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;

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
    this.loadRules();
    // Coming back to the page: pick up a running upload; a failed one waits for Retry; a finished one is
    // already in the list that refresh() loads.
    const running = this.uploads.current();
    const phase = running?.state().phase;
    if (running && (phase === 'uploading' || phase === 'finishing')) this.follow(running);
    else if (running && (phase === 'done' || phase === 'cancelled')) this.uploads.clear(running);
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
      next: (rs) => { this.list.set(rs); this.loading.set(false); this.watchChecking(); },
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
    const file = input.files?.[0] || null;
    const problem = file ? uploadProblem(file, this.rules()) : null;
    if (problem) {
      input.value = '';
      this.selectedFile.set(null);
      this.uploadError.set(problem);
      return;
    }
    this.selectedFile.set(file);
    this.uploadError.set(null);
  }

  upload(fileInput: HTMLInputElement) {
    const file = this.selectedFile();
    if (!file) return;
    const problem = uploadProblem(file, this.rules());
    if (problem) { this.uploadError.set(problem); return; }
    this.uploadError.set(null);
    this.selectedFile.set(null);
    fileInput.value = '';
    this.follow(this.uploads.start(file, this.uploadCategory));
  }

  retryUpload(up: FileUpload) {
    this.follow(up, up.retry());
  }

  cancelUpload(up: FileUpload) {
    up.cancel();
    this.uploads.clear(up);
  }

  /** Waits for an upload (also one started before the mother left and came back) and acts on how it ends. */
  private follow(up: FileUpload, result: Promise<HealthRecord | null> = up.start()) {
    result.then(rec => {
      if (this.destroyed) return;
      const s = up.state();
      if (rec) {
        this.uploads.clear(up);
        this.list.set([rec, ...this.list().filter(x => x.id !== rec.id)]);
        this.loadRules();
        this.api.showToast(fileReadiness(rec) === 'CHECKING'
          ? `“${rec.originalFileName}” uploaded. We’re checking it for viruses; it’ll be ready to open in a few minutes.`
          : `“${rec.originalFileName}” added to your vault.`);
        this.watchChecking();
      } else if (s.phase === 'failed' && s.code === 'CONSENT_REQUIRED') {
        // Agreement was revoked (e.g. from Profile) since this page loaded: ask again.
        this.uploads.clear(up);
        this.hasConsented.set(false);
        this.consentChecked = false;
      }
    });
  }

  progressText(up: FileUpload): string {
    const s = up.state();
    if (s.phase === 'finishing') return 'Finishing…';
    if (s.phase === 'failed') return `Stopped at ${up.percent()}%`;
    return `${formatBytes(s.loaded)} of ${formatBytes(s.total)} · ${up.percent()}%`;
  }

  /** Warn before closing the tab mid-upload; a big video would have to start again. */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    const phase = this.activeUpload()?.state().phase;
    if (phase === 'uploading' || phase === 'finishing') {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  fileIcon(r: HealthRecord): string {
    if (this.isVideo(r)) return 'movie';
    return r.mimeType === 'application/pdf' ? 'picture_as_pdf' : 'image';
  }

  isVideo(r: HealthRecord): boolean { return recordKind(r) === 'VIDEO'; }
  readiness(r: HealthRecord): FileReadiness { return fileReadiness(r); }
  canOpen(r: HealthRecord): boolean { return fileReadiness(r) === 'READY'; }
  removalDate(r: HealthRecord): Date | null { return videoRemovalDate(r); }
  warn(r: HealthRecord): boolean { return videoNeedsWarning(r); }
  restorableUntil(r: HealthRecord): Date | null { return restorableUntil(r); }

  /** Plays the video on the page through a short-lived link; nothing permanent is kept. */
  play(r: HealthRecord) {
    this.playLoading.set(true);
    this.playerExpired.set(false);
    this.records.getDownloadUrl(r.id, 'inline').subscribe({
      next: res => { this.playLoading.set(false); if (this.openId() === r.id) this.playUrl.set(res.downloadUrl); },
      error: err => { this.playLoading.set(false); this.openError(err); }
    });
  }

  onPlayerError() {
    // Most often the short-lived link ran out while the page sat open.
    this.playUrl.set(null);
    this.playerExpired.set(true);
  }

  /** While any file is being checked, look again every 15 seconds for up to 10 minutes. */
  private watchChecking() {
    if (this.checkTimer || !this.list().some(r => fileReadiness(r) === 'CHECKING')) return;
    let polls = 0;
    this.checkTimer = setInterval(() => {
      if (++polls > 40 || !this.list().some(r => fileReadiness(r) === 'CHECKING')) { this.stopChecking(); return; }
      this.records.getRecords().subscribe({ next: rs => this.list.set(rs), error: () => {} });
    }, 15_000);
  }

  private stopChecking() {
    if (this.checkTimer) clearInterval(this.checkTimer);
    this.checkTimer = null;
  }

  private loadRules() {
    this.uploads.rules().subscribe(r => this.rules.set(r));
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.stopChecking();
  }

  private openError(err: any) {
    if (err?.status === 401 || err?.status === 403) return;
    this.api.showToast(openRefusalMessage(err?.error?.code));
    // The file's state changed since the list loaded (scan finished, moved to trash, deleted): reload it.
    if (err?.status === 409) this.refresh();
  }

  toggleOpen(r: HealthRecord) {
    if (this.openId() === r.id) {
      this.openId.set(null);
      return;
    }
    this.openId.set(r.id);
    this.playUrl.set(null);
    this.playerExpired.set(false);
    this.confirmDeleteId.set(null);
    this.shareTargetId = null;
    this.shares.set([]);
    // Opening a record is a real VIEW and is audited server-side.
    this.records.viewRecord(r.id).subscribe({ error: () => {} });
    this.records.getShares(r.id).subscribe({ next: s => this.shares.set(s), error: () => {} });
  }

  download(r: HealthRecord) {
    // Videos are saved as a file (works on phones); documents keep opening in a new tab, as before.
    const video = this.isVideo(r);
    this.records.getDownloadUrl(r.id, video ? 'attachment' : undefined).subscribe({
      next: (res) => video ? saveFromSignedLink(res.downloadUrl) : window.open(res.downloadUrl, '_blank', 'noopener'),
      error: (err) => this.openError(err)
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
    const wanted = new Date();
    wanted.setDate(wanted.getDate() + days);
    // A video can't be shared past its removal date (Care API §10a.9).
    const expires = latestShareEnd(r, wanted);
    const shortened = expires !== wanted;
    this.sharing.set(true);
    this.records.share(r.id, this.shareType, this.shareTargetId, toLocalDateTime(expires)).subscribe({
      next: (s) => {
        this.sharing.set(false);
        this.shares.set([s, ...this.shares()]);
        this.shareTargetId = null;
        this.api.showToast(shortened
          ? `Shared until ${expires.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}, when this video is removed.`
          : `Shared for ${days} day${days === 1 ? '' : 's'}.`);
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
