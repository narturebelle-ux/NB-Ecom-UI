import { computed, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, firstValueFrom, map, of } from 'rxjs';
import { HealthRecord, RecordPartUrl, RecordUploadUrl } from '../models/records.models';
import { UploadRules, fileMimeType } from '../models/storage.models';

/**
 * Browser-to-storage uploads, shared by every flow that takes a file: the records vault, provider application
 * documents, provider change requests and careers résumés (API_Integration.md §36, §37).
 *
 * Each flow has its own base path B on the API with the same calls: `POST B/upload-url`,
 * `POST B/uploads/{id}/part-urls`, `POST B/uploads/{id}/complete` and `DELETE B/uploads/{id}`, then a
 * flow-specific save that turns the stored file into a record, document or application.
 */

/** What the save call is told about the stored file. `uploadToken` is sent back only if the API gave one. */
export interface StoredFile {
  objectPath: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadToken?: string;
}

export interface UploadTarget<T> {
  /** Full URL of the flow's base path, e.g. `${apiUrl}/records`. */
  base: string;
  /** Extra fields for `B/upload-url`, e.g. `{category}` or `{questionKey}`. */
  context: Record<string, unknown>;
  /** Saves the stored file once storage has every byte. */
  save(file: StoredFile): Observable<T>;
}

/** A failed PUT to storage. `status` 0 means the connection dropped (or CORS refused it). */
export class StorageError extends Error {
  constructor(readonly status: number, readonly aborted = false) {
    super(aborted ? 'aborted' : `storage responded ${status}`);
  }
}

/**
 * Sends bytes to a signed storage link. Plain XHR on purpose: it reports upload progress, can be aborted,
 * can read each part's ETag, and never goes through the auth interceptor, so the Firebase token can't
 * reach storage. Swapped for a fake in tests.
 */
@Injectable({ providedIn: 'root' })
export class StorageTransport {
  put(url: string, body: Blob, headers: Record<string, string>, onProgress: (loaded: number) => void,
      signal: AbortSignal): Promise<{ etag: string | null }> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) { reject(new StorageError(0, true)); return; }
      const xhr = new XMLHttpRequest();
      const onAbort = () => xhr.abort();
      signal.addEventListener('abort', onAbort, { once: true });
      xhr.open('PUT', url);
      Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
      xhr.upload.onprogress = e => onProgress(e.loaded);
      xhr.onload = () => {
        signal.removeEventListener('abort', onAbort);
        if (xhr.status >= 200 && xhr.status < 300) resolve({ etag: xhr.getResponseHeader('ETag') });
        else reject(new StorageError(xhr.status));
      };
      xhr.onerror = () => { signal.removeEventListener('abort', onAbort); reject(new StorageError(0)); };
      xhr.onabort = () => reject(new StorageError(0, true));
      xhr.send(body);
    });
  }
}

export type UploadPhase = 'uploading' | 'finishing' | 'done' | 'failed' | 'cancelled';

export interface UploadState<T = HealthRecord> {
  phase: UploadPhase;
  loaded: number;
  total: number;
  /** Message for the person uploading when phase is 'failed'. */
  error: string | null;
  /** The API's error code, e.g. CONSENT_REQUIRED, so the page can react. */
  code: string | null;
  record: T | null;
}

/** Parts uploaded at once, links asked for at once, and tries per part before the upload stops. */
const PART_CONCURRENCY = 3;
const PART_URL_BATCH = 10;
const PART_ATTEMPTS = 3;
/** Ask for a fresh part link if the one we have expires within this long. */
const LINK_MARGIN_MS = 60_000;

class MissingEtagError extends Error {}

/** Save refusals after which the stored file is gone or unusable, so Retry must upload it again. */
const SAVE_CODES_NEEDING_NEW_UPLOAD = ['VALIDATION_FAILED', 'RECORD_UPLOAD_NOT_CONFIRMED', 'FILE_SIZE_MISMATCH', 'UPLOAD_NOT_CONFIRMED'];

/**
 * A 404 from a `download-url` call that means "fetch it the old way": the route doesn't exist yet (no code),
 * S3 isn't configured, or the file is an older one kept in Postgres (§37).
 */
export function useOldDownload(err: any): boolean {
  if (err?.status !== 404) return false;
  const code = err?.error?.code;
  return !code || ['DIRECT_UPLOAD_UNAVAILABLE', 'DOCUMENT_NOT_ON_S3', 'RESUME_NOT_ON_S3'].includes(code);
}

