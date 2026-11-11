import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AccessLogEntry,
  DownloadDisposition,
  HealthRecord,
  RecordCategory,
  RecordDownloadUrl,
  RecordShare,
  ShareTargetType
} from '../models/records.models';

/** Phase 4 (Records vault & sharing) against the real API — UI_INTEGRATION_GUIDE.md §10. */
@Injectable({ providedIn: 'root' })
export class RecordsService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getRecords(): Observable<HealthRecord[]> {
    return this.http.get<HealthRecord[]>(`${this.baseUrl}/records`);
  }

  /** Every call is audited server-side as a VIEW — use it when the user actually opens a record. */
  viewRecord(id: number): Observable<HealthRecord> {
    return this.http.get<HealthRecord>(`${this.baseUrl}/records/${id}`);
  }

  // Uploads live in RecordUploadService: progress, cancel, retry, and multipart for videos (F9-S19).

  updateCategory(id: number, category: RecordCategory): Observable<HealthRecord> {
    return this.http.patch<HealthRecord>(`${this.baseUrl}/records/${id}`, { category });
  }

  /** Soft delete; the API also revokes every share of the record. */
  deleteRecord(id: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/records/${id}`);
  }

  /**
   * A short-lived link to the file. `inline` is for playing a video on the page; `attachment` asks storage
   * to send it as a download, which is what makes phones save it. Older APIs ignore the body.
   */
  getDownloadUrl(id: number, disposition?: DownloadDisposition): Observable<RecordDownloadUrl> {
    return this.http.post<RecordDownloadUrl>(`${this.baseUrl}/records/${id}/download-url`, disposition ? { disposition } : {});
  }

  getShares(recordId: number): Observable<RecordShare[]> {
    return this.http.get<RecordShare[]>(`${this.baseUrl}/records/${recordId}/shares`);
  }

  share(recordId: number, type: ShareTargetType, targetId: number, expiresAt: string): Observable<RecordShare> {
    const body = type === 'PROVIDER'
      ? { shareTargetType: type, targetProviderId: targetId, expiresAt }
      : { shareTargetType: type, targetBookingId: targetId, expiresAt };
    return this.http.post<RecordShare>(`${this.baseUrl}/records/${recordId}/shares`, body);
  }

  revokeShare(shareId: number, reason?: string): Observable<RecordShare> {
    return this.http.post<RecordShare>(`${this.baseUrl}/records/shares/${shareId}/revoke`, reason ? { reason } : {});
  }

  getAccessLog(recordId: number): Observable<AccessLogEntry[]> {
    return this.http.get<AccessLogEntry[]>(`${this.baseUrl}/records/${recordId}/access-log`);
  }

  /** The API's access log is per record; this merges all of the user's records into one timeline. */
  getAllAccessLogs(): Observable<AccessLogEntry[]> {
    return this.getRecords().pipe(
      switchMap(records => records.length ? forkJoin(records.map(r => this.getAccessLog(r.id))) : of([] as AccessLogEntry[][])),
      map(lists => lists.flat().sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()))
    );
  }

  isShareActive(share: RecordShare): boolean {
    return !share.revokedAt && new Date(share.expiresAt).getTime() > Date.now();
  }
}
