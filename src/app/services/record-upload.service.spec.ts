import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';
import { FALLBACK_UPLOAD_RULES } from '../models/storage.models';
import { RecordUploadService, StorageError, StorageTransport } from './record-upload.service';

const API = environment.apiUrl;
const settle = async () => { for (let i = 0; i < 8; i++) await new Promise(r => setTimeout(r, 0)); };

interface Put { url: string; size: number; headers: Record<string, string>; }

/** Stands in for storage. `respond` decides each PUT's outcome. */
class FakeTransport extends StorageTransport {
  puts: Put[] = [];
  respond: (url: string, attempt: number, signal: AbortSignal) => Promise<{ etag: string | null }> =
    url => Promise.resolve({ etag: `"etag-${url}"` });
  private attempts = new Map<string, number>();

  override put(url: string, body: Blob, headers: Record<string, string>, onProgress: (n: number) => void, signal: AbortSignal) {
    this.puts.push({ url, size: body.size, headers });
    onProgress(Math.floor(body.size / 2));
    const attempt = (this.attempts.get(url) ?? 0) + 1;
    this.attempts.set(url, attempt);
    return this.respond(url, attempt, signal);
  }
}

function fileOf(size: number, name = 'birth.mp4', type = 'video/mp4'): File {
  return new File([new Uint8Array(size)], name, { type });
}

const RECORD = { id: 9, userId: 7, category: 'SCAN', originalFileName: 'birth.mp4', mimeType: 'video/mp4', sizeBytes: 25,
  status: 'UPLOADED', scanStatus: 'PENDING', available: false, createdAt: '', updatedAt: '' };