/**
 * One file going to storage. Single files go in one signed PUT. Large videos go in parts (S3 multipart),
 * a few at a time, each retried on its own; a part whose link expired gets a new link. Cancel aborts the
 * transfer and tells the API to drop the unfinished upload. Retry after a failure carries on from the parts
 * already sent.
 */
export class FileUpload<T = HealthRecord> {
  private readonly _state = signal<UploadState<T>>({ phase: 'uploading', loaded: 0, total: 0, error: null, code: null, record: null });
  readonly state = this._state.asReadonly();
  readonly percent = computed(() => {
    const s = this._state();
    return s.total ? Math.min(100, Math.floor((s.loaded / s.total) * 100)) : 0;
  });
  readonly mimeType: string;

  private target: RecordUploadUrl | null = null;
  /** True once storage has every byte, so a retry only needs to create the record. */
  private stored = false;
  private readonly doneParts = new Map<number, string>();
  private readonly inFlight = new Map<number, number>();
  private readonly partUrls = new Map<number, RecordPartUrl>();
  private fetchingUrls: Promise<void> | null = null;
  private controller: AbortController | null = null;
  private cancelled = false;
  private running: Promise<T | null> | null = null;

  constructor(
    readonly file: File,
    private readonly target$: UploadTarget<T>,
    private readonly http: HttpClient,
    private readonly transport: StorageTransport,
    private readonly retryBaseMs: number
  ) {
    this.mimeType = fileMimeType(file);
    this._state.update(s => ({ ...s, total: file.size }));
  }

  /** Starts (or, after a failure, resumes) the upload. Resolves with the record, or null if it failed or was cancelled. */
  start(): Promise<T | null> {
    if (this.running) return this.running;
    const phase = this._state().phase;
    if (phase === 'done') return Promise.resolve(this._state().record);
    if (phase === 'cancelled') return Promise.resolve(null);
    this.running = this.run().finally(() => { this.running = null; });
    return this.running;
  }

  retry(): Promise<T | null> {
    return this._state().phase === 'failed' ? this.start() : Promise.resolve(null);
  }

  cancel(): void {
    const phase = this._state().phase;
    if (phase === 'done' || phase === 'cancelled') return;
    this.cancelled = true;
    this.controller?.abort();
    this._state.update(s => ({ ...s, phase: 'cancelled', error: null }));
    const t = this.target;
    if (t?.mode === 'MULTIPART' && t.uploadId && !this.stored) {
      // Best effort: the API (and S3's lifecycle rule) also clean up abandoned uploads.
      this.http.delete(`${this.target$.base}/uploads/${encodeURIComponent(t.uploadId)}`, { params: { objectPath: t.objectPath } })
        .subscribe({ error: () => {} });
    }
  }

  private async run(): Promise<T | null> {
    const controller = new AbortController();
    this.controller = controller;
    this._state.update(s => ({ ...s, phase: 'uploading', error: null, code: null }));
    try {
      if (!this.stored) {
        if (!this.target) {
          this.target = await firstValueFrom(this.http.post<RecordUploadUrl>(`${this.target$.base}/upload-url`, {
            ...this.target$.context, fileName: this.file.name, mimeType: this.mimeType, sizeBytes: this.file.size
          }));
        }
        this.stopIfCancelled();
        if (this.target.mode === 'MULTIPART') await this.uploadParts(controller.signal);
        else await this.uploadSingle(controller.signal);
        this.stored = true;
      }
      this.stopIfCancelled();
      this._state.update(s => ({ ...s, phase: 'finishing', loaded: s.total }));
      const stored: StoredFile = {
        objectPath: this.target!.objectPath, originalFileName: this.file.name, mimeType: this.mimeType, sizeBytes: this.file.size
      };
      if (this.target!.uploadToken) stored.uploadToken = this.target!.uploadToken;
      const record = await firstValueFrom(this.target$.save(stored));
      this.stopIfCancelled();
      this._state.update(s => ({ ...s, phase: 'done', record }));
      return record;
    } catch (err) {
      if (this.cancelled) return null;
      // Read before forgetting: a failed save may reset `stored` so that Retry uploads again.
      const saving = this.stored;
      this.forgetWhatCannotBeResumed(err);
      this._state.update(s => ({ ...s, phase: 'failed', error: failureMessage(err, saving), code: errorCode(err) }));
      return null;
    }
  }

  private stopIfCancelled() {
    if (this.cancelled) throw new StorageError(0, true);
  }

