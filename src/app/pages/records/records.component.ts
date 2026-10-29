import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RecordsService } from '../../services/records.service';
import { ApiService } from '../../services/api.service';
import { RECORD_CATEGORY_LABELS, RecordCategory, RecordDoc, RecordShare } from '../../models/records.models';

const CONSENT_KEY = 'nb_records_storage_consent';
const CATEGORIES: RecordCategory[] = ['SCAN', 'LAB_REPORT', 'PRESCRIPTION', 'DISCHARGE_SUMMARY', 'OTHER'];

@Component({
  selector: 'app-records',
  standalone: true,
  imports: [MatIconModule, CommonModule, FormsModule, RouterLink],
  template: `
    <div class="records-page">
      <div class="container">
        <div class="records-header">
          <h1>Records Vault</h1>
          <a routerLink="/records/access-log" class="btn btn-outline">Access History</a>
        </div>

        <div class="danger-notice">
          <mat-icon class="icon-sm">gpp_maybe</mat-icon> <strong>Not secure storage yet.</strong> This prototype only remembers a filename, category
          and size on this device — it does NOT upload, encrypt, or store the actual file content anywhere.
          Please don't add real medical documents here until this is replaced with real encrypted storage.
        </div>

        @if (!hasConsented()) {
          <div class="consent-box card">
            <h2>Before you add anything</h2>
            <label class="consent-row">
              <input type="checkbox" [(ngModel)]="consentChecked" />
              I understand this is a prototype and no real file content is stored securely anywhere.
            </label>
            <button class="btn btn-primary" [disabled]="!consentChecked" (click)="giveConsent()">Continue</button>
          </div>
        } @else {
          <div class="upload-box card">
            <h2>Add a Record</h2>
            <div class="form-row">
              <input type="file" (change)="onFileSelected($event)" #fileInput />
              <select class="form-control" [(ngModel)]="uploadCategory">
                @for (c of categories; track c) {
                  <option [ngValue]="c">{{ categoryLabel(c) }}</option>
                }
              </select>
              <button class="btn btn-primary" [disabled]="!selectedFile()" (click)="upload(fileInput)">Add</button>
            </div>
          </div>

          <div class="record-list">
            @for (r of records(); track r.id) {
              <div class="record-card card">
                @if (editingId() === r.id) {
                  <div class="edit-row">
                    <input class="form-control" [(ngModel)]="editName" />
                    <select class="form-control" [(ngModel)]="editCategory">
                      @for (c of categories; track c) {
                        <option [ngValue]="c">{{ categoryLabel(c) }}</option>
                      }
                    </select>
                    <button class="btn btn-primary btn-sm" (click)="saveEdit(r)">Save</button>
                  </div>
                } @else {
                  <div class="record-info" (click)="view(r)">
                    <mat-icon class="icon">description</mat-icon>
                    <div>
                      <strong>{{ r.name }}</strong>
                      <span class="field-hint">{{ categoryLabel(r.category) }} · {{ formatSize(r.sizeBytes) }} · {{ r.uploadedAt | date:'mediumDate' }}</span>
                    </div>
                  </div>
                  <div class="record-actions">
                    <button class="btn-link" (click)="startEdit(r)">Edit</button>
                    <button class="btn-link" (click)="download(r)">Download</button>
                    <button class="btn-link" (click)="sharingId.set(sharingId() === r.id ? null : r.id)">Share</button>
                    <button class="btn-link danger" (click)="remove(r)">Delete</button>
                  </div>
                }

                @if (sharingId() === r.id) {
                  <div class="share-panel">
                    <div class="share-form">
                      <input class="form-control" placeholder="Share with (e.g. Dr. Sharma)" [(ngModel)]="shareLabel" />
                      <input class="form-control" type="number" min="1" max="90" [(ngModel)]="shareDays" />
                      <span class="field-hint">days</span>
                      <button class="btn btn-primary btn-sm" (click)="createShare(r)">Share</button>
                    </div>
                    @for (s of shares(r.id); track s.id) {
                      <div class="share-row">
                        <span>Shared with <strong>{{ s.sharedWithLabel }}</strong> until {{ s.expiresAt | date:'mediumDate' }}</span>
                        @if (recordsService.isShareActive(s)) {
                          <button class="btn-link danger" (click)="revoke(s)">Revoke</button>
                        } @else {
                          <span class="field-hint">{{ s.revokedAt ? 'Revoked' : 'Expired' }}</span>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            } @empty {
              <p class="field-hint">No records added yet.</p>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .records-page { padding: 3rem 0 5rem; max-width: 760px; margin: 0 auto; }
    .records-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
    .records-header h1 { font-size: 1.85rem; color: var(--sage-900); }

    .danger-notice { font-size: 0.82rem; color: #a0281c; background: #fdecea; border: 1px solid #f5b7b1; border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 1.5rem; line-height: 1.5; }

    .card { border-radius: var(--radius-xl); background: #fff; border: 1px solid var(--border-light); padding: 1.5rem; margin-bottom: 1.25rem; }
    .consent-box h2 { font-size: 1.1rem; color: var(--primary-deep); margin-bottom: 1rem; }
    .consent-row { display: flex; gap: 0.6rem; font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 1.25rem; align-items: flex-start; }

    .upload-box h2 { font-size: 1.05rem; color: var(--primary-deep); margin-bottom: 1rem; }
    .form-row { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
    .form-control { padding: 0.55rem 0.75rem; border: 1.5px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.88rem; }

    .record-card { display: flex; flex-direction: column; gap: 0.75rem; }
    .record-info { display: flex; gap: 0.75rem; align-items: center; cursor: pointer; }
    .icon { font-size: 1.6rem; width: 1.6rem; height: 1.6rem; color: var(--trust-700); }
    .record-info strong { display: block; color: var(--sage-900); font-size: 0.95rem; }
    .record-actions { display: flex; gap: 0.9rem; flex-wrap: wrap; }
    .btn-link { background: none; border: none; color: var(--text-secondary); font-size: 0.8rem; font-weight: 600; text-decoration: underline; cursor: pointer; padding: 0; }
    .btn-link.danger { color: #a0281c; }
    .edit-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }

    .share-panel { border-top: 1px solid var(--border-light); padding-top: 0.85rem; display: flex; flex-direction: column; gap: 0.6rem; }
    .share-form { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    .share-form input[type="number"] { width: 70px; }
    .share-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem; color: var(--text-secondary); }

    .btn { padding: 0.65rem 1.1rem; border-radius: 8px; font-weight: 700; font-size: 0.88rem; cursor: pointer; border: none; }
    .btn-primary { background: #2e4f3e; color: #fff; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-outline { background: transparent; border: 1.5px solid var(--border-color); color: var(--text-secondary); text-decoration: none; display: inline-block; }
    .btn-sm { padding: 0.45rem 0.8rem; font-size: 0.8rem; }
  `]
})
export class RecordsComponent implements OnInit {
  recordsService = inject(RecordsService);
  private api = inject(ApiService);

