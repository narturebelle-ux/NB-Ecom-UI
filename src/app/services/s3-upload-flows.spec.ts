import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';
import { FORM_UPLOAD_RULES } from '../models/storage.models';
import { StorageTransport } from './file-upload';
import { ProviderApplicationService } from './provider-application.service';
import { ApplicationForm, CareersService, RESUME_FORM_RULES } from './careers.service';

const API = environment.apiUrl;
const settle = async () => { for (let i = 0; i < 8; i++) await new Promise(r => setTimeout(r, 0)); };

class FakeTransport extends StorageTransport {
  puts: { url: string; size: number; headers: Record<string, string> }[] = [];
  override put(url: string, body: Blob, headers: Record<string, string>, onProgress: (n: number) => void) {
    this.puts.push({ url, size: body.size, headers });
    onProgress(body.size);
    return Promise.resolve({ etag: `"etag-${url}"` });
  }
}

function fileOf(size: number, name: string, type: string): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('S3 uploads for provider and careers flows (§37)', () => {
  let http: HttpTestingController;
  let storage: FakeTransport;

  beforeEach(() => {
    storage = new FakeTransport();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: StorageTransport, useValue: storage }]
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('provider application documents', () => {
    let service: ProviderApplicationService;
    beforeEach(() => { service = TestBed.inject(ProviderApplicationService); service.retryBaseMs = 0; });

    it('keeps the old 4 MB form upload while the API has no upload rules', () => {
      let rules: unknown;
      service.documentRules('licence').subscribe(r => rules = r);
      const req = http.expectOne(r => r.url === `${API}/provider-application/files/upload-rules`);
      expect(req.request.params.get('questionKey')).toBe('licence');
      req.flush(null, { status: 404, statusText: 'Not Found' });
      expect(rules).toBe(FORM_UPLOAD_RULES);
    });

    it('uses the API\'s rules, videos included, once it has them', () => {
      let rules: any;
      service.documentRules('intro').subscribe(r => rules = r);
      http.expectOne(r => r.url === `${API}/provider-application/files/upload-rules`).flush({
        kinds: [{ kind: 'VIDEO', mimeTypes: ['video/mp4'], extensions: ['.MP4'], maxBytes: 500 }]
      });
      expect(rules).not.toBe(FORM_UPLOAD_RULES);
      expect(rules.kinds[0].extensions).toEqual(['mp4']);
    });

    it('sends the file to storage, then attaches it to the question with the upload token', async () => {
      const up = service.startDocumentUpload('licence', fileOf(100, 'licence.pdf', 'application/pdf'));
      const done = up.start();
      const init = http.expectOne(`${API}/provider-application/files/upload-url`);
      expect(init.request.body).toEqual({ questionKey: 'licence', fileName: 'licence.pdf', mimeType: 'application/pdf', sizeBytes: 100 });
      init.flush({ mode: 'SINGLE', objectPath: 'providers/1/x', uploadUrl: 'https://s3.test/x', expiresAt: '', uploadToken: 'tok' });
      await settle();
      expect(storage.puts.length).toBe(1);

      const save = http.expectOne(`${API}/provider-application/documents/licence`);
      expect(save.request.body).toEqual({
        objectPath: 'providers/1/x', originalFileName: 'licence.pdf', mimeType: 'application/pdf', sizeBytes: 100, uploadToken: 'tok'
      });
      save.flush({ id: 5, questionKey: 'licence', fileName: 'licence.pdf', sizeBytes: 100, uploadedAt: '', scanStatus: 'PENDING', available: false });
      expect((await done)?.id).toBe(5);
    });

    it('uploads a large video in parts under the provider base path', async () => {
      const up = service.startDocumentUpload('intro', fileOf(30, 'intro.mp4', 'video/mp4'));
      const done = up.start();
      http.expectOne(`${API}/provider-application/files/upload-url`)
        .flush({ mode: 'MULTIPART', objectPath: 'p/v', uploadId: 'U', partSizeBytes: 16, partCount: 2, expiresAt: '' });
      await settle();
      http.expectOne(`${API}/provider-application/files/uploads/U/part-urls`)
        .flush({ parts: [{ partNumber: 1, url: 'https://s3.test/1' }, { partNumber: 2, url: 'https://s3.test/2' }] });
      await settle();
      const complete = http.expectOne(`${API}/provider-application/files/uploads/U/complete`);
      expect(complete.request.body.parts.length).toBe(2);
      complete.flush({});
      await settle();
      http.expectOne(`${API}/provider-application/documents/intro`).flush({ id: 6, questionKey: 'intro', fileName: 'intro.mp4', sizeBytes: 30, uploadedAt: '' });
      expect((await done)?.id).toBe(6);
    });

    it('attaches a change request\'s document after sending it to storage', async () => {
      const up = service.startChangeDocumentUpload(12, fileOf(10, 'name.png', 'image/png'));
      const done = up.start();
      const init = http.expectOne(`${API}/provider-workspace/files/upload-url`);
      expect(init.request.body.changeRequestId).toBe(12);
      init.flush({ mode: 'SINGLE', objectPath: 'o', uploadUrl: 'https://s3.test/o', expiresAt: '' });
      await settle();
      const save = http.expectOne(`${API}/provider-workspace/change-requests/12/document`);
      expect(save.request.body.uploadToken).toBeUndefined();
      save.flush({ id: 12, documentAttached: true });
      expect((await done)?.id).toBe(12);
    });

    it('downloads staff documents from a signed link, or through the API if the link call doesn\'t exist yet', () => {
      let result: any;
      service.downloadDocument(3, 'doc.pdf').subscribe(r => result = r);
      http.expectOne(`${API}/admin/provider-applications/documents/3/download-url`).flush({ downloadUrl: 'https://s3.test/d' });
      expect(result).toEqual({ url: 'https://s3.test/d' });

      service.downloadDocument(4, 'doc.pdf').subscribe(r => result = r);
      http.expectOne(`${API}/admin/provider-applications/documents/4/download-url`).flush(null, { status: 404, statusText: 'Not Found' });
      http.expectOne(`${API}/admin/provider-applications/documents/4/file`).flush(new Blob(['x']));
      expect(result.filename).toBe('doc.pdf');
    });

    it('falls back for older Postgres files and when S3 isn\'t set up', () => {
      for (const code of ['DOCUMENT_NOT_ON_S3', 'DIRECT_UPLOAD_UNAVAILABLE']) {
        let result: any;
        service.downloadDocument(7, 'old.pdf').subscribe(r => result = r);
        http.expectOne(`${API}/admin/provider-applications/documents/7/download-url`).flush({ code }, { status: 404, statusText: 'Not Found' });
        http.expectOne(`${API}/admin/provider-applications/documents/7/file`).flush(new Blob(['x']));
        expect(result.filename).toBe('old.pdf');
      }
    });

    it('gives the applicant a link to their own S3 file, and none for an older one', () => {
      const urls: (string | null)[] = [];
      service.ownDocumentUrl(8).subscribe(u => urls.push(u));
      http.expectOne(`${API}/provider-application/documents/8/download-url`).flush({ downloadUrl: 'https://s3.test/own' });
      service.ownDocumentUrl(9).subscribe(u => urls.push(u));
      http.expectOne(`${API}/provider-application/documents/9/download-url`)
        .flush({ code: 'DOCUMENT_NOT_ON_S3' }, { status: 404, statusText: 'Not Found' });
      expect(urls).toEqual(['https://s3.test/own', null]);
    });

    it('uploads again on Retry when saving finds the stored file the wrong size', async () => {
      const up = service.startDocumentUpload('licence', fileOf(10, 'l.pdf', 'application/pdf'));
      up.start();
      http.expectOne(`${API}/provider-application/files/upload-url`).flush({ mode: 'SINGLE', objectPath: 'a', uploadUrl: 'https://s3.test/a', expiresAt: '' });
      await settle();
      http.expectOne(`${API}/provider-application/documents/licence`)
        .flush({ code: 'FILE_SIZE_MISMATCH', message: 'x' }, { status: 400, statusText: 'Bad Request' });
      await settle();
      expect(up.state().error).toContain('didn’t arrive complete');

      const done = up.retry();
      http.expectOne(`${API}/provider-application/files/upload-url`).flush({ mode: 'SINGLE', objectPath: 'b', uploadUrl: 'https://s3.test/b', expiresAt: '' });
      await settle();
      expect(storage.puts.map(p => p.url)).toEqual(['https://s3.test/a', 'https://s3.test/b']);
      http.expectOne(`${API}/provider-application/documents/licence`).flush({ id: 1, questionKey: 'licence', fileName: 'l.pdf', sizeBytes: 10, uploadedAt: '' });
      expect((await done)?.id).toBe(1);
    });

    it('doesn\'t fall back when the document itself is missing', () => {
      let error: any;
      service.downloadDocument(5, 'doc.pdf').subscribe({ error: e => error = e });
      http.expectOne(`${API}/admin/provider-applications/documents/5/download-url`)
        .flush({ code: 'DOCUMENT_NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
      expect(error.status).toBe(404);
    });
  });

  describe('careers', () => {
    let service: CareersService;
    const form: ApplicationForm = {
      fullName: ' Asha ', email: 'a@b.co', phone: '9999999999', location: '', linkedinUrl: '', portfolioUrl: '',
      yearsExperience: 3, coverNote: '', privacyConsent: true, website: ''
    };
    beforeEach(() => { service = TestBed.inject(CareersService); service.retryBaseMs = 0; });

    it('keeps the old form upload while the API has no résumé rules', () => {
      let rules: unknown;
      service.resumeRules(2).subscribe(r => rules = r);
      http.expectOne(`${API}/careers/jobs/2/files/upload-rules`).flush(null, { status: 404, statusText: 'Not Found' });
      expect(rules).toBe(RESUME_FORM_RULES);
    });

    it('sends the résumé to storage, then the application with a pointer to it', async () => {
      const up = service.startApplication(2, form, fileOf(50, 'cv.pdf', 'application/pdf'));
      const done = up.start();
      http.expectOne(`${API}/careers/jobs/2/files/upload-url`)
        .flush({ mode: 'SINGLE', objectPath: 'careers/r', uploadUrl: 'https://s3.test/r', expiresAt: '', uploadToken: 'T' });
      await settle();
      const save = http.expectOne(`${API}/careers/jobs/2/applications`);
      expect(save.request.body).toEqual({
        fullName: 'Asha', email: 'a@b.co', phone: '9999999999', yearsExperience: 3, privacyConsent: true, website: '',
        resume: { objectPath: 'careers/r', originalFileName: 'cv.pdf', mimeType: 'application/pdf', sizeBytes: 50, uploadToken: 'T' }
      });
      save.flush({ id: 1, submittedAt: '' });
      expect((await done)?.id).toBe(1);
    });

    it('still sends the old form upload with the same fields', () => {
      service.apply(2, form, fileOf(5, 'cv.pdf', 'application/pdf')).subscribe();
      const req = http.expectOne(`${API}/careers/jobs/2/applications`);
      const body = req.request.body as FormData;
      expect(body.get('fullName')).toBe('Asha');
      expect(body.get('yearsExperience')).toBe('3');
      expect(body.get('privacyConsent')).toBe('true');
      expect(body.get('location')).toBeNull();
      expect((body.get('resume') as File).name).toBe('cv.pdf');
      req.flush({ id: 1, submittedAt: '' });
    });
  });
});