describe('RecordUploadService', () => {
  let service: RecordUploadService;
  let http: HttpTestingController;
  let storage: FakeTransport;

  beforeEach(() => {
    storage = new FakeTransport();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: StorageTransport, useValue: storage }]
    });
    service = TestBed.inject(RecordUploadService);
    service.retryBaseMs = 0;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uploads a document with one signed PUT, then creates the record', async () => {
    const up = service.start(fileOf(1000, 'scan.pdf', 'application/pdf'), 'SCAN');
    const init = http.expectOne(`${API}/records/upload-url`);
    expect(init.request.body).toEqual({ category: 'SCAN', fileName: 'scan.pdf', mimeType: 'application/pdf', sizeBytes: 1000 });
    init.flush({ mode: 'SINGLE', objectPath: 'records/u/abc', uploadUrl: 'https://storage.test/abc?X-Amz-Signature=s', expiresAt: '' });
    await settle();

    expect(storage.puts).toEqual([{ url: 'https://storage.test/abc?X-Amz-Signature=s', size: 1000, headers: { 'Content-Type': 'application/pdf' } }]);
    const create = http.expectOne(`${API}/records`);
    expect(create.request.body.objectPath).toBe('records/u/abc');
    create.flush({ ...RECORD, originalFileName: 'scan.pdf' });

    const rec = await up.start();
    expect(rec?.id).toBe(9);
    expect(up.state().phase).toBe('done');
    expect(up.percent()).toBe(100);
  });

  it('still works with today\'s Supabase links, which carry a separate token', async () => {
    service.start(fileOf(10, 'scan.pdf', 'application/pdf'), 'SCAN');
    http.expectOne(`${API}/records/upload-url`).flush({ objectPath: 'p', uploadUrl: 'https://sb.test/upload/sign/p', token: 't k', expiresAt: '' });
    await settle();
    expect(storage.puts[0].url).toBe('https://sb.test/upload/sign/p?token=t%20k');
    http.expectOne(`${API}/records`).flush(RECORD);
    await settle();
  });

  it('uploads a large video in parts, gets a new link for a part whose link expired, and completes it', async () => {
    storage.respond = (url, attempt) => url.includes('part=2') && url.includes('v1') && attempt === 1
      ? Promise.reject(new StorageError(403))
      : Promise.resolve({ etag: `"e-${url.match(/part=(\d)/)![1]}"` });

    const up = service.start(fileOf(25), 'SCAN');
    http.expectOne(`${API}/records/upload-url`).flush({ mode: 'MULTIPART', objectPath: 'videos/u/x', uploadId: 'up-1', partSizeBytes: 10, partCount: 3, expiresAt: '' });
    await settle();

    const links = http.expectOne(`${API}/records/uploads/up-1/part-urls`);
    expect(links.request.body).toEqual({ objectPath: 'videos/u/x', partNumbers: [1, 2, 3] });
    links.flush({ parts: [1, 2, 3].map(n => ({ partNumber: n, url: `https://storage.test/x?part=${n}&v1` })) });
    await settle();

    const fresh = http.expectOne(`${API}/records/uploads/up-1/part-urls`);
    expect(fresh.request.body.partNumbers).toEqual([2]);
    fresh.flush({ parts: [{ partNumber: 2, url: 'https://storage.test/x?part=2&v2' }] });
    await settle();

    expect(storage.puts.map(p => p.size).sort()).toEqual([10, 10, 10, 5].sort());
    const complete = http.expectOne(`${API}/records/uploads/up-1/complete`);
    expect(complete.request.body).toEqual({ objectPath: 'videos/u/x', parts: [
      { partNumber: 1, etag: '"e-1"' }, { partNumber: 2, etag: '"e-2"' }, { partNumber: 3, etag: '"e-3"' }
    ] });
    complete.flush(null);
    await settle();
    http.expectOne(`${API}/records`).flush(RECORD);
    expect(await up.start()).toEqual(jasmine.objectContaining({ id: 9 }));
  });

  it('after a dropped connection, Retry sends only the parts that are missing', async () => {
    let online = false;
    storage.respond = url => url.includes('part=3') && !online
      ? Promise.reject(new StorageError(0))
      : Promise.resolve({ etag: '"e"' });

    const up = service.start(fileOf(25), 'SCAN');
    http.expectOne(`${API}/records/upload-url`).flush({ mode: 'MULTIPART', objectPath: 'o', uploadId: 'up-2', partSizeBytes: 10, partCount: 3, expiresAt: '' });
    await settle();
    http.expectOne(`${API}/records/uploads/up-2/part-urls`).flush({ parts: [1, 2, 3].map(n => ({ partNumber: n, url: `https://s.test/?part=${n}` })) });
    await settle();

    expect(up.state().phase).toBe('failed');
    expect(up.state().error).toContain('connection dropped');
    expect(storage.puts.filter(p => p.url.includes('part=3')).length).toBe(3);
    expect(up.percent()).toBe(80);

    online = true;
    storage.puts = [];
    const done = up.retry();
    await settle();
    expect(storage.puts.map(p => p.url)).toEqual(['https://s.test/?part=3']);
    http.expectOne(`${API}/records/uploads/up-2/complete`).flush(null);
    await settle();
    http.expectOne(`${API}/records`).flush(RECORD);
    expect((await done)?.id).toBe(9);
  });

  it('Cancel stops the transfer and tells the API to drop the unfinished upload', async () => {
    storage.respond = (_url, _n, signal) => new Promise((_, reject) =>
      signal.addEventListener('abort', () => reject(new StorageError(0, true))));

    const up = service.start(fileOf(25), 'SCAN');
    http.expectOne(`${API}/records/upload-url`).flush({ mode: 'MULTIPART', objectPath: 'videos/u/x', uploadId: 'up-3', partSizeBytes: 10, partCount: 3, expiresAt: '' });
    await settle();
    http.expectOne(`${API}/records/uploads/up-3/part-urls`).flush({ parts: [1, 2, 3].map(n => ({ partNumber: n, url: `https://s.test/?part=${n}` })) });
    await settle();

    up.cancel();
    const abort = http.expectOne(r => r.method === 'DELETE' && r.url === `${API}/records/uploads/up-3`);
    expect(abort.request.params.get('objectPath')).toBe('videos/u/x');
    abort.flush(null);
    expect(await up.start()).toBeNull();
    expect(up.state().phase).toBe('cancelled');
    await settle();
    http.expectNone(`${API}/records`);
  });

  it('explains that large uploads need a storage setting when the part ETag can\'t be read (CORS ExposeHeaders)', async () => {
    storage.respond = () => Promise.resolve({ etag: null });
    const up = service.start(fileOf(25), 'SCAN');
    http.expectOne(`${API}/records/upload-url`).flush({ mode: 'MULTIPART', objectPath: 'o', uploadId: 'up-4', partSizeBytes: 10, partCount: 3, expiresAt: '' });
    await settle();
    http.expectOne(`${API}/records/uploads/up-4/part-urls`).flush({ parts: [1, 2, 3].map(n => ({ partNumber: n, url: `https://s.test/?part=${n}` })) });
    await settle();
    expect(up.state().phase).toBe('failed');
    expect(up.state().error).toContain('Large uploads aren’t switched on yet');
  });

  it('uploads again on Retry when saving finds the stored file the wrong size (the API removed it)', async () => {
    const up = service.start(fileOf(10, 'scan.pdf', 'application/pdf'), 'SCAN');
    http.expectOne(`${API}/records/upload-url`).flush({ mode: 'SINGLE', objectPath: 'p1', uploadUrl: 'https://s.test/p1', expiresAt: '' });
    await settle();
    http.expectOne(`${API}/records`).flush(
      { code: 'VALIDATION_FAILED', fields: { sizeBytes: 'mismatch' } }, { status: 400, statusText: 'Bad Request' });
    await settle();
    expect(up.state().phase).toBe('failed');
    expect(up.state().error).toContain('didn’t arrive complete');

    const done = up.retry();
    http.expectOne(`${API}/records/upload-url`).flush({ mode: 'SINGLE', objectPath: 'p2', uploadUrl: 'https://s.test/p2', expiresAt: '' });
    await settle();
    expect(storage.puts.map(p => p.url)).toEqual(['https://s.test/p1', 'https://s.test/p2']);
    const save = http.expectOne(`${API}/records`);
    expect(save.request.body.objectPath).toBe('p2');
    save.flush(RECORD);
    expect((await done)?.id).toBe(9);
  });

  it('only repeats the save on Retry when saving failed for another reason', async () => {
    const up = service.start(fileOf(10, 'scan.pdf', 'application/pdf'), 'SCAN');
    http.expectOne(`${API}/records/upload-url`).flush({ mode: 'SINGLE', objectPath: 'p1', uploadUrl: 'https://s.test/p1', expiresAt: '' });
    await settle();
    http.expectOne(`${API}/records`).flush({}, { status: 503, statusText: 'Unavailable' });
    await settle();
    const done = up.retry();
    await settle();
    http.expectOne(`${API}/records`).flush(RECORD);
    expect((await done)?.id).toBe(9);
    expect(storage.puts.length).toBe(1);
  });

  it('starts afresh when the API says the multipart upload has expired (UPLOAD_NOT_FOUND)', async () => {
    const up = service.start(fileOf(25), 'SCAN');
    http.expectOne(`${API}/records/upload-url`).flush({ mode: 'MULTIPART', objectPath: 'o', uploadId: 'old', partSizeBytes: 10, partCount: 3, expiresAt: '' });
    await settle();
    http.expectOne(`${API}/records/uploads/old/part-urls`).flush({ code: 'UPLOAD_NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    await settle();
    expect(up.state().error).toContain('expired before it finished');
    up.retry();
    http.expectOne(`${API}/records/upload-url`).flush({ mode: 'MULTIPART', objectPath: 'o2', uploadId: 'new', partSizeBytes: 10, partCount: 3, expiresAt: '' });
    await settle();
    http.expectOne(`${API}/records/uploads/new/part-urls`).flush({ parts: [1, 2, 3].map(n => ({ partNumber: n, url: `https://s.test/?part=${n}` })) });
    await settle();
    http.expectOne(`${API}/records/uploads/new/complete`).flush(null);
    await settle();
    http.expectOne(`${API}/records`).flush(RECORD);
    await settle();
    expect(up.state().phase).toBe('done');
  });

  it('passes on the API\'s reason and code when it refuses the upload', async () => {
    const up = service.start(fileOf(10, 'scan.pdf', 'application/pdf'), 'SCAN');
    http.expectOne(`${API}/records/upload-url`).flush(
      { code: 'CONSENT_REQUIRED', pending: ['RECORDS_STORAGE'] }, { status: 403, statusText: 'Forbidden' });
    await settle();
    expect(up.state().phase).toBe('failed');
    expect(up.state().code).toBe('CONSENT_REQUIRED');
  });

  it('falls back to today\'s limits when the API has no upload rules yet', async () => {
    let rules: unknown;
    service.rules().subscribe(r => rules = r);
    http.expectOne(`${API}/records/upload-rules`).flush({}, { status: 404, statusText: 'Not Found' });
    expect(rules).toBe(FALLBACK_UPLOAD_RULES);
  });

  it('uses the API\'s rules, tidying extensions', async () => {
    let rules: any;
    service.rules().subscribe(r => rules = r);
    http.expectOne(`${API}/records/upload-rules`).flush({
      kinds: [{ kind: 'VIDEO', mimeTypes: ['video/mp4'], extensions: ['.MP4'], maxBytes: 100 }], quotaBytes: 1000, usedBytes: 10
    });
    expect(rules.kinds[0].extensions).toEqual(['mp4']);
    expect(rules.quotaBytes).toBe(1000);
  });
});
