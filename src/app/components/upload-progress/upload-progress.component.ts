import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FileUpload } from '../../services/file-upload';
import { formatBytes } from '../../models/storage.models';

/**
 * Progress, Retry and Cancel for one upload going straight to storage (API_Integration.md §37). Used by the
 * provider application, provider change requests and careers. The records vault has its own copy of this
 * markup inside its upload box.
 */
@Component({
  selector: 'app-upload-progress',
  standalone: true,
  imports: [MatIconModule],
  template: `
    @let up = upload();
    @let s = up.state();
    <div class="progress-box" [class.failed]="s.phase === 'failed'">
      <div class="progress-head">
        <mat-icon class="icon-sm">{{ up.mimeType.startsWith('video/') ? 'movie' : 'upload_file' }}</mat-icon>
        <strong class="progress-name">{{ up.file.name }}</strong>
        <span class="hint">{{ progressText() }}</span>
      </div>
      <div class="progress-track" role="progressbar" aria-label="Upload progress"
           aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="up.percent()">
        <div class="progress-fill" [style.width.%]="s.phase === 'finishing' ? 100 : up.percent()"></div>
      </div>
      @if (s.phase === 'failed') {
        <p class="field-error"><mat-icon class="icon-sm">error_outline</mat-icon> {{ s.error }}</p>
      }
      <div class="progress-actions">
        @switch (s.phase) {
          @case ('uploading') {
            <button class="btn btn-outline btn-sm" type="button" (click)="cancel.emit()">Cancel</button>
            @if (up.mimeType.startsWith('video/')) { <span class="hint">Keep this page open until the upload finishes.</span> }
          }
          @case ('finishing') { <span class="hint">Saving…</span> }
          @case ('failed') {
            <button class="btn btn-primary btn-sm" type="button" (click)="retry.emit()"><mat-icon class="icon-sm">refresh</mat-icon> Retry</button>
            <button class="btn btn-outline btn-sm" type="button" (click)="cancel.emit()">Cancel</button>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .progress-box { display: flex; flex-direction: column; gap: 0.5rem; width: 100%; }
    .progress-head { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; color: var(--sage-800); }
    .progress-name { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--sage-900); }
    .progress-track { height: 10px; border-radius: var(--radius-full); background: var(--sage-50); border: 1px solid var(--sage-100); overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, var(--solid-sage-500), var(--solid-sage-700)); border-radius: var(--radius-full); transition: width 0.3s ease; }
    .progress-box.failed .progress-fill { background: var(--danger-text); opacity: 0.6; }
    .progress-actions { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; }
    .progress-actions .btn { min-height: 40px; }
    .field-error { display: flex; align-items: center; gap: 0.35rem; margin: 0; color: var(--danger-text); }
  `]
})
export class UploadProgressComponent {
  upload = input.required<FileUpload<unknown>>();
  retry = output<void>();
  cancel = output<void>();

  progressText(): string {
    const up = this.upload();
    const s = up.state();
    if (s.phase === 'finishing') return 'Finishing…';
    if (s.phase === 'failed') return `Stopped at ${up.percent()}%`;
    return `${formatBytes(s.loaded)} of ${formatBytes(s.total)} · ${up.percent()}%`;
  }
}

/** True while any of these uploads is still sending, so the page can warn before the tab closes. */
export function anyUploadRunning(uploads: Iterable<FileUpload<unknown> | null | undefined>): boolean {
  for (const up of uploads) {
    const phase = up?.state().phase;
    if (phase === 'uploading' || phase === 'finishing') return true;
  }
  return false;
}
