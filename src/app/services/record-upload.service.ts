import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { HealthRecord, RecordCategory } from '../models/records.models';
import { FALLBACK_UPLOAD_RULES, UploadRules } from '../models/storage.models';
import { FileUpload, StorageTransport, fetchUploadRules } from './file-upload';

export { FileUpload, StorageError, StorageTransport } from './file-upload';

/**
 * Uploads to the records vault. Keeps the current upload in a root service, so leaving the page doesn't lose
 * a long video upload: coming back shows its progress again.
 */
@Injectable({ providedIn: 'root' })
export class RecordUploadService {
  private http = inject(HttpClient);
  private transport = inject(StorageTransport);
  private readonly baseUrl = environment.apiUrl;
  /** Base wait between part retries (1s, then 4s); tests set it to 0. */
  retryBaseMs = 1000;

  private readonly _current = signal<FileUpload | null>(null);
  readonly current = this._current.asReadonly();

  /** The API's limits, or today's limits if the API doesn't publish them yet. */
  rules(): Observable<UploadRules> {
    return fetchUploadRules(this.http, `${this.baseUrl}/records/upload-rules`, FALLBACK_UPLOAD_RULES);
  }

  /** Starts uploading `file`. The returned task reports progress and can be cancelled or retried. */
  start(file: File, category: RecordCategory): FileUpload {
    this._current()?.cancel();
    const upload = new FileUpload<HealthRecord>(file, {
      base: `${this.baseUrl}/records`,
      context: { category },
      save: stored => this.http.post<HealthRecord>(`${this.baseUrl}/records`, { category, ...stored })
    }, this.http, this.transport, this.retryBaseMs);
    this._current.set(upload);
    upload.start();
    return upload;
  }

  /** Forget a finished, failed or cancelled upload, so the page shows the picker again. */
  clear(upload: FileUpload) {
    if (this._current() === upload) this._current.set(null);
  }
}