  /** After a failure, keep what a retry can reuse and drop what it can't. */
  private forgetWhatCannotBeResumed(err: unknown) {
    if (this.stored) {
      // Saving the record failed. If the API says the stored file is missing or the wrong size, it has removed
      // it (Care API §10a.6), so a retry must upload again. Other failures only need the save repeated.
      const code = err instanceof HttpErrorResponse ? err.error?.code : null;
      // The provider and careers saves say the same with FILE_SIZE_MISMATCH and UPLOAD_NOT_CONFIRMED (§37).
      if (!SAVE_CODES_NEEDING_NEW_UPLOAD.includes(code)) return;
      this.stored = false;
    }
    const t = this.target;
    const uploadGone = err instanceof HttpErrorResponse && (err.status === 404 || err.error?.code === 'UPLOAD_NOT_FOUND');
    const partsFinished = t?.mode === 'MULTIPART' && t.partCount != null && this.doneParts.size >= t.partCount;
    if (!t || t.mode !== 'MULTIPART' || uploadGone || partsFinished) {
      // A single link may have expired, and a dropped multipart upload can't be continued: start afresh.
      this.target = null;
      this.doneParts.clear();
      this.partUrls.clear();
      this._state.update(s => ({ ...s, loaded: 0 }));
    }
    this.inFlight.clear();
  }

  private async uploadSingle(signal: AbortSignal) {
    const t = this.target!;
    let url = t.uploadUrl!;
    // Supabase's signed upload links carry their token separately; S3's presigned links don't need this.
    if (t.token && !url.includes('token=')) url += `${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(t.token)}`;
    this._state.update(s => ({ ...s, loaded: 0 }));
    await this.transport.put(url, this.file, { 'Content-Type': this.mimeType, ...(t.headers ?? {}) },
      loaded => this._state.update(s => ({ ...s, loaded })), signal);
  }

  private async uploadParts(outer: AbortSignal) {
    const t = this.target!;
    const partSize = t.partSizeBytes!;
    const count = t.partCount ?? Math.ceil(this.file.size / partSize);
    const pending: number[] = [];
    for (let n = 1; n <= count; n++) if (!this.doneParts.has(n)) pending.push(n);

    // One failed part stops the others, so the person sees one clear failure and can press Retry.
    const round = new AbortController();
    const stop = () => round.abort();
    outer.addEventListener('abort', stop, { once: true });
    let next = 0;
    const worker = async () => {
      while (next < pending.length && !round.signal.aborted) {
        const n = pending[next++];
        try {
          await this.uploadPart(n, partSize, count, round.signal);
        } catch (e) {
          round.abort();
          throw e;
        }
      }
    };
    try {
      const results = await Promise.allSettled(Array.from({ length: Math.min(PART_CONCURRENCY, pending.length) }, worker));
      const failed = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined;
      // Report the part that actually failed, not the aborts it caused in the other workers.
      const real = results.find(r => r.status === 'rejected' && !(r.reason instanceof StorageError && r.reason.aborted)) as PromiseRejectedResult | undefined;
      if (failed) throw (real ?? failed).reason;
    } finally {
      outer.removeEventListener('abort', stop);
    }
    this.stopIfCancelled();

    const parts = [...this.doneParts.entries()].sort((a, b) => a[0] - b[0]).map(([partNumber, etag]) => ({ partNumber, etag }));
    await firstValueFrom(this.http.post(`${this.target$.base}/uploads/${encodeURIComponent(t.uploadId!)}/complete`, {
      objectPath: t.objectPath, parts
    }));
  }

  private async uploadPart(n: number, partSize: number, count: number, signal: AbortSignal) {
    const start = (n - 1) * partSize;
    const blob = this.file.slice(start, Math.min(start + partSize, this.file.size));
    for (let attempt = 1; ; attempt++) {
      try {
        const url = await this.partUrl(n, count);
        if (signal.aborted) throw new StorageError(0, true);
        const { etag } = await this.transport.put(url, blob, {}, loaded => this.reportPart(n, loaded), signal);
        if (!etag) throw new MissingEtagError();
        this.doneParts.set(n, etag);
        this.inFlight.delete(n);
        this.reportPart(n, null);
        return;
      } catch (e) {
        this.inFlight.delete(n);
        this.reportPart(n, null);
        const aborted = signal.aborted || (e instanceof StorageError && e.aborted);
        if (aborted || e instanceof MissingEtagError || e instanceof HttpErrorResponse || attempt >= PART_ATTEMPTS) throw e;
        // A 403 from storage usually means the link expired: get a new one for the next try.
        if (e instanceof StorageError && e.status === 403) this.partUrls.delete(n);
        await delay(this.retryBaseMs * attempt * attempt, signal);
      }
    }
  }

