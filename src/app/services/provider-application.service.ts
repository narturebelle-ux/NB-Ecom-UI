import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, catchError, map, of, tap, throwError, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { SILENT_FORBIDDEN } from '../interceptors/auth.interceptor';
import { ApiService } from './api.service';
import { FileUpload, StorageTransport, fetchUploadRules, useOldDownload } from './file-upload';
import { FORM_UPLOAD_RULES, UploadRules } from '../models/storage.models';
import { User, isProfessionalUser } from '../models/maternal.models';
import {
  Agreement,
  AnswerValue,
  ApplicationDocument,
  ApplicationEntry,
  ApplyInfo,
  BankDetails,
  BankDetailsInput,
  ChangeRequest,
  ChangeRequestForReview,
  ChangeType,
  Earnings,
  FormSection,
  ProductActivity,
  ProviderFeedback,
  ProfessionRole,
  ProviderApplication,
  ProviderProfile,
  PublicCredentials,
  QueueItem,
  ReviewDetail,
  SetupStatus,
  Training,
  TrainingResult,
  WorkspaceModality,
  WorkspaceService,
  WorkspaceSlot
} from '../models/provider-application.models';

const APPLICANT_KEY = 'nb_provider_applicants';
/** Long enough for the API to wake from idle. Nothing waits on these calls, so they can take their time. */
const BACKGROUND_TIMEOUT_MS = 45000;

/** Care professional onboarding, dashboard data and staff review, against NB-Ecom-API. */
@Injectable({ providedIn: 'root' })
export class ProviderApplicationService {
  private http = inject(HttpClient);
  private api = inject(ApiService);
  private transport = inject(StorageTransport);
  private readonly baseUrl = environment.apiUrl;
  /** Base wait between upload part retries; tests set it to 0. */
  retryBaseMs = 1000;

  /** Accounts on this device known to have an application, so routing works on reload without a network call. */
  private applicantIds = signal<number[]>(this.readApplicants());

  /** A non-professional account that has applied: it belongs in the professional area, not the mother's. */
  readonly isApplicant = computed(() => {
    const user = this.api.currentUser();
    return !!user && !isProfessionalUser(user) && this.applicantIds().includes(user.id);
  });

  // ---------- routing ----------

  /** For the application page, which needs the real answer and shows its own error if it can't get one. */
  loadEntry(): Observable<ApplicationEntry> {
    return this.http.get<ApplicationEntry>(`${this.baseUrl}/provider-application/entry`).pipe(
      tap(entry => { if (entry.hasApplication) this.markApplicant(); })
    );
  }

  /** The background check after sign-in. Null if the service can't be reached: that must not affect anyone's sign-in. */
  refreshEntry(): Observable<ApplicationEntry | null> {
    return this.loadEntry().pipe(
      timeout(BACKGROUND_TIMEOUT_MS),
      catchError(() => of(null))
    );
  }

  /** The signed-in user can be stale: a role granted at go-live only reaches this device through GET /me. Null if that fails. */
  syncAccount(): Observable<User | null> {
    return this.api.getMe().pipe(
      tap(user => this.api.setUser(user)),
      catchError(() => of(null))
    );
  }

  markApplicant() {
    const id = this.api.currentUser()?.id;
    if (!id || this.applicantIds().includes(id)) return;
    const next = [...this.applicantIds(), id];
    this.applicantIds.set(next);
    try { localStorage.setItem(APPLICANT_KEY, JSON.stringify(next)); } catch { /* still works for this session */ }
  }

