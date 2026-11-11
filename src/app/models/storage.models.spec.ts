import { HealthRecord } from './records.models';
import {
  FALLBACK_UPLOAD_RULES,
  UploadRules,
  acceptAttribute,
  daysUntilRemoval,
  fileMimeType,
  fileReadiness,
  latestShareEnd,
  openRefusalMessage,
  restorableUntil,
  rulesHint,
  uploadProblem,
  videoNeedsWarning,
  videoRemovalDate
} from './storage.models';

function fakeFile(name: string, type: string, size: number): File {
  const file = new File([''], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

const MB = 1024 * 1024;
const GB = 1024 * MB;
const RULES: UploadRules = {
  kinds: [
    { kind: 'DOCUMENT', mimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/heic'], extensions: ['pdf', 'jpg', 'jpeg', 'png', 'heic'], maxBytes: 25 * MB },
    { kind: 'VIDEO', mimeTypes: ['video/mp4', 'video/quicktime'], extensions: ['mp4', 'mov'], maxBytes: 2 * GB }
  ],
  quotaBytes: 10 * GB,
  usedBytes: 9 * GB
};

function record(extra: Partial<HealthRecord>): HealthRecord {
  return {
    id: 1, userId: 7, category: 'SCAN', originalFileName: 'scan.mp4', mimeType: 'video/mp4', sizeBytes: 100,
    status: 'UPLOADED', scanStatus: 'CLEAN', createdAt: '2026-11-01T10:00:00', updatedAt: '2026-11-01T10:00:00', ...extra
  };
}

describe('upload rules', () => {
  it('keeps today\'s limits when the API has no rules yet: 25 MB documents, no videos', () => {
    expect(uploadProblem(fakeFile('a.pdf', 'application/pdf', 25 * MB), FALLBACK_UPLOAD_RULES)).toBeNull();
    expect(uploadProblem(fakeFile('a.pdf', 'application/pdf', 25 * MB + 1), FALLBACK_UPLOAD_RULES)).toContain('25 MB');
    expect(uploadProblem(fakeFile('birth.mp4', 'video/mp4', 10 * MB), FALLBACK_UPLOAD_RULES)).toContain('PDF, JPEG, PNG or HEIC');
  });

  it('accepts videos up to the API\'s video limit, and refuses bigger ones', () => {
    const rules = { ...RULES, usedBytes: 0 };
    expect(uploadProblem(fakeFile('birth.mp4', 'video/mp4', 2 * GB), rules)).toBeNull();
    expect(uploadProblem(fakeFile('birth.mov', 'video/quicktime', 2 * GB + 1), rules)).toBe('That video is larger than 2 GB. Please choose a smaller one.');
    expect(uploadProblem(fakeFile('scan.pdf', 'application/pdf', 26 * MB), rules)).toBe('That file is larger than 25 MB. Please choose a smaller one.');
  });

  it('refuses other types and names both kinds that are allowed', () => {
    expect(uploadProblem(fakeFile('a.gif', 'image/gif', 10), RULES)).toBe('Please choose a PDF, JPEG, PNG or HEIC file, or a MP4 or MOV video.');
    expect(uploadProblem(fakeFile('a.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 10), RULES)).not.toBeNull();
  });

  it('refuses an empty file', () => {
    expect(uploadProblem(fakeFile('a.pdf', 'application/pdf', 0), RULES)).toContain('empty');
  });

  it('refuses a file that would go over her storage quota', () => {
    expect(uploadProblem(fakeFile('birth.mp4', 'video/mp4', 1.5 * GB), RULES)).toContain('over your 10 GB of storage (1 GB left)');
    expect(uploadProblem(fakeFile('birth.mp4', 'video/mp4', 1 * GB), RULES)).toBeNull();
  });

  it('works out the type from the extension when the browser leaves it empty', () => {
    expect(fileMimeType(fakeFile('IMG_0001.HEIC', '', 10))).toBe('image/heic');
    expect(fileMimeType(fakeFile('clip.MOV', '', 10))).toBe('video/quicktime');
    expect(fileMimeType(fakeFile('notes', '', 10))).toBe('application/octet-stream');
    expect(uploadProblem(fakeFile('clip.mov', '', 10), { ...RULES, usedBytes: 0 })).toBeNull();
  });

  it('builds the picker filter and hint from the rules', () => {
    expect(acceptAttribute(RULES)).toContain('.mov');
    expect(acceptAttribute(RULES)).toContain('video/mp4');
    expect(rulesHint(RULES)).toBe('PDF, JPEG, PNG or HEIC up to 25 MB; videos (MP4 or MOV) up to 2 GB');
  });
});

describe('file readiness (malware scan)', () => {
  it('is being checked while the scan is pending or the API says unavailable', () => {
    expect(fileReadiness(record({ scanStatus: 'PENDING' }))).toBe('CHECKING');
    expect(fileReadiness(record({ scanStatus: 'CLEAN', available: false }))).toBe('CHECKING');
  });

  it('is blocked when the scan found malware', () => {
    expect(fileReadiness(record({ scanStatus: 'INFECTED', available: false }))).toBe('BLOCKED');
  });

  it('is blocked when the scan failed (SCAN_FAILED), like INFECTED', () => {
    expect(fileReadiness(record({ scanStatus: 'SCAN_FAILED', available: false }))).toBe('BLOCKED');
  });

  it('shows a trashed video as removed, not as being checked, although the API says unavailable', () => {
    expect(fileReadiness(record({ scanStatus: 'CLEAN', available: false, trashedAt: '2026-12-01T10:00:00' }))).toBe('REMOVED');
  });

  it('words each refusal of a download link', () => {
    expect(openRefusalMessage('FILE_NOT_READY')).toContain('still being checked');
    expect(openRefusalMessage('FILE_BLOCKED')).toContain('didn’t pass');
    expect(openRefusalMessage('FILE_IN_TRASH')).toContain('removed');
    expect(openRefusalMessage('FILE_DELETED')).toContain('deleted');
    expect(openRefusalMessage(undefined)).toContain('can’t be opened right now');
  });

  it('is ready once clean, and today\'s NOT_SCANNED files stay openable', () => {
    expect(fileReadiness(record({ scanStatus: 'CLEAN', available: true }))).toBe('READY');
    expect(fileReadiness(record({ scanStatus: 'NOT_SCANNED' }))).toBe('READY');
  });

  it('opens a new S3 upload at once when pre-production has scanning off (RECORDS_SCAN_REQUIRED=false)', () => {
    expect(fileReadiness(record({ scanStatus: 'NOT_SCANNED', available: true }))).toBe('READY');
  });
});

describe('video retention (D49: kept 30 days, warned from day 23)', () => {
  const uploaded = new Date(2026, 10, 1, 10, 0, 0);
  const removalAt = '2026-12-01T10:00:00';
  const day = (n: number) => new Date(uploaded.getTime() + n * 86_400_000);

  it('uses the removal date the API gives, and none for documents', () => {
    expect(videoRemovalDate(record({ removalAt }))!.getTime()).toBe(new Date(2026, 11, 1, 10, 0, 0).getTime());
    expect(videoRemovalDate(record({ removalAt: null }))).toBeNull();
    expect(videoRemovalDate(record({ kind: 'DOCUMENT', mimeType: 'application/pdf', removalAt }))).toBeNull();
  });

  it('does not warn before day 23', () => {
    expect(videoNeedsWarning(record({ removalAt }), day(22))).toBeFalse();
    expect(videoNeedsWarning(record({ removalAt }), day(22.9))).toBeFalse();
  });

  it('warns from day 23 until removal', () => {
    expect(videoNeedsWarning(record({ removalAt }), day(23))).toBeTrue();
    expect(videoNeedsWarning(record({ removalAt }), day(29.9))).toBeTrue();
    expect(videoNeedsWarning(record({ removalAt }), day(30))).toBeFalse();
  });

  it('counts days left, rounding up', () => {
    expect(daysUntilRemoval(record({ removalAt }), day(23))).toBe(7);
    expect(daysUntilRemoval(record({ removalAt }), day(29.5))).toBe(1);
  });

  it('uses the API\'s warnFrom when it sends one', () => {
    const r = record({ removalAt, warnFrom: '2026-11-20T10:00:00' });
    expect(videoNeedsWarning(r, day(18.9))).toBeFalse();
    expect(videoNeedsWarning(r, day(19))).toBeTrue();
  });

  it('stops warning once the video is in trash, and says how long support can restore it', () => {
    const trashed = record({ removalAt, trashedAt: '2026-12-01T10:00:00' });
    expect(videoNeedsWarning(trashed, day(29))).toBeFalse();
    expect(restorableUntil(trashed)!.getTime()).toBe(new Date(2026, 11, 8, 10, 0, 0).getTime());
    const withDate = record({ removalAt, trashedAt: '2026-12-01T10:00:00', permanentDeletionAt: '2026-12-09T00:00:00' });
    expect(restorableUntil(withDate)!.getTime()).toBe(new Date(2026, 11, 9, 0, 0, 0).getTime());
  });

  it('ends a video share no later than the video\'s removal date', () => {
    const r = record({ removalAt });
    const later = new Date(2027, 0, 1);
    const sooner = new Date(2026, 10, 20);
    expect(latestShareEnd(r, later).getTime()).toBe(new Date(2026, 11, 1, 10, 0, 0).getTime());
    expect(latestShareEnd(r, sooner)).toBe(sooner);
    expect(latestShareEnd(record({ kind: 'DOCUMENT', mimeType: 'application/pdf', removalAt: null }), later)).toBe(later);
  });
});