  private reportPart(n: number, loaded: number | null) {
    if (loaded !== null) this.inFlight.set(n, loaded);
    const partSize = this.target!.partSizeBytes!;
    let total = 0;
    for (const p of this.doneParts.keys()) total += Math.min(partSize, this.file.size - (p - 1) * partSize);
    for (const v of this.inFlight.values()) total += v;
    this._state.update(s => ({ ...s, loaded: Math.min(total, s.total) }));
  }

  /** A valid signed link for part n, asking the API for links in batches so a 2 GB video isn't hundreds of calls. */
  private async partUrl(n: number, count: number): Promise<string> {
    for (let tries = 0; tries < 3; tries++) {
      const cached = this.partUrls.get(n);
      if (cached && !expiresSoon(cached.expiresAt)) return cached.url;
      if (this.fetchingUrls) { await this.fetchingUrls; continue; }
      const wanted = [n];
      for (let p = n + 1; p <= count && wanted.length < PART_URL_BATCH; p++) {
        const c = this.partUrls.get(p);
        if (!this.doneParts.has(p) && (!c || expiresSoon(c.expiresAt))) wanted.push(p);
      }
      const t = this.target!;
      this.fetchingUrls = firstValueFrom(this.http.post<{ parts: RecordPartUrl[] }>(
        `${this.target$.base}/uploads/${encodeURIComponent(t.uploadId!)}/part-urls`, { objectPath: t.objectPath, partNumbers: wanted }
      )).then(res => { (res?.parts ?? []).forEach(p => this.partUrls.set(p.partNumber, p)); })
        .finally(() => { this.fetchingUrls = null; });
      await this.fetchingUrls;
    }
    throw new Error(`No upload link for part ${n}`);
  }
}

function expiresSoon(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  const t = new Date(expiresAt).getTime();
  return !isNaN(t) && t - Date.now() < LINK_MARGIN_MS;
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new StorageError(0, true)); return; }
    const timer = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve(); }, ms);
    const onAbort = () => { clearTimeout(timer); reject(new StorageError(0, true)); };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function errorCode(err: unknown): string | null {
  return err instanceof HttpErrorResponse ? (err.error?.code ?? null) : null;
}

function failureMessage(err: unknown, saving: boolean): string {
  if (err instanceof MissingEtagError) {
    return 'Large uploads aren’t switched on yet: our storage still needs one setting. Please try a smaller file, or try again later.';
  }
  if (err instanceof StorageError) {
    if (err.status === 0) return 'The connection dropped during the upload. Check your internet, then press Retry.';
    if (err.status === 403) return 'The upload link expired. Press Retry to carry on.';
    return 'Our storage didn’t accept the file. Press Retry to try again.';
  }
  if (err instanceof HttpErrorResponse) {
    const code = err.error?.code;
    // Saving found the stored file's size wrong; the API removed it (Care API §10a.6).
    if (saving && (code === 'FILE_SIZE_MISMATCH' || (code === 'VALIDATION_FAILED' && err.error?.fields?.sizeBytes))) {
      return 'The file didn’t arrive complete. Press Retry to upload it again.';
    }
    if (code === 'VALIDATION_FAILED' || code === 'STORAGE_QUOTA_EXCEEDED') {
      return err.error?.message || 'That file type or size isn’t supported.';
    }
    if (code === 'RECORD_UPLOAD_NOT_CONFIRMED' || code === 'UPLOAD_NOT_CONFIRMED') return 'We couldn’t confirm the file arrived. Press Retry to send it again.';
    if (code === 'UPLOAD_NOT_FOUND') return 'This upload expired before it finished. Press Retry to start it again.';
    if (err.status === 0 || err.status >= 500) {
      return 'Uploads aren’t available right now. Our secure storage may still be being set up. Please try again later.';
    }
    return err.error?.message || 'Upload failed. Please try again.';
  }
  return 'Upload failed. Please try again.';
}

/**
 * A flow's upload rules from `B/upload-rules`, tidied (extensions lower-case, no dot). If the API doesn't
 * publish them, or the call fails, `fallback` is used: for provider and careers flows that means today's
 * 4 MB form upload (API_Integration.md §37).
 */
export function fetchUploadRules(http: HttpClient, url: string, fallback: UploadRules,
                                 params?: Record<string, string | number>): Observable<UploadRules> {
  return http.get<Partial<UploadRules>>(url, params ? { params } : {}).pipe(
    map(r => (r?.kinds?.length ? {
      kinds: r.kinds.map(k => ({ ...k, extensions: (k.extensions ?? []).map(e => e.replace(/^\./, '').toLowerCase()) })),
      quotaBytes: r.quotaBytes ?? null,
      usedBytes: r.usedBytes ?? null
    } : fallback)),
    catchError(() => of(fallback))
  );
}
