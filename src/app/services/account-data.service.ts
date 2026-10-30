import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export type DeletionStatus = 'REQUESTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';

export interface DeletionRequest {
  id: number;
  status: DeletionStatus;
  requestedAt: string;
  updatedAt: string;
}

/**
 * Phase 6 — self-service data export and account-deletion requests.
 * Deletion is processed manually by an admin (retention periods are still an open product-owner
 * decision), so nothing is erased automatically — the UI says so.
 */
@Injectable({ providedIn: 'root' })
export class AccountDataService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/me`;

  /**
   * Everything the server holds for the user, as a JSON attachment (narturebelle-export-<date>.json).
   * Record files aren't included, only their metadata. The filename comes from Content-Disposition
   * when CORS exposes it, otherwise the same pattern is built locally.
   */
  exportData(): Observable<{ blob: Blob; filename: string }> {
    return this.http.get(`${this.baseUrl}/export`, { responseType: 'blob', observe: 'response' }).pipe(
      map(res => {
        const cd = res.headers.get('Content-Disposition') ?? '';
        const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
        const today = new Date();
        const fallback = `narturebelle-export-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}.json`;
        return { blob: res.body as Blob, filename: match ? decodeURIComponent(match[1]) : fallback };
      })
    );
  }

  /** null when the user has never asked (404 DELETION_REQUEST_NOT_FOUND). */
  getDeletionRequest(): Observable<DeletionRequest | null> {
    return this.http.get<DeletionRequest>(`${this.baseUrl}/deletion-request`).pipe(
      catchError(err => (err?.status === 404 ? of(null) : throwError(() => err)))
    );
  }

  /** 409 DELETION_ALREADY_REQUESTED if one is already open. */
  requestDeletion(): Observable<DeletionRequest> {
    return this.http.post<DeletionRequest>(`${this.baseUrl}/deletion-request`, { confirm: 'DELETE' });
  }

  /** Only while still REQUESTED; 409 DELETION_NOT_CANCELLABLE once an admin has moved it to IN_PROGRESS. */
  cancelDeletion(): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/deletion-request`);
  }
}