  categories = CATEGORIES;
  hasConsented = signal(false);
  consentChecked = false;

  records = signal<RecordDoc[]>([]);
  selectedFile = signal<File | null>(null);
  uploadCategory: RecordCategory = 'OTHER';

  editingId = signal<string | null>(null);
  editName = '';
  editCategory: RecordCategory = 'OTHER';

  sharingId = signal<string | null>(null);
  shareLabel = '';
  shareDays = 7;

  ngOnInit() {
    this.hasConsented.set(localStorage.getItem(CONSENT_KEY) === 'true');
    this.refresh();
  }

  private refresh() {
    this.records.set(this.recordsService.getRecords());
  }

  giveConsent() {
    if (!this.consentChecked) return;
    localStorage.setItem(CONSENT_KEY, 'true');
    this.hasConsented.set(true);
  }

  categoryLabel(c: RecordCategory): string {
    return RECORD_CATEGORY_LABELS[c];
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] || null);
  }

  upload(fileInput: HTMLInputElement) {
    const file = this.selectedFile();
    if (!file) return;
    this.recordsService.addRecord(file, this.uploadCategory);
    this.selectedFile.set(null);
    fileInput.value = '';
    this.refresh();
    this.api.showToast(`Added "${file.name}" (metadata only — see the notice above).`);
  }

  view(r: RecordDoc) {
    this.recordsService.recordViewed(r.id);
  }

  download(r: RecordDoc) {
    this.recordsService.recordDownloaded(r.id);
    this.api.showToast('Nothing to download — no real file content is stored in this prototype.');
  }

  startEdit(r: RecordDoc) {
    this.editingId.set(r.id);
    this.editName = r.name;
    this.editCategory = r.category;
  }

  saveEdit(r: RecordDoc) {
    this.recordsService.updateMetadata(r.id, this.editName.trim() || r.name, this.editCategory);
    this.editingId.set(null);
    this.refresh();
  }

  remove(r: RecordDoc) {
    this.recordsService.deleteRecord(r.id);
    this.refresh();
    this.api.showToast(`Deleted "${r.name}".`);
  }

  shares(recordId: string): RecordShare[] {
    return this.recordsService.getSharesForRecord(recordId);
  }

  createShare(r: RecordDoc) {
    if (!this.shareLabel.trim()) return;
    this.recordsService.shareRecord(r.id, this.shareLabel.trim(), this.shareDays);
    this.shareLabel = '';
    this.shareDays = 7;
  }

  revoke(share: RecordShare) {
    this.recordsService.revokeShare(share.id);
  }
}
