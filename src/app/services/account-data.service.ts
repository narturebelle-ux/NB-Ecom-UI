import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, throwError } from 'rxjs';
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

  /** Everything the server holds for the user, as JSON. Record files aren't included, only their metadata. */
  exportData(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/export`, { responseType: 'blob' });
  }

  /** null when the user has never asked (404). */
  getDeletionRequest(): Observable<DeletionRequest | null> {
    return this.http.get<DeletionRequest>(`${this.baseUrl}/deletion-request`).pipe(
      catchError(err => (err?.status === 404 ? of(null) : throwError(() => err)))
    );
  }

  /** 409 DELETION_ALREADY_REQUESTED if one is already open. */
  requestDeletion(): Observable<DeletionRequest> {
    return this.http.post<DeletionRequest>(`${this.baseUrl}/deletion-request`, { confirm: 'DELETE' });
  }

  /** Only while still REQUESTED. */
  cancelDeletion(): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/deletion-request`);
  }
}
