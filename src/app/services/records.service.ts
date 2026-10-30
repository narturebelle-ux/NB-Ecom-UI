import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AccessLogEntry,
  HealthRecord,
  RecordCategory,
  RecordDownloadUrl,
  RecordShare,
  RecordUploadUrl,
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

  /**
   * Two-call upload: get a signed Supabase Storage URL, PUT the raw bytes there (straight to
   * storage — never through our API, and without our Firebase token, since the URL isn't under
   * environment.apiUrl), then confirm so the API creates the record after verifying the object.
   */
  upload(file: File, category: RecordCategory): Observable<HealthRecord> {
    const mimeType = file.type || 'application/octet-stream';
    return this.http.post<RecordUploadUrl>(`${this.baseUrl}/records/upload-url`, {
      category, fileName: file.name, mimeType, sizeBytes: file.size
    }).pipe(
      switchMap(signed => {
        const url = signed.uploadUrl.includes('token=')
          ? signed.uploadUrl
          : `${signed.uploadUrl}${signed.uploadUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(signed.token)}`;
        return this.http.put(url, file, { headers: new HttpHeaders({ 'Content-Type': mimeType }) }).pipe(
          map(() => signed)
        );
      }),
      switchMap(signed => this.http.post<HealthRecord>(`${this.baseUrl}/records`, {
        category, objectPath: signed.objectPath, originalFileName: file.name, mimeType, sizeBytes: file.size
      }))
    );
  }

  updateCategory(id: number, category: RecordCategory): Observable<HealthRecord> {
    return this.http.patch<HealthRecord>(`${this.baseUrl}/records/${id}`, { category });
  }

  /** Soft delete; the API also revokes every share of the record. */
  deleteRecord(id: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/records/${id}`);
  }

  getDownloadUrl(id: number): Observable<RecordDownloadUrl> {
    return this.http.post<RecordDownloadUrl>(`${this.baseUrl}/records/${id}/download-url`, {});
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