  private readApplicants(): number[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(APPLICANT_KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  // ---------- application ----------

  applyInfo(): Observable<ApplyInfo> {
    return this.http.get<ApplyInfo>(`${this.baseUrl}/public/apply-info`);
  }

  form(profession: ProfessionRole): Observable<FormSection[]> {
    return this.http.get<FormSection[]>(`${this.baseUrl}/provider-application/form`, { params: { profession } });
  }

  current(): Observable<ProviderApplication> {
    return this.http.get<ProviderApplication>(`${this.baseUrl}/provider-application`);
  }

  start(profession: ProfessionRole): Observable<ProviderApplication> {
    return this.http.post<ProviderApplication>(`${this.baseUrl}/provider-application`, { profession, termsAccepted: true, verificationConsent: true })
      .pipe(tap(() => this.markApplicant()));
  }

  changeProfession(profession: ProfessionRole): Observable<ProviderApplication> {
    return this.http.put<ProviderApplication>(`${this.baseUrl}/provider-application/profession`, { profession });
  }

  saveAnswers(answers: Record<string, AnswerValue>): Observable<ProviderApplication> {
    return this.http.patch<ProviderApplication>(`${this.baseUrl}/provider-application/answers`, { answers });
  }

  uploadDocument(questionKey: string, file: File): Observable<ApplicationDocument> {
    const data = new FormData();
    data.append('file', file, file.name);
    return this.http.post<ApplicationDocument>(`${this.baseUrl}/provider-application/documents/${questionKey}`, data);
  }

  /** What this file question accepts. FORM_UPLOAD_RULES means the API hasn't moved it to S3 yet (§37). */
  documentRules(questionKey: string): Observable<UploadRules> {
    return fetchUploadRules(this.http, `${this.baseUrl}/provider-application/files/upload-rules`, FORM_UPLOAD_RULES, { questionKey });
  }

  /** Sends the file straight to S3, then attaches it to the question. */
  startDocumentUpload(questionKey: string, file: File): FileUpload<ApplicationDocument> {
    return new FileUpload<ApplicationDocument>(file, {
      base: `${this.baseUrl}/provider-application/files`,
      context: { questionKey },
      save: stored => this.http.post<ApplicationDocument>(`${this.baseUrl}/provider-application/documents/${questionKey}`, stored)
    }, this.http, this.transport, this.retryBaseMs);
  }

  /**
   * A short-lived link to the applicant's own file on S3, or null for an older file kept in Postgres
   * (or an API without S3), which has no link to open from the browser.
   */
  ownDocumentUrl(documentId: number): Observable<string | null> {
    return this.http.post<{ downloadUrl: string }>(`${this.baseUrl}/provider-application/documents/${documentId}/download-url`,
      { disposition: 'attachment' }).pipe(
      map(res => res.downloadUrl),
      catchError(err => useOldDownload(err) ? of(null) : throwError(() => err))
    );
  }

  removeDocument(questionKey: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/provider-application/documents/${questionKey}`);
  }

  submit(): Observable<ProviderApplication> {
    return this.http.post<ProviderApplication>(`${this.baseUrl}/provider-application/submit`, {});
  }

  withdraw(): Observable<ProviderApplication> {
    return this.http.post<ProviderApplication>(`${this.baseUrl}/provider-application/withdraw`, {});
  }

  // ---------- setup ----------

  setupStatus(): Observable<SetupStatus> {
    return this.http.get<SetupStatus>(`${this.baseUrl}/provider-application/setup`);
  }

  agreement(): Observable<Agreement> {
    return this.http.get<Agreement>(`${this.baseUrl}/provider-application/setup/agreement`);
  }

  signAgreement(typedName: string): Observable<Agreement> {
    return this.http.post<Agreement>(`${this.baseUrl}/provider-application/setup/agreement`, { typedName });
  }

  bank(): Observable<BankDetails | null> {
    return this.http.get<BankDetails | null>(`${this.baseUrl}/provider-application/setup/bank`);
  }

  saveBank(input: BankDetailsInput): Observable<BankDetails> {
    return this.http.put<BankDetails>(`${this.baseUrl}/provider-application/setup/bank`, input);
  }

  training(): Observable<Training> {
    return this.http.get<Training>(`${this.baseUrl}/provider-application/setup/training`);
  }

  submitTraining(answers: Record<string, number>): Observable<TrainingResult> {
    return this.http.post<TrainingResult>(`${this.baseUrl}/provider-application/setup/training`, { answers });
  }

  confirmProfile(): Observable<SetupStatus> {
    return this.http.post<SetupStatus>(`${this.baseUrl}/provider-application/setup/profile-confirmation`, {});
  }

  // ---------- workspace ----------

  services(): Observable<WorkspaceService[]> {
    return this.http.get<WorkspaceService[]>(`${this.baseUrl}/provider-workspace/services`);
  }

  addService(body: { name: string; description: string | null; modality: WorkspaceModality; durationMinutes: number }): Observable<WorkspaceService> {
    return this.http.post<WorkspaceService>(`${this.baseUrl}/provider-workspace/services`, body);
  }

  setServiceActive(id: number, active: boolean): Observable<WorkspaceService> {
    return this.http.patch<WorkspaceService>(`${this.baseUrl}/provider-workspace/services/${id}`, null, { params: { active } });
  }

  slots(): Observable<WorkspaceSlot[]> {
    return this.http.get<WorkspaceSlot[]>(`${this.baseUrl}/provider-workspace/slots`);
  }

  addSlots(slots: { startAt: string; endAt: string }[]): Observable<WorkspaceSlot[]> {
    return this.http.post<WorkspaceSlot[]>(`${this.baseUrl}/provider-workspace/slots`, { slots });
  }

  removeSlot(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/provider-workspace/slots/${id}`);
  }

  earnings(): Observable<Earnings> {
    return this.http.get<Earnings>(`${this.baseUrl}/provider-workspace/earnings`, { context: new HttpContext().set(SILENT_FORBIDDEN, true) });
  }

  feedback(): Observable<ProviderFeedback> {
    return this.http.get<ProviderFeedback>(`${this.baseUrl}/provider-workspace/feedback`);
  }

  productActivity(): Observable<ProductActivity[]> {
    return this.http.get<ProductActivity[]>(`${this.baseUrl}/provider-workspace/product-activity`, { context: new HttpContext().set(SILENT_FORBIDDEN, true) });
  }

  profile(): Observable<ProviderProfile> {
    return this.http.get<ProviderProfile>(`${this.baseUrl}/provider-workspace/profile`);
  }

  changeRequests(): Observable<ChangeRequest[]> {
    return this.http.get<ChangeRequest[]>(`${this.baseUrl}/provider-workspace/change-requests`);
  }

  requestChange(type: ChangeType, values: Record<string, unknown>): Observable<ChangeRequest> {
    return this.http.post<ChangeRequest>(`${this.baseUrl}/provider-workspace/change-requests`, { type, values });
  }

  /** What a change request's document may be. FORM_UPLOAD_RULES means the old 4 MB form upload (§37). */
  changeDocumentRules(changeRequestId?: number): Observable<UploadRules> {
    return fetchUploadRules(this.http, `${this.baseUrl}/provider-workspace/files/upload-rules`, FORM_UPLOAD_RULES,
      changeRequestId != null ? { changeRequestId } : undefined);
  }

  startChangeDocumentUpload(changeRequestId: number, file: File): FileUpload<ChangeRequest> {
    return new FileUpload<ChangeRequest>(file, {
      base: `${this.baseUrl}/provider-workspace/files`,
      context: { changeRequestId },
      save: stored => this.http.post<ChangeRequest>(`${this.baseUrl}/provider-workspace/change-requests/${changeRequestId}/document`, stored)
    }, this.http, this.transport, this.retryBaseMs);
  }

  attachChangeDocument(id: number, file: File): Observable<ChangeRequest> {
    const data = new FormData();
    data.append('file', file, file.name);
    return this.http.post<ChangeRequest>(`${this.baseUrl}/provider-workspace/change-requests/${id}/document`, data);
  }

  /** Public; 404 for anyone who isn't live through this flow, which the profile page simply leaves out. */
  publicCredentials(providerId: number): Observable<PublicCredentials | null> {
    return this.http.get<PublicCredentials>(`${this.baseUrl}/public/providers/${providerId}/credentials`).pipe(
      timeout(BACKGROUND_TIMEOUT_MS),
      catchError(() => of(null))
    );
  }

  // ---------- staff review ----------

  queue(statuses: string[]): Observable<QueueItem[]> {
    return this.http.get<QueueItem[]>(`${this.baseUrl}/admin/provider-applications`, { params: statuses.length ? { status: statuses } : {} });
  }

  reviewDetail(id: number): Observable<ReviewDetail> {
    return this.http.get<ReviewDetail>(`${this.baseUrl}/admin/provider-applications/${id}`);
  }

  operationsDecision(id: number, body: object): Observable<ReviewDetail> {
    return this.http.post<ReviewDetail>(`${this.baseUrl}/admin/provider-applications/${id}/operations-decision`, body);
  }

  medicalDecision(id: number, body: object): Observable<ReviewDetail> {
    return this.http.post<ReviewDetail>(`${this.baseUrl}/admin/provider-applications/${id}/medical-decision`, body);
  }

  verifyBank(id: number, passed: boolean, reason: string | null): Observable<ReviewDetail> {
    return this.http.post<ReviewDetail>(`${this.baseUrl}/admin/provider-applications/${id}/bank-verification`, { passed, reason });
  }

  completeRecheck(id: number): Observable<ReviewDetail> {
    return this.http.post<ReviewDetail>(`${this.baseUrl}/admin/provider-applications/${id}/recheck-complete`, {});
  }

  goLive(id: number): Observable<ReviewDetail> {
    return this.http.post<ReviewDetail>(`${this.baseUrl}/admin/provider-applications/${id}/go-live`, {});
  }

  changeStatus(id: number, status: string, reason: string): Observable<ReviewDetail> {
    return this.http.post<ReviewDetail>(`${this.baseUrl}/admin/provider-applications/${id}/status`, { status, reason });
  }

  pendingChanges(): Observable<ChangeRequestForReview[]> {
    return this.http.get<ChangeRequestForReview[]>(`${this.baseUrl}/admin/provider-applications/change-requests`);
  }

  decideChange(id: number, approve: boolean, reason: string | null): Observable<ChangeRequestForReview> {
    return this.http.post<ChangeRequestForReview>(`${this.baseUrl}/admin/provider-applications/change-requests/${id}/decision`, { approve, reason });
  }

  /**
   * A staff download, audited by the API. Files on S3 come back as a short-lived signed link (§37). Older files
   * kept in Postgres, or an API without the link call, still come through the API as before.
   */
  downloadDocument(documentId: number, fallbackName: string): Observable<{ url: string } | { blob: Blob; filename: string }> {
    return this.http.post<{ downloadUrl: string }>(`${this.baseUrl}/admin/provider-applications/documents/${documentId}/download-url`,
      { disposition: 'attachment' }).pipe(
      map(res => ({ url: res.downloadUrl })),
      catchError(err => useOldDownload(err) ? this.documentBlob(documentId, fallbackName) : throwError(() => err))
    );
  }

  private documentBlob(documentId: number, fallbackName: string): Observable<{ blob: Blob; filename: string }> {
    return this.http.get(`${this.baseUrl}/admin/provider-applications/documents/${documentId}/file`, { responseType: 'blob', observe: 'response' }).pipe(
      map(res => {
        const cd = res.headers.get('Content-Disposition') ?? '';
        const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
        return { blob: res.body as Blob, filename: match ? decodeName(match[1]) : fallbackName };
      })
    );
  }
}

/** A stray % in a filename makes decoding throw, and that must not stop the download. */
function decodeName(name: string): string {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

/** The API's VALIDATION_FAILED field messages, or null. */
export function fieldErrors(err: { error?: { fields?: Record<string, string> } }): Record<string, string> | null {
  return err?.error?.fields ?? null;
}
